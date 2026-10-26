import { describe, it, expect, vi, beforeAll, beforeEach } from 'vitest';
import request from 'supertest';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import { prismaMock } from '../testing/prisma-mock';
import { TEST_JWT_SECRET, useTestJwtSecret } from '../testing/auth';

// Solo se mockea la base de datos: la emisión y rotación de tokens son las reales.
vi.mock('../db', async () => ({
  default: (await import('../testing/prisma-mock')).prismaMock.client,
}));

let app: Awaited<typeof import('../index')>['app'];

const sha256 = (value: string) => crypto.createHash('sha256').update(value).digest('hex');

const userRow = (overrides = {}) => ({
  id: 'player-1',
  active: true,
  clubId: 'club-1',
  userType: { name: 'Player' },
  ...overrides,
});

const storedToken = (overrides = {}) => ({
  id: 'rt-1',
  userId: 'player-1',
  familyId: 'family-1',
  expiresAt: new Date(Date.now() + 60_000),
  revokedAt: null,
  user: userRow(),
  ...overrides,
});

describe('Renovación de sesión (/api/auth)', () => {
  beforeAll(async () => {
    useTestJwtSecret();
    ({ app } = await import('../index'));
  });

  beforeEach(() => {
    prismaMock.reset();
    prismaMock.client.refreshToken.create.mockResolvedValue({});
    prismaMock.client.refreshToken.updateMany.mockResolvedValue({ count: 1 });
  });

  describe('POST /login', () => {
    it('devuelve un refresh token y guarda solo su hash', async () => {
      prismaMock.client.user.findUnique.mockResolvedValue({
        ...userRow(),
        password: bcrypt.hashSync('Secreta123', 4),
        userType: { name: 'Player' },
      });

      const response = await request(app)
        .post('/api/auth/login')
        .send({ email: 'a@a.com', password: 'Secreta123' });

      expect(response.status).toBe(200);
      expect(typeof response.body.data.refreshToken).toBe('string');
      const created = prismaMock.client.refreshToken.create.mock.calls[0][0].data;
      expect(created.tokenHash).toBe(sha256(response.body.data.refreshToken));
      expect(created.userId).toBe('player-1');
      expect(JSON.stringify(created)).not.toContain(response.body.data.refreshToken);
    });

    it('el token de acceso caduca en una hora', async () => {
      prismaMock.client.user.findUnique.mockResolvedValue({
        ...userRow(),
        password: bcrypt.hashSync('Secreta123', 4),
      });

      const response = await request(app)
        .post('/api/auth/login')
        .send({ email: 'a@a.com', password: 'Secreta123' });

      const claims = jwt.verify(response.body.data.token, TEST_JWT_SECRET) as jwt.JwtPayload;
      expect((claims.exp as number) - (claims.iat as number)).toBe(3600);
    });
  });

  describe('POST /refresh', () => {
    it('canjea un refresh token vigente por un par nuevo y revoca el usado (200)', async () => {
      prismaMock.client.refreshToken.findUnique.mockResolvedValue(storedToken());

      const response = await request(app).post('/api/auth/refresh').send({ refreshToken: 'raw-1' });

      expect(response.status).toBe(200);
      expect(prismaMock.client.refreshToken.findUnique.mock.calls[0][0].where).toEqual({
        tokenHash: sha256('raw-1'),
      });
      expect(response.body.data.refreshToken).not.toBe('raw-1');
      const claims = jwt.verify(response.body.data.token, TEST_JWT_SECRET) as jwt.JwtPayload;
      expect(claims).toMatchObject({ id: 'player-1', role: 'Player', clubId: 'club-1' });
      expect(prismaMock.client.refreshToken.updateMany.mock.calls[0][0]).toMatchObject({
        where: { id: 'rt-1', revokedAt: null },
      });
      const created = prismaMock.client.refreshToken.create.mock.calls[0][0].data;
      expect(created).toMatchObject({
        userId: 'player-1',
        familyId: 'family-1',
        tokenHash: sha256(response.body.data.refreshToken),
      });
    });

    it('un token desconocido se rechaza (401)', async () => {
      prismaMock.client.refreshToken.findUnique.mockResolvedValue(null);

      const response = await request(app).post('/api/auth/refresh').send({ refreshToken: 'raw-x' });

      expect(response.status).toBe(401);
      expect(prismaMock.writes()).toEqual([]);
    });

    it('un token caducado se rechaza (401)', async () => {
      prismaMock.client.refreshToken.findUnique.mockResolvedValue(
        storedToken({ expiresAt: new Date(Date.now() - 1000) }),
      );

      const response = await request(app).post('/api/auth/refresh').send({ refreshToken: 'raw-1' });

      expect(response.status).toBe(401);
      expect(prismaMock.client.refreshToken.create).not.toHaveBeenCalled();
    });

    it('reutilizar un token ya rotado revoca toda la familia (401)', async () => {
      prismaMock.client.refreshToken.findUnique.mockResolvedValue(
        storedToken({ revokedAt: new Date() }),
      );

      const response = await request(app).post('/api/auth/refresh').send({ refreshToken: 'raw-1' });

      expect(response.status).toBe(401);
      expect(prismaMock.client.refreshToken.updateMany.mock.calls[0][0]).toMatchObject({
        where: { familyId: 'family-1', revokedAt: null },
      });
      expect(prismaMock.client.refreshToken.create).not.toHaveBeenCalled();
    });

    it('si otra petición lo rotó a la vez, solo una gana (401 para la perdedora)', async () => {
      prismaMock.client.refreshToken.findUnique.mockResolvedValue(storedToken());
      prismaMock.client.refreshToken.updateMany.mockResolvedValueOnce({ count: 0 });
      prismaMock.client.refreshToken.updateMany.mockResolvedValueOnce({ count: 1 });

      const response = await request(app).post('/api/auth/refresh').send({ refreshToken: 'raw-1' });

      expect(response.status).toBe(401);
      expect(prismaMock.client.refreshToken.create).not.toHaveBeenCalled();
    });

    it('un usuario desactivado no puede renovar (401)', async () => {
      prismaMock.client.refreshToken.findUnique.mockResolvedValue(
        storedToken({ user: userRow({ active: false }) }),
      );

      const response = await request(app).post('/api/auth/refresh').send({ refreshToken: 'raw-1' });

      expect(response.status).toBe(401);
      expect(prismaMock.client.refreshToken.create).not.toHaveBeenCalled();
    });

    it('el rol del nuevo token sale de la base de datos, no del anterior (200)', async () => {
      prismaMock.client.refreshToken.findUnique.mockResolvedValue(
        storedToken({ user: userRow({ clubId: null, userType: { name: 'AdminClub' } }) }),
      );

      const response = await request(app).post('/api/auth/refresh').send({ refreshToken: 'raw-1' });

      const claims = jwt.verify(response.body.data.token, TEST_JWT_SECRET) as jwt.JwtPayload;
      expect(claims).toMatchObject({ role: 'AdminClub', clubId: null });
    });

    it('sin refreshToken en el cuerpo responde 400', async () => {
      const response = await request(app).post('/api/auth/refresh').send({});

      expect(response.status).toBe(400);
    });
  });

  describe('POST /logout', () => {
    it('revoca el refresh token indicado (200)', async () => {
      const response = await request(app).post('/api/auth/logout').send({ refreshToken: 'raw-1' });

      expect(response.status).toBe(200);
      expect(prismaMock.client.refreshToken.updateMany.mock.calls[0][0]).toMatchObject({
        where: { tokenHash: sha256('raw-1'), revokedAt: null },
      });
    });
  });

  describe('POST /reset-password', () => {
    it('revoca todos los refresh tokens del usuario', async () => {
      prismaMock.client.user.findFirst.mockResolvedValue({ id: 'player-1' });
      prismaMock.client.user.update.mockResolvedValue({});

      const response = await request(app).post('/api/auth/reset-password').send({
        token: 'reset-token',
        newPassword: 'NuevaClave123!',
        confirmPassword: 'NuevaClave123!',
      });

      expect(response.status).toBe(200);
      expect(prismaMock.client.refreshToken.updateMany.mock.calls[0][0]).toMatchObject({
        where: { userId: 'player-1', revokedAt: null },
      });
    });
  });
});

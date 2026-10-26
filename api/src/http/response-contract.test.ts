import { describe, it, expect, vi, beforeAll, beforeEach } from 'vitest';
import request from 'supertest';
import bcrypt from 'bcryptjs';
import { prismaMock } from '../testing/prisma-mock';
import { bearer, useTestJwtSecret } from '../testing/auth';

// Solo se mockea la base de datos y el correo: el contrato lo cumplen las rutas reales.
vi.mock('../db', async () => ({
  default: (await import('../testing/prisma-mock')).prismaMock.client,
}));
vi.mock('../services/email', () => ({ enviarCorreoGenerico: vi.fn().mockResolvedValue(true) }));

let app: Awaited<typeof import('../index')>['app'];

describe('Contrato de respuesta único: { success, data?, message?, error? }', () => {
  beforeAll(async () => {
    useTestJwtSecret();
    ({ app } = await import('../index'));
  });

  beforeEach(() => {
    prismaMock.reset();
    prismaMock.client.refreshToken.create.mockResolvedValue({});
    prismaMock.client.refreshToken.updateMany.mockResolvedValue({ count: 1 });
  });

  it('el login devuelve la sesión dentro de data y el mensaje aparte', async () => {
    prismaMock.client.user.findUnique.mockResolvedValue({
      id: 'p1',
      active: true,
      clubId: null,
      password: bcrypt.hashSync('Secreta123', 4),
      userType: { name: 'Player' },
    });

    const response = await request(app)
      .post('/api/auth/login')
      .send({ email: 'a@a.com', password: 'Secreta123' });

    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({ success: true, message: 'Login local exitoso' });
    expect(typeof response.body.data.token).toBe('string');
    expect(typeof response.body.data.refreshToken).toBe('string');
    expect(response.body.token).toBeUndefined();
  });

  it('refresh devuelve el par de tokens dentro de data', async () => {
    prismaMock.client.refreshToken.findUnique.mockResolvedValue({
      id: 'rt-1',
      familyId: 'f1',
      expiresAt: new Date(Date.now() + 60_000),
      revokedAt: null,
      user: { id: 'p1', active: true, clubId: null, userType: { name: 'Player' } },
    });

    const response = await request(app).post('/api/auth/refresh').send({ refreshToken: 'raw' });

    expect(response.body.success).toBe(true);
    expect(typeof response.body.data.token).toBe('string');
    expect(typeof response.body.data.refreshToken).toBe('string');
  });

  it.each([
    ['logout', '/api/auth/logout', { refreshToken: 'raw' }],
    ['forgot-password', '/api/auth/forgot-password', { email: 'nadie@test.com' }],
  ])('%s responde { success: true, message }', async (_name, path, body) => {
    prismaMock.client.user.findUnique.mockResolvedValue(null);

    const response = await request(app).post(path).send(body);

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(typeof response.body.message).toBe('string');
  });

  it('un token ausente responde { success: false, error } y no solo { error }', async () => {
    const response = await request(app).get('/api/seasons');

    expect(response.status).toBe(401);
    expect(response.body).toMatchObject({ success: false });
    expect(typeof response.body.error).toBe('string');
  });

  it('un rol insuficiente (403) responde { success: false, error }', async () => {
    const response = await request(app).get('/api/user-types').set(bearer('playerClub1'));

    expect(response.status).toBe(403);
    expect(response.body).toMatchObject({ success: false });
  });

  it('PUT /users/me devuelve el perfil dentro de data', async () => {
    prismaMock.client.user.update.mockResolvedValue({ id: 'player-1', name: 'Ana' });
    prismaMock.client.user.findUnique.mockResolvedValue({ id: 'player-1', name: 'Ana' });

    const response = await request(app)
      .put('/api/users/me')
      .set(bearer('playerClub1'))
      .send({ name: 'Ana' });

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.data).toMatchObject({ id: 'player-1' });
    expect(response.body.user).toBeUndefined();
  });
});

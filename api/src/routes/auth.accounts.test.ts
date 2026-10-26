import { describe, it, expect, vi, beforeAll, beforeEach } from 'vitest';
import request from 'supertest';
import bcrypt from 'bcryptjs';
import { prismaMock } from '../testing/prisma-mock';
import { useTestJwtSecret } from '../testing/auth';

// Solo se mockea la base de datos y el correo: el hash de contraseñas es el real.
vi.mock('../db', async () => ({
  default: (await import('../testing/prisma-mock')).prismaMock.client,
}));
vi.mock('../services/email', () => ({ enviarCorreoGenerico: vi.fn().mockResolvedValue(true) }));

let app: Awaited<typeof import('../index')>['app'];

const account = (overrides = {}) => ({
  id: 'p1',
  active: true,
  clubId: null,
  password: bcrypt.hashSync('Secreta123!', 4),
  userType: { name: 'Player' },
  ...overrides,
});

describe('Cuentas: registro y login sin pistas para enumerar usuarios', () => {
  beforeAll(async () => {
    useTestJwtSecret();
    ({ app } = await import('../index'));
  });

  beforeEach(() => {
    vi.restoreAllMocks();
    prismaMock.reset();
    prismaMock.client.refreshToken.create.mockResolvedValue({});
  });

  describe('POST /register', () => {
    const body = {
      email: 'Ana@Test.com',
      password: 'Secreta123!',
      confirmPassword: 'Secreta123!',
      name: 'Ana',
      surname: 'Gil',
    };

    it('busca la cuenta existente con el email en minúsculas (Ana@Test.com y ana@test.com son la misma)', async () => {
      prismaMock.client.user.findUnique.mockResolvedValue({ id: 'ya-existe' });

      const response = await request(app).post('/api/auth/register').send(body);

      expect(response.status).toBe(400);
      expect(prismaMock.client.user.findUnique.mock.calls[0][0].where).toEqual({ email: 'ana@test.com' });
      expect(prismaMock.writes()).toEqual([]);
    });
  });

  describe('POST /login', () => {
    const login = (password: string) =>
      request(app).post('/api/auth/login').send({ email: 'ana@test.com', password });

    it('una cuenta sin verificar con la contraseña equivocada responde igual que una inexistente', async () => {
      prismaMock.client.user.findUnique.mockResolvedValue(account({ active: false }));
      const unverified = await login('incorrecta1!');
      prismaMock.client.user.findUnique.mockResolvedValue(null);
      const unknown = await login('incorrecta1!');

      expect(unverified.status).toBe(401);
      expect(unverified.body.error).toBe(unknown.body.error);
    });

    it('con la contraseña correcta, una cuenta sin verificar sí recibe el aviso de verificación', async () => {
      prismaMock.client.user.findUnique.mockResolvedValue(account({ active: false }));

      const response = await login('Secreta123!');

      expect(response.status).toBe(401);
      expect(response.body.error).toContain('verificado');
    });

    it('un email inexistente también paga el coste de comparar el hash (sin diferencia de tiempo)', async () => {
      const compare = vi.spyOn(bcrypt, 'compare');
      prismaMock.client.user.findUnique.mockResolvedValue(null);

      await login('incorrecta1!');

      expect(compare).toHaveBeenCalledTimes(1);
    });

    it('una cuenta de Google sin contraseña tampoco se distingue de una inexistente', async () => {
      prismaMock.client.user.findUnique.mockResolvedValue(account({ password: null }));
      const google = await login('incorrecta1!');
      prismaMock.client.user.findUnique.mockResolvedValue(null);
      const unknown = await login('incorrecta1!');

      expect(google.body.error).toBe(unknown.body.error);
    });
  });
});

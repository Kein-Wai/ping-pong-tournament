import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import { app } from '../../src/index';
import prisma from '../../src/db';
import bcrypt from 'bcryptjs';

// 1. Mockeamos la base de datos
vi.mock('../../src/db', () => ({
  default: {
    user: { findUnique: vi.fn(), create: vi.fn(), update: vi.fn() },
    userType: { findUnique: vi.fn() },
  },
}));

// 2. Mockeamos bcrypt para no gastar CPU encriptando en los tests
vi.mock('bcryptjs', () => ({
  default: { compare: vi.fn(), hash: vi.fn() },
}));

// 3. Mockeamos la librería de Google usando vi.hoisted para evitar errores de inicialización
const { mockVerifyIdToken } = vi.hoisted(() => ({
  mockVerifyIdToken: vi.fn(),
}));

vi.mock('google-auth-library', () => ({
  // Simulamos una clase real para que Vitest no se queje
  OAuth2Client: class {
    verifyIdToken = mockVerifyIdToken;
  },
}));

describe('Rutas de Autenticación (/api/auth)', () => {
  const mockUser = {
    id: 'uuid-1234',
    email: 'carlos@pingpong.com',
    name: 'Carlos',
    password: 'hashed-password',
    authProvider: 'LOCAL',
    userType: { name: 'Player' },
  };

  beforeEach(() => {
    vi.clearAllMocks();
    process.env.JWT_SECRET = 'secreto-de-prueba'; // Forzamos un secreto para el test
  });
  describe('Registro Público (/api/auth/register)', () => {
    const registerPayload = {
      email: 'nuevo@pingpong.com',
      password: 'password@A123',
      confirmPassword: 'password@A123',
      name: 'Ana',
      surname: 'Gómez',
    };
    it('ÉXITO: Debería registrar un jugador nuevo y devolver un token (201)', async () => {
      // 1. Aquí usamos mockResolvedValueOnce porque findUnique se llama dos veces en esta ruta:
      vi.mocked(prisma.user.findUnique).mockResolvedValueOnce(null);
      // Segunda llamada: Buscar el rol 'Player' (devolvemos un rol simulado)
      vi.mocked(prisma.userType.findUnique).mockResolvedValueOnce({
        id: 'player-role-id',
        name: 'Player',
      } as any);
      // 2. Simulamos la encriptación de la contraseña
      vi.mocked(
        bcrypt.hash as (data: string | Buffer, saltOrRounds: string | number) => Promise<string>,
      ).mockResolvedValue('hashed-password');

      // 3. Simulamos lo que devuelve Prisma al crear el usuario
      vi.mocked(prisma.user.create).mockResolvedValue({
        id: 'new-uuid-5678',
        email: registerPayload.email,
        name: registerPayload.name,
        surname: registerPayload.surname,
        userType: { name: 'Player' }, // El include: { userType: true } de la ruta
      } as any);

      const response = await request(app).post('/api/auth/register').send(registerPayload);

      expect(response.status).toBe(201);
      expect(response.body).toHaveProperty('token');
      expect(response.body.message).toBe('Jugador registrado con éxito');
    });
  });
  describe('Autenticación Local (Email/Contraseña)', () => {
    it('ÉXITO: Debería hacer login y devolver un token (200)', async () => {
      // Simulamos que el usuario existe
      vi.mocked(prisma.user.findUnique).mockResolvedValue(mockUser as any);
      // Simulamos que la contraseña es correcta
      vi.mocked(bcrypt.compare as (s: string, h: string) => Promise<boolean>).mockResolvedValue(
        true,
      );

      const response = await request(app)
        .post('/api/auth/login')
        .send({ email: 'carlos@pingpong.com', password: 'password123' });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('token');
      expect(response.body.message).toBe('Login local exitoso');
    });

    it('FALLO: Debería rechazar login con contraseña incorrecta (401)', async () => {
      vi.mocked(prisma.user.findUnique).mockResolvedValue(mockUser as any);
      // Simulamos que la contraseña es INCORRECTA
      vi.mocked(bcrypt.compare as (s: string, h: string) => Promise<boolean>).mockResolvedValue(
        false,
      );

      const response = await request(app)
        .post('/api/auth/login')
        .send({ email: 'carlos@pingpong.com', password: 'wrong-password' });

      expect(response.status).toBe(401);
      expect(response.body).toHaveProperty('error', 'Credenciales incorrectas');
      // Verificamos que no se devuelve ningún token si falla
      expect(response.body).not.toHaveProperty('token');
    });
  });

  describe('Autenticación con Google', () => {
    it('ÉXITO: Debería validar el token de Google y devolver nuestro JWT (200)', async () => {
      // Simulamos que Google nos da el "Ok" y nos devuelve los datos del usuario
      mockVerifyIdToken.mockResolvedValue({
        getPayload: () => ({
          email: 'google@pingpong.com',
          given_name: 'Google User',
          sub: 'google-id-123',
        }),
      });
      // Simulamos que el usuario ya estaba registrado en nuestra base de datos
      vi.mocked(prisma.user.findUnique).mockResolvedValue(mockUser as any);
      vi.mocked(prisma.user.update).mockResolvedValue(mockUser as any);

      const response = await request(app)
        .post('/api/auth/google')
        .send({ credential: 'fake-google-token-from-frontend' });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('token');
      expect(response.body.message).toBe('Login con Google exitoso');
    });

    it('FALLO: Debería rechazar un token de Google falso o caducado (401)', async () => {
      // Simulamos que la librería de Google lanza un error al validar el token falso
      mockVerifyIdToken.mockRejectedValue(new Error('Token signature invalid'));

      const response = await request(app)
        .post('/api/auth/google')
        .send({ credential: 'token-inventado-por-hacker' });

      expect(response.status).toBe(401);
      expect(response.body).toHaveProperty('error', 'Fallo al autenticar con Google');
    });
  });
});

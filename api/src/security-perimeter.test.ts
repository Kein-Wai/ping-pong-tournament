import { describe, it, expect, vi, beforeAll, beforeEach, afterEach } from 'vitest';
import request from 'supertest';
import express from 'express';
import { prismaMock } from './testing/prisma-mock';
import { useTestJwtSecret } from './testing/auth';

// Solo se mockea la base de datos: helmet, los limitadores y Swagger son los reales.
vi.mock('./db', async () => ({
  default: (await import('./testing/prisma-mock')).prismaMock.client,
}));

let app: Awaited<typeof import('./index')>['app'];

const wrongLogin = (ip: string) =>
  request(app)
    .post('/api/auth/login')
    .set('X-Forwarded-For', ip)
    .send({ email: 'ana@test.com', password: 'incorrecta' });

describe('Perímetro de la API', () => {
  beforeAll(async () => {
    useTestJwtSecret();
    ({ app } = await import('./index'));
  });

  beforeEach(() => {
    prismaMock.reset();
    prismaMock.client.club.findMany.mockResolvedValue([]);
    prismaMock.client.user.findUnique.mockResolvedValue(null);
  });

  describe('cabeceras de seguridad (helmet)', () => {
    it('no anuncia el framework y fija nosniff y HSTS', async () => {
      const response = await request(app).get('/api/clubs');

      expect(response.headers['x-powered-by']).toBeUndefined();
      expect(response.headers['x-content-type-options']).toBe('nosniff');
      expect(response.headers['strict-transport-security']).toBeDefined();
    });

    it('los recursos estáticos siguen pudiendo cargarse desde otros orígenes (iconos de los correos)', async () => {
      const response = await request(app).get('/assets/images/icon.png');

      expect(response.headers['cross-origin-resource-policy']).toBe('cross-origin');
    });
  });

  describe('límite de intentos', () => {
    it('el login bloquea con 429 tras 10 intentos fallidos de la misma IP', async () => {
      for (let attempt = 0; attempt < 10; attempt += 1) {
        expect((await wrongLogin('203.0.113.10')).status).toBe(401);
      }

      const blocked = await wrongLogin('203.0.113.10');

      expect(blocked.status).toBe(429);
      expect(blocked.body).toMatchObject({ success: false });
      expect(typeof blocked.body.error).toBe('string');
    });

    it('el bloqueo es por IP: otra IP puede seguir intentando', async () => {
      for (let attempt = 0; attempt < 11; attempt += 1) await wrongLogin('203.0.113.20');

      expect((await wrongLogin('203.0.113.21')).status).toBe(401);
    });

    it('los logins correctos no consumen el límite', async () => {
      const bcrypt = (await import('bcryptjs')).default;
      prismaMock.client.user.findUnique.mockResolvedValue({
        id: 'player-1',
        active: true,
        clubId: null,
        password: bcrypt.hashSync('Secreta123', 4),
        userType: { name: 'Player' },
      });
      prismaMock.client.refreshToken.create.mockResolvedValue({});

      for (let attempt = 0; attempt < 12; attempt += 1) {
        const response = await request(app)
          .post('/api/auth/login')
          .set('X-Forwarded-For', '203.0.113.30')
          .send({ email: 'ana@test.com', password: 'Secreta123' });
        expect(response.status).toBe(200);
      }
    });

    it('forgot-password permite 5 solicitudes por IP y bloquea la sexta', async () => {
      const forgot = () =>
        request(app)
          .post('/api/auth/forgot-password')
          .set('X-Forwarded-For', '203.0.113.40')
          .send({ email: 'ana@test.com' });

      for (let attempt = 0; attempt < 5; attempt += 1) {
        expect((await forgot()).status).not.toBe(429);
      }

      expect((await forgot()).status).toBe(429);
    });

    it('register y reset-password también están limitados', async () => {
      const post = (path: string) =>
        request(app).post(path).set('X-Forwarded-For', '203.0.113.50').send({});

      const registerStatuses: number[] = [];
      for (let attempt = 0; attempt < 11; attempt += 1) {
        registerStatuses.push((await post('/api/auth/register')).status);
      }
      const resetStatuses: number[] = [];
      for (let attempt = 0; attempt < 6; attempt += 1) {
        resetStatuses.push((await post('/api/auth/reset-password')).status);
      }

      expect(registerStatuses.at(-1)).toBe(429);
      expect(resetStatuses.at(-1)).toBe(429);
    });
  });

  describe('Swagger', () => {
    const buildDocsApp = async () => {
      const { setupSwagger } = await import('./swagger/index');
      const docs = express();
      setupSwagger(docs);
      return docs;
    };

    afterEach(() => {
      vi.unstubAllEnvs();
    });

    it('en producción /api-docs no existe (404)', async () => {
      vi.stubEnv('NODE_ENV', 'production');

      const response = await request(await buildDocsApp()).get('/api-docs/');

      expect(response.status).toBe(404);
    });

    it('fuera de producción /api-docs sigue sirviendo la documentación', async () => {
      const response = await request(await buildDocsApp()).get('/api-docs/');

      expect(response.status).toBe(200);
    });
  });
});

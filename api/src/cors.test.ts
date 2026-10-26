import { describe, it, expect, vi, beforeAll } from 'vitest';
import request from 'supertest';
import { getAllowedOrigins } from './config';

vi.mock('./db', async () => ({
  default: (await import('./testing/prisma-mock')).prismaMock.client,
}));

describe('getAllowedOrigins', () => {
  it('incluye los orígenes de desarrollo y de la app nativa más el cliente configurado', () => {
    const origins = getAllowedOrigins({ CLIENT_URL: 'https://club.example.com' });

    expect(origins).toEqual([
      'http://localhost:5173',
      'http://localhost',
      'capacitor://localhost',
      'https://club.example.com',
    ]);
  });

  it('normaliza la barra final de CLIENT_URL, que el navegador no envía en Origin', () => {
    expect(getAllowedOrigins({ CLIENT_URL: 'https://club.example.com/' })).toContain(
      'https://club.example.com',
    );
  });

  it('admite orígenes extra separados por comas en CORS_ORIGINS', () => {
    const origins = getAllowedOrigins({
      CLIENT_URL: 'https://club.example.com',
      CORS_ORIGINS: ' https://staging.example.com , https://otro.example.com ',
    });

    expect(origins).toEqual(
      expect.arrayContaining(['https://staging.example.com', 'https://otro.example.com']),
    );
  });

  it('no deja pasar ningún origen de producción que no venga del entorno', () => {
    expect(getAllowedOrigins({}).some((origin) => origin.includes('onrender.com'))).toBe(false);
  });
});

describe('CORS de la API', () => {
  let app: Awaited<typeof import('./index')>['app'];

  beforeAll(async () => {
    process.env.JWT_SECRET = 'secreto-de-pruebas';
    process.env.CLIENT_URL = 'https://club.example.com';
    ({ app } = await import('./index'));
  });

  it('permite el origen del cliente configurado en CLIENT_URL', async () => {
    const response = await request(app).get('/').set('Origin', 'https://club.example.com');

    expect(response.headers['access-control-allow-origin']).toBe('https://club.example.com');
  });

  it('no permite un origen desconocido', async () => {
    const response = await request(app).get('/').set('Origin', 'https://malo.example.com');

    expect(response.headers['access-control-allow-origin']).toBeUndefined();
  });
});

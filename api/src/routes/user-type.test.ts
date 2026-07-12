import { describe, it, expect, vi } from 'vitest';
import request from 'supertest';
import { app } from '../index';
import prisma from '../db';

// Interceptamos nuestra instancia de Prisma para que no llame a PostgreSQL
vi.mock('../db', () => ({
  default: {
    userType: {
      findMany: vi.fn(),
    },
  },
}));

vi.mock('../../src/middleware/auth.middleware', () => ({
  verifyToken: (req: any, res: any, next: any) => next(),
}));

describe('GET /api/user-types', () => {
  it('debería devolver una lista de tipos de usuario con status 200', async () => {
    // 1. Preparamos los datos simulados
    const mockUserTypes = [
      { id: '123e4567-e89b-12d3-a456-426614174000', name: 'Admin' },
      { id: '123e4567-e89b-12d3-a456-426614174002', name: 'Player' },
    ];

    // 2. Le decimos al mock de Prisma que resuelva la promesa con esos datos
    vi.mocked(prisma.userType.findMany).mockResolvedValue(mockUserTypes);

    // 3. Hacemos la petición HTTP simulada a nuestra ruta
    const response = await request(app).get('/api/user-types');

    // 4. Comprobamos que todo funciona como esperamos
    expect(response.status).toBe(200);
    expect(response.body).toEqual(mockUserTypes);
    expect(prisma.userType.findMany).toHaveBeenCalledOnce();
  });

  it('debería devolver un error 500 si la base de datos falla', async () => {
    // 1. Simulamos que la base de datos se ha caído
    vi.mocked(prisma.userType.findMany).mockRejectedValue('Error de conexión a la DB');

    // 2. Hacemos la petición HTTP simulada
    const response = await request(app).get('/api/user-types');

    // 3. Comprobamos que el servidor no explota y devuelve el error controlado
    expect(response.status).toBe(500);
    expect(response.body).toHaveProperty('error', 'Error al obtener los tipos de usuario');
  });
});

import { describe, it, expect, vi } from 'vitest';
import request from 'supertest';
import { app } from '../index';
import prisma from '../db';
import { TypeUser } from '@prisma/client';

vi.mock('../db', () => ({
  default: {
    userType: {
      findMany: vi.fn(),
    },
  },
}));

vi.mock('../../src/middleware/auth.middleware', () => ({
  verifyToken: (req: any, res: any, next: any) => next(),
  requireSuperAdmin: (req: any, res: any, next: any) => {
    req.user = { id: 'admin', role: 'SuperAdmin' };
    next();
  },
  requireAdminClub: (req: any, res: any, next: any) => next(),
}));

describe('GET /api/user-types', () => {
  it('debería devolver una lista de tipos de usuario con status 200', async () => {
    const mockUserTypes = [
      { id: '123e4567-e89b-12d3-a456-426614174000', name: TypeUser.AdminClub },
      { id: '123e4567-e89b-12d3-a456-426614174002', name: TypeUser.Player },
    ];

    vi.mocked(prisma.userType.findMany).mockResolvedValue(mockUserTypes);

    const response = await request(app).get('/api/user-types');

    expect(response.status).toBe(200);
    expect(response.body).toEqual(mockUserTypes);
    expect(prisma.userType.findMany).toHaveBeenCalledOnce();
  });

  it('debería devolver un error 500 si la base de datos falla', async () => {
    vi.mocked(prisma.userType.findMany).mockRejectedValue('Error de conexión a la DB');

    const response = await request(app).get('/api/user-types');

    expect(response.status).toBe(500);
    expect(response.body).toHaveProperty('error', 'Error al obtener los tipos de usuario');
  });
});

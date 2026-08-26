import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import { app } from '../../src/index';
import prisma from '../../src/db';

vi.mock('../../src/db', () => ({
  default: {
    exercise: { findMany: vi.fn(), create: vi.fn() },
  },
}));

vi.mock('../../src/middleware/auth.middleware', () => ({
  verifyToken: (req: any, res: any, next: any) => {
    req.user = { id: 'admin-123', role: 'AdminClub', clubId: 'club-1' };
    next();
  },
  requireAdminClub: (req: any, res: any, next: any) => {
    req.user = { id: 'admin-123', role: 'AdminClub', clubId: 'club-1' };
    next();
  },
  requireSuperAdmin: (req: any, res: any, next: any) => next(),
}));

describe('CRUD Rutas de Ejercicios (/api/exercises)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('GET / - Debería devolver el catálogo de ejercicios (200)', async () => {
    vi.mocked(prisma.exercise.findMany).mockResolvedValue([{ id: 'ex-1', name: 'Test' }] as any);

    const response = await request(app).get('/api/exercises');

    expect(response.status).toBe(200);
    expect(response.body.data).toHaveLength(1);
    expect(prisma.exercise.findMany).toHaveBeenCalledOnce();
  });

  it('POST / - Debería crear un ejercicio nuevo (201)', async () => {
    vi.mocked(prisma.exercise.create).mockResolvedValue({ id: 'ex-new' } as any);

    const payload = {
      name: 'Nuevo Saque',
      description: 'Descripción súper detallada',
      category: 'Servicios_Ataque',
    };

    const response = await request(app).post('/api/exercises').send(payload);

    expect(response.status).toBe(201);
    expect(response.body.success).toBe(true);
  });

  it('POST / - Debería fallar (400) con datos inválidos de Zod', async () => {
    const payload = {
      name: 'No', // Corto
      description: 'No', // Corto
      category: 'CategoriaInventada',
    };

    const response = await request(app).post('/api/exercises').send(payload);

    expect(response.status).toBe(400);
    expect(response.body.error).toBe('Datos inválidos');
  });
});

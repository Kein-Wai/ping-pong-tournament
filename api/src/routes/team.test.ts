import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import { app } from '../../src/index';
import prisma from '../../src/db';

vi.mock('../../src/db', () => ({
  default: {
    team: {
      findMany: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      findUnique: vi.fn(),
      delete: vi.fn(),
    },
    teamMatch: { create: vi.fn() },
    user: { findMany: vi.fn() },
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

describe('CRUD Rutas de Equipos (/api/teams)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('GET /club/:clubId - Debería obtener equipos de un club (200)', async () => {
    vi.mocked(prisma.team.findMany).mockResolvedValue([{ id: 'team-1', name: 'Absoluto' }] as any);

    const response = await request(app).get('/api/teams/club/club-1');

    expect(response.status).toBe(200);
    expect(response.body.data).toHaveLength(1);
    expect(prisma.team.findMany).toHaveBeenCalledOnce();
  });

  it('POST / - Debería crear un equipo con validación (201)', async () => {
    vi.mocked(prisma.team.create).mockResolvedValue({ id: 'team-new', name: 'Alevines' } as any);

    const response = await request(app)
      .post('/api/teams')
      .send({ name: 'Alevines', category: 'Provincial', level: 'Intermedio' });

    expect(response.status).toBe(201);
    expect(response.body.success).toBe(true);
  });

  it('PUT /:id/players - Debería actualizar plantilla y calcular el nivel más bajo (200)', async () => {
    vi.mocked(prisma.team.findUnique).mockResolvedValue({ id: 'team-1', clubId: 'club-1' } as any);
    vi.mocked(prisma.user.findMany).mockResolvedValue([
      { id: '11111111-1111-4111-a111-111111111111', level: 'Profesional' },
      { id: '22222222-2222-4222-a222-222222222222', level: 'Intermedio' },
    ] as any);
    vi.mocked(prisma.team.update).mockResolvedValue({ id: 'team-1', level: 'Intermedio' } as any);

    const response = await request(app)
      .put('/api/teams/team-1/players')
      .send({
        playerIds: ['11111111-1111-4111-a111-111111111111', '22222222-2222-4222-a222-222222222222'],
      }); // 👈 AHORA SON UUIDS

    expect(response.status).toBe(200);
    expect(prisma.team.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ level: 'Intermedio' }),
      }),
    );
  });

  it('DELETE /:id - Debería borrar un equipo si pertenece a tu club (200)', async () => {
    vi.mocked(prisma.team.findUnique).mockResolvedValue({ id: 'team-1', clubId: 'club-1' } as any);
    vi.mocked(prisma.team.delete).mockResolvedValue({} as any);

    const response = await request(app).delete('/api/teams/team-1');

    expect(response.status).toBe(200);
    expect(prisma.team.delete).toHaveBeenCalledOnce();
  });
});

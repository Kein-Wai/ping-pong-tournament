import { describe, it, expect, vi } from 'vitest';
import request from 'supertest';
import { app } from '../../src/index';
import prisma from '../../src/db';

vi.mock('../../src/db', () => ({
  default: {
    user: {
      findUnique: vi.fn().mockResolvedValue({ id: 'u1', name: 'Perfil' }),
      findMany: vi.fn().mockResolvedValue([]),
      playerSkillUpdate: { aggregate: vi.fn().mockResolvedValue({ _sum: {} }) },
    },
    userType: { findUnique: vi.fn().mockResolvedValue({ id: 'pt-1' }) },
    playerSkillUpdate: { aggregate: vi.fn().mockResolvedValue({ _sum: {} }) },
    season: { findFirst: vi.fn().mockResolvedValue({ id: 's1', name: 'T', isCurrent: true }) },
    tournament: { findMany: vi.fn().mockResolvedValue([]), findUnique: vi.fn().mockResolvedValue(null) },
    trainingSession: { findUnique: vi.fn().mockResolvedValue(null), findMany: vi.fn().mockResolvedValue([]) },
    playerTraining: { findUnique: vi.fn().mockResolvedValue(null), findMany: vi.fn().mockResolvedValue([]) },
    sessionExercise: { findMany: vi.fn().mockResolvedValue([]), count: vi.fn().mockResolvedValue(0) },
    club: { findUnique: vi.fn().mockResolvedValue(null) },
  },
}));

vi.mock('../../src/middleware/auth.middleware', () => ({
  verifyToken: (req: any, res: any, next: any) => {
    req.user = { id: 'u1', role: 'SuperAdmin', clubId: 'club-1' };
    next();
  },
  requireSuperAdmin: (req: any, res: any, next: any) => next(),
  requireAdminClub: (req: any, res: any, next: any) => next(),
  requireAdminClubAnyStatus: (req: any, res: any, next: any) => next(),
}));

describe('Orden de montaje de rutas (/api/users, /api/trainings)', () => {
  it('GET /api/users/me resuelve al handler de perfil, no al de /:id', async () => {
    const res = await request(app).get('/api/users/me');
    // el handler de perfil busca por id del usuario autenticado (u1)
    expect(vi.mocked(prisma.user.findUnique).mock.calls[0][0]).toMatchObject({
      where: { id: 'u1' },
    });
    expect(res.status).toBe(200);
  });

  it('GET /api/users/:id resuelve al handler de recurso, no al de lista', async () => {
    vi.mocked(prisma.user.findUnique).mockClear();
    const res = await request(app).get('/api/users/u9');
    expect(vi.mocked(prisma.user.findUnique).mock.calls[0][0]).toMatchObject({
      where: { id: 'u9' },
    });
    expect(res.status).toBe(200);
  });

  it('GET /api/trainings/sessions/:id NO se captura como /:planId', async () => {
    vi.mocked(prisma.trainingSession.findUnique).mockClear();
    const res = await request(app).get('/api/trainings/sessions/s1');
    expect(vi.mocked(prisma.trainingSession.findUnique).mock.calls[0][0]).toMatchObject({
      where: { id: 's1' },
    });
    expect(res.status).toBe(404);
  });

  it('GET /api/trainings/player/:id NO se captura como /:planId', async () => {
    vi.mocked(prisma.playerTraining.findMany).mockClear();
    const res = await request(app).get('/api/trainings/player/u1');
    expect(vi.mocked(prisma.playerTraining.findMany).mock.calls.length).toBeGreaterThan(0);
    expect(res.status).toBe(200);
  });
});

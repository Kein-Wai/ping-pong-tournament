import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import { app } from '../../src/index';
import prisma from '../../src/db';

vi.mock('../../src/db', () => ({
  default: {
    manualMatch: { findMany: vi.fn(), create: vi.fn(), findUnique: vi.fn(), update: vi.fn() },
    pointAnalysis: { create: vi.fn(), delete: vi.fn() },
    playerSkills: { findUnique: vi.fn() },
    playerSkillUpdate: { create: vi.fn() },
    $transaction: vi.fn(async (cb) => cb(prisma)),
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

describe('Rutas de Análisis Pro (/api/manual-matches)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('POST / - Debería crear un partido de análisis nuevo (201)', async () => {
    vi.mocked(prisma.manualMatch.create).mockResolvedValue({ id: 'mm-1' } as any);

    const payload = {
      location: 'Casa',
      matchType: 'Amistoso',
      format: 'Individual',
      opponentName: 'Rival Test',
    };

    const response = await request(app).post('/api/manual-matches').send(payload);

    expect(response.status).toBe(201);
    expect(prisma.manualMatch.create).toHaveBeenCalledOnce();
  });

  it('POST /:id/points - Debería registrar un punto correctamente (201)', async () => {
    vi.mocked(prisma.pointAnalysis.create).mockResolvedValue({ id: 'pt-1' } as any);

    const payload = {
      setNumber: 1,
      pointOrder: 1,
      isWon: true,
      phase: 'Servicio',
      technique: 'Ace',
    };

    const response = await request(app).post('/api/manual-matches/mm-1/points').send(payload);

    expect(response.status).toBe(201);
    expect(prisma.pointAnalysis.create).toHaveBeenCalledOnce();
  });

  it('PUT /:id/complete - Debería finalizar partido e inyectar experiencia (200)', async () => {
    vi.mocked(prisma.manualMatch.update).mockResolvedValue({
      id: 'mm-1',
      status: 'Completado',
    } as any);
    vi.mocked(prisma.playerSkills.findUnique).mockResolvedValue({
      fortalezaMental: 50,
      experiencia: 50,
    } as any);

    const response = await request(app)
      .put('/api/manual-matches/mm-1/complete')
      .send({ mySets: 3, opponentSets: 1 });

    expect(response.status).toBe(200);
    // Verificamos que se actualiza a Completado
    expect(prisma.manualMatch.update).toHaveBeenCalledOnce();
    // Verificamos que se crea la recompensa en la tabla de SkillUpdate
    expect(prisma.playerSkillUpdate.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ sourceType: 'Partido', status: 'EXPECTED' }),
      }),
    );
  });
});

import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import { app } from '../../src/index';
import prisma from '../../src/db';

vi.mock('../../src/db', () => ({
  default: {
    user: { findUnique: vi.fn() },
    playerSkills: { upsert: vi.fn() },
    playerSkillUpdate: { updateMany: vi.fn() },
    $transaction: vi.fn(async (cb) => cb(prisma)), // Simulamos ejecución de transacción
  },
}));

vi.mock('../../src/middleware/auth.middleware', () => ({
  verifyToken: (req: any, res: any, next: any) => next(),
  requireAdminClub: (req: any, res: any, next: any) => {
    req.user = { id: 'admin-123', role: 'AdminClub', clubId: 'club-1' };
    next();
  },
  requireSuperAdmin: (req: any, res: any, next: any) => next(),
}));

describe('Rutas de Habilidades RPG (/api/skills)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const mockSkills = {
    derechaPlano: 50,
    revesPlano: 50,
    topspinDerecha: 50,
    topspinReves: 50,
    corte: 50,
    bloqueoDerecha: 50,
    bloqueoReves: 50,
    servicio: 50,
    recepcion: 50,
    movilidad: 50,
    fortalezaMental: 50,
    experiencia: 50,
  };

  it('PUT /:playerId - Debería actualizar/crear habilidades (200)', async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue({
      id: 'player-1',
      clubId: 'club-1',
    } as any);
    vi.mocked(prisma.playerSkills.upsert).mockResolvedValue({ id: 'skills-1' } as any);

    const response = await request(app).put('/api/skills/player-1').send(mockSkills);

    expect(response.status).toBe(200);
    expect(prisma.playerSkills.upsert).toHaveBeenCalledOnce();
  });

  it('PUT /:playerId/consolidate - Debería consolidar progreso y vaciar bandeja (200)', async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue({
      id: 'player-1',
      clubId: 'club-1',
    } as any);

    const response = await request(app).put('/api/skills/player-1/consolidate').send(mockSkills);

    expect(response.status).toBe(200);
    // Dentro de la transacción se actualizan las skills
    expect(prisma.playerSkills.upsert).toHaveBeenCalledOnce();
    // Y se limpian los pendientes
    expect(prisma.playerSkillUpdate.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({ data: { status: 'COMPLETED' } }),
    );
  });
});

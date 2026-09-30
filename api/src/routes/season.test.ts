import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import { app } from '../../src/index';
import prisma from '../../src/db';

vi.mock('../../src/db', () => ({
  default: {
    season: { findMany: vi.fn() },
  },
}));

vi.mock('../../src/middleware/auth.middleware', () => ({
  verifyToken: (req: any, res: any, next: any) => {
    req.user = { id: 'admin-1', role: 'AdminClub', clubId: 'club-1' };
    next();
  },
  requireAdminClub: (req: any, res: any, next: any) => {
    req.user = { id: 'admin-1', role: 'AdminClub', clubId: 'club-1' };
    next();
  },
  requireSuperAdmin: (req: any, res: any, next: any) => {
    req.user = { id: 'admin-1', role: 'SuperAdmin', clubId: 'club-1' };
    next();
  },
}));

describe('Rutas de Temporadas (/api/seasons)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('GET / - Debería devolver todas las temporadas ordenadas (200)', async () => {
    vi.mocked(prisma.season.findMany).mockResolvedValue([
      { id: 's1', name: 'Temporada 2026/2027' },
      { id: 's2', name: 'Temporada 2025/2026' },
    ] as any);

    const response = await request(app).get('/api/seasons');

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.data).toHaveLength(2);
    expect(prisma.season.findMany).toHaveBeenCalledOnce();
  });
});

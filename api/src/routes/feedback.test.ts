import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import { app } from '../../src/index';
import prisma from '../../src/db';

vi.mock('../../src/db', () => ({
  default: {
    appFeedback: { findMany: vi.fn(), create: vi.fn(), update: vi.fn() },
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

describe('Rutas de Feedback (/api/feedback)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('POST / - Debería crear un reporte de bug (201)', async () => {
    vi.mocked(prisma.appFeedback.create).mockResolvedValue({ id: 'fb-1' } as any);

    const response = await request(app).post('/api/feedback').send({
      type: 'Bug',
      content: 'El botón de guardar no funciona en la pantalla X',
    });

    expect(response.status).toBe(201);
    expect(response.body.success).toBe(true);
    expect(prisma.appFeedback.create).toHaveBeenCalledOnce();
  });

  it('PUT /:id/status - SuperAdmin debería poder cambiar el estado (200)', async () => {
    vi.mocked(prisma.appFeedback.update).mockResolvedValue({
      id: 'fb-1',
      status: 'Resuelto',
    } as any);

    const response = await request(app).put('/api/feedback/fb-1/status').send({
      status: 'Resuelto',
    });

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(prisma.appFeedback.update).toHaveBeenCalledOnce();
  });
});

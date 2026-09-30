import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import { app } from '../../src/index';
import prisma from '../../src/db';

vi.mock('../../src/db', () => ({
  default: {
    clubEvent: {
      findMany: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      findUnique: vi.fn(),
    },
    eventReminder: { createMany: vi.fn(), deleteMany: vi.fn() },
    season: {
      findFirst: vi
        .fn()
        .mockResolvedValue({ id: 'season-1', name: 'Temporada 2026/2027', isCurrent: true }),
      updateMany: vi.fn().mockResolvedValue({ count: 1 }),
      findUnique: vi.fn().mockResolvedValue(null),
      create: vi
        .fn()
        .mockResolvedValue({ id: 'season-1', name: 'Temporada 2026/2027', isCurrent: true }),
      update: vi
        .fn()
        .mockResolvedValue({ id: 'season-1', name: 'Temporada 2026/2027', isCurrent: true }),
    },
  },
}));

vi.mock('../../src/services/email', () => ({
  enviarCorreoGenerico: vi.fn().mockResolvedValue(true),
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

describe('Rutas de Eventos (/api/events)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('POST / - Debería crear un evento de club (201)', async () => {
    vi.mocked(prisma.clubEvent.create).mockResolvedValue({
      id: 'ev-1',
      name: 'Torneo Local',
    } as any);

    const payload = {
      name: 'Torneo Local',
      date: new Date().toISOString(),
      region: 'Local',
      color: 'blue',
    };

    const response = await request(app).post('/api/events').send(payload);

    expect(response.status).toBe(201);
    expect(response.body.success).toBe(true);
    expect(prisma.clubEvent.create).toHaveBeenCalledOnce();
  });

  it('POST /:id/reminders - Debería crear recordatorios para un evento (201)', async () => {
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + 10);

    vi.mocked(prisma.clubEvent.findUnique).mockResolvedValue({
      id: 'ev-1',
      date: futureDate,
    } as any);
    vi.mocked(prisma.eventReminder.createMany).mockResolvedValue({ count: 2 } as any);

    const response = await request(app).post('/api/events/ev-1/reminders');

    expect(response.status).toBe(201);
    expect(response.body.message).toBe('Recordatorios activados');
    expect(prisma.eventReminder.createMany).toHaveBeenCalledOnce();
  });
});

import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import { app } from '../../src/index';
import prisma from '../../src/db';

vi.mock('../../src/db', () => ({
  default: {
    generalTrainingSchedule: {
      findMany: vi.fn(),
      create: vi.fn(),
      findUnique: vi.fn(),
      delete: vi.fn(),
    },
    generalTraining: { findMany: vi.fn(), createMany: vi.fn(), findUnique: vi.fn() },
    skillUpdateTemplate: { create: vi.fn(), delete: vi.fn() },
    generalTrainingAttendance: { findMany: vi.fn(), createMany: vi.fn(), deleteMany: vi.fn() },
    playerSkillUpdate: { createMany: vi.fn(), deleteMany: vi.fn() },
    playerSkills: { findMany: vi.fn() },
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

describe('Rutas de Entrenamientos Grupales (/api/general-trainings)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('POST /schedules - Debería crear un horario recurrente (201)', async () => {
    vi.mocked(prisma.generalTrainingSchedule.create).mockResolvedValue({ id: 'sch-1' } as any);

    const payload = {
      name: 'Clase L-X-V',
      startTime: '17:00',
      endTime: '19:00',
      daysOfWeek: [1, 3, 5], // Lunes, Miércoles, Viernes
    };

    const response = await request(app).post('/api/general-trainings/schedules').send(payload);

    expect(response.status).toBe(201);
  });

  it('POST / - Debería crear sesiones calculando los días correctos (201)', async () => {
    vi.mocked(prisma.generalTrainingSchedule.findUnique).mockResolvedValue({
      id: '11111111-1111-4111-a111-111111111111',
      daysOfWeek: [1, 3, 5],
    } as any);
    vi.mocked(prisma.skillUpdateTemplate.create).mockResolvedValue({ id: 'tpl-1' } as any);

    const payload = {
      description: 'Semana táctica',
      startDate: '2026-08-03T00:00:00Z',
      endDate: '2026-08-09T12:00:00Z',
      scheduleId: '11111111-1111-4111-a111-111111111111', // 👈 AHORA ES UUID
      skillsToTrain: { topspinDerecha: true, movilidad: true },
    };

    const response = await request(app).post('/api/general-trainings').send(payload);

    expect(response.status).toBe(201);
    expect(response.body.message).toContain('3 sesiones');
    expect(prisma.generalTraining.createMany).toHaveBeenCalledOnce();
  });

  it('PUT /:id/attendance/bulk - Debería sincronizar asistencia e inyectar experiencia (200)', async () => {
    vi.mocked(prisma.generalTraining.findUnique).mockResolvedValue({
      id: 'gt-1',
      clubId: 'club-1',
      template: { topspinDerecha: true },
    } as any);
    vi.mocked(prisma.generalTrainingAttendance.findMany).mockResolvedValue([]);
    vi.mocked(prisma.playerSkills.findMany).mockResolvedValue([
      { userId: '11111111-1111-4111-a111-111111111111', topspinDerecha: 40 },
    ] as any);

    const response = await request(app)
      .put('/api/general-trainings/gt-1/attendance/bulk')
      .send({ playerIds: ['11111111-1111-4111-a111-111111111111'] }); // 👈 AHORA ES UUID

    expect(response.status).toBe(200);
    expect(prisma.generalTrainingAttendance.createMany).toHaveBeenCalledOnce();
    expect(prisma.playerSkillUpdate.createMany).toHaveBeenCalledOnce();
  });
});

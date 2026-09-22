import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import { app } from '../../src/index';
import prisma from '../../src/db';

// Mock de Prisma
vi.mock('../../src/db', () => ({
  default: {
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
    user: { findUnique: vi.fn() },
    playerTraining: { create: vi.fn(), findUnique: vi.fn(), delete: vi.fn(), findMany: vi.fn() },
    trainingSession: { findUnique: vi.fn() },
    exercise: { findUnique: vi.fn() },
    sessionExercise: {
      findFirst: vi.fn(),
      count: vi.fn(),
      create: vi.fn(),
      delete: vi.fn(),
      findMany: vi.fn(),
      createMany: vi.fn(),
      update: vi.fn(),
    },
  },
}));

// Mocks de Middlewares
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

describe('CRUD Rutas de Entrenamientos (/api/trainings)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('POST /api/trainings', () => {
    it('Debería crear un macrociclo con éxito (201)', async () => {
      // Simulamos que el jugador existe y es del mismo club
      vi.mocked(prisma.user.findUnique).mockResolvedValue({
        id: 'player-1',
        clubId: 'club-1',
      } as any);
      vi.mocked(prisma.playerTraining.create).mockResolvedValue({ id: 'plan-1' } as any);

      const payload = {
        playerId: '11111111-1111-4111-a111-111111111111',
        strengths: 'Fuerza',
        weaknesses: 'Velocidad',
        objectives: 'Ganar',
        sessionsPerWeek: 3,
        weeks: 4,
        startDate: new Date(Date.now() + 86400000).toISOString(), // Mañana
      };

      const response = await request(app).post('/api/trainings').send(payload);

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(prisma.playerTraining.create).toHaveBeenCalledOnce();
    });

    it('Debería fallar (403) si el jugador no pertenece a tu club', async () => {
      vi.mocked(prisma.user.findUnique).mockResolvedValue({
        id: 'player-1',
        clubId: 'club-rival',
      } as any);

      const payload = {
        playerId: '11111111-1111-4111-a111-111111111111',
        strengths: 'Fuerza',
        weaknesses: 'Velocidad',
        objectives: 'Ganar',
        sessionsPerWeek: 3,
        weeks: 4,
        startDate: new Date(Date.now() + 86400000).toISOString(),
      };

      const response = await request(app).post('/api/trainings').send(payload);

      expect(response.status).toBe(403);
      expect(response.body.error).toBe('El jugador no pertenece a tu club');
    });
  });

  describe('POST /api/trainings/sessions/:sessionId/exercises', () => {
    it('Debería fallar (400) si se supera el límite de 6 ejercicios', async () => {
      vi.mocked(prisma.trainingSession.findUnique).mockResolvedValue({ id: 'sesion-1' } as any);
      vi.mocked(prisma.exercise.findUnique).mockResolvedValue({ id: 'ejercicio-1' } as any);
      vi.mocked(prisma.sessionExercise.findFirst).mockResolvedValue(null);
      vi.mocked(prisma.sessionExercise.count).mockResolvedValue(6); // Ya hay 6

      const payload = { exerciseId: '22222222-2222-4222-a222-222222222222', sets: 3, reps: 10 };

      const response = await request(app)
        .post('/api/trainings/sessions/sesion-1/exercises')
        .send(payload);

      expect(response.status).toBe(400);
      expect(response.body.error).toBe(
        'Se ha alcanzado el límite máximo de 6 ejercicios por sesión',
      );
      expect(prisma.sessionExercise.create).not.toHaveBeenCalled();
    });
  });

  describe('GET /api/trainings/:planId', () => {
    it('Debería dejar ver el plan si el admin es el creador/dueño del club (200)', async () => {
      vi.mocked(prisma.playerTraining.findUnique).mockResolvedValue({
        id: 'plan-1',
        playerId: 'otro-jugador',
      } as any);

      const response = await request(app).get('/api/trainings/plan-1');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });
  });
});

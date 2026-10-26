import { describe, it, expect, vi, beforeAll, beforeEach } from 'vitest';
import request from 'supertest';
import { prismaMock } from '../../testing/prisma-mock';
import { bearer, useTestJwtSecret, CLUB_1, type IdentityName } from '../../testing/auth';

// Solo se mockea la base de datos: los guardas de autenticacion son los reales.
vi.mock('../../db', async () => ({
  default: (await import('../../testing/prisma-mock')).prismaMock.client,
}));

// El jugador dueño de los entrenamientos es `playerClub1` (id player-1) del club 1.
const OWNER = { id: 'player-1', clubId: CLUB_1 };
const EXERCISE_ID = '123e4567-e89b-42d3-a456-426614174000';
let app: Awaited<typeof import('../../index')>['app'];

const session = (id = 's1') => ({
  id,
  playerId: OWNER.id,
  playerTrainingId: 'plan-1',
  player: OWNER,
  exercises: [],
});
const plan = () => ({
  id: 'plan-1',
  playerId: OWNER.id,
  player: { ...OWNER, name: 'Ana', surname: 'Gil' },
  sessions: [],
});
const sessionExercise = () => ({
  id: 'se1',
  trainingSessionId: 's1',
  session: { ...session(), playerTrainingId: 'plan-1' },
});

const VIEWERS: IdentityName[] = ['playerClub1', 'adminClub1', 'superAdmin'];
const STRANGERS: IdentityName[] = ['playerClub2', 'adminClub2', 'freePlayer'];
const MANAGERS: IdentityName[] = ['adminClub1', 'superAdmin'];

describe('Entrenamientos (/api/trainings): quien puede ver y quien puede gestionar', () => {
  beforeAll(async () => {
    useTestJwtSecret();
    ({ app } = await import('../../index'));
  });

  beforeEach(() => {
    prismaMock.reset();
    prismaMock.client.playerTraining.findUnique.mockResolvedValue(plan());
    prismaMock.client.playerTraining.findMany.mockResolvedValue([]);
    prismaMock.client.playerTraining.update.mockResolvedValue({});
    prismaMock.client.playerTraining.delete.mockResolvedValue({});
    prismaMock.client.user.findUnique.mockResolvedValue(OWNER);
    prismaMock.client.trainingSession.findUnique.mockImplementation(async ({ where }) =>
      session(where.id),
    );
    prismaMock.client.sessionExercise.findUnique.mockResolvedValue(sessionExercise());
    prismaMock.client.sessionExercise.findFirst.mockResolvedValue(null);
    prismaMock.client.sessionExercise.findMany.mockResolvedValue([
      { exerciseId: EXERCISE_ID, sets: 3, reps: 10, durationMinutes: null },
    ]);
    prismaMock.client.sessionExercise.count.mockResolvedValue(0);
    prismaMock.client.sessionExercise.create.mockResolvedValue({ id: 'se-new' });
    prismaMock.client.sessionExercise.createMany.mockResolvedValue({ count: 1 });
    prismaMock.client.sessionExercise.delete.mockResolvedValue({});
    prismaMock.client.sessionExercise.update.mockResolvedValue({
      id: 'se1',
      session: { playerTrainingId: 'plan-1' },
    });
    prismaMock.client.exercise.findUnique.mockResolvedValue({ id: EXERCISE_ID });
  });

  describe.each([
    ['GET /api/trainings/plan-1', () => 'get', '/api/trainings/plan-1'],
    ['GET /api/trainings/player/player-1', () => 'get', '/api/trainings/player/player-1'],
    ['GET /api/trainings/sessions/s1', () => 'get', '/api/trainings/sessions/s1'],
  ])('%s (lectura)', (_name, _method, path) => {
    it.each(VIEWERS)('permite a %s', async (identity) => {
      const response = await request(app).get(path).set(bearer(identity));

      expect(response.status).toBe(200);
    });

    it.each(STRANGERS)('deniega a %s', async (identity) => {
      const response = await request(app).get(path).set(bearer(identity));

      expect(response.status).toBe(403);
    });
  });

  describe('DELETE /api/trainings/:planId', () => {
    it.each<IdentityName>(['playerClub1', ...STRANGERS])(
      'deniega a %s y no borra',
      async (identity) => {
        const response = await request(app).delete('/api/trainings/plan-1').set(bearer(identity));

        expect(response.status).toBe(403);
        expect(prismaMock.writes()).toEqual([]);
      },
    );

    it.each(MANAGERS)('permite a %s', async (identity) => {
      const response = await request(app).delete('/api/trainings/plan-1').set(bearer(identity));

      expect(response.status).toBe(200);
      expect(prismaMock.writes()).toContain('playerTraining.delete');
    });
  });

  describe('POST /api/trainings/sessions/:sessionId/exercises', () => {
    const add = (identity: IdentityName) =>
      request(app)
        .post('/api/trainings/sessions/s1/exercises')
        .set(bearer(identity))
        .send({ exerciseId: EXERCISE_ID });

    it.each<IdentityName>(['playerClub1', ...STRANGERS])(
      'deniega a %s y no escribe',
      async (identity) => {
        const response = await add(identity);

        expect(response.status).toBe(403);
        expect(prismaMock.writes()).toEqual([]);
      },
    );

    it.each(MANAGERS)('permite a %s', async (identity) => {
      const response = await add(identity);

      expect(response.status).toBe(201);
    });
  });

  describe('POST /api/trainings/sessions/:target/clone-from/:source', () => {
    const clone = (identity: IdentityName) =>
      request(app).post('/api/trainings/sessions/s2/clone-from/s1').set(bearer(identity));

    it.each<IdentityName>(['playerClub1', ...STRANGERS])(
      'deniega a %s y no escribe',
      async (identity) => {
        const response = await clone(identity);

        expect(response.status).toBe(403);
        expect(prismaMock.writes()).toEqual([]);
      },
    );

    it.each(MANAGERS)('permite a %s', async (identity) => {
      const response = await clone(identity);

      expect(response.status).toBe(201);
    });
  });

  describe('DELETE /api/trainings/sessions/exercises/:id', () => {
    it.each<IdentityName>(['playerClub1', ...STRANGERS])(
      'deniega a %s y no borra',
      async (identity) => {
        const response = await request(app)
          .delete('/api/trainings/sessions/exercises/se1')
          .set(bearer(identity));

        expect(response.status).toBe(403);
        expect(prismaMock.writes()).toEqual([]);
      },
    );

    it.each(MANAGERS)('permite a %s', async (identity) => {
      const response = await request(app)
        .delete('/api/trainings/sessions/exercises/se1')
        .set(bearer(identity));

      expect(response.status).toBe(200);
    });
  });

  describe('PUT /api/trainings/sessions/exercises/:id (marcar como hecho)', () => {
    const mark = (identity: IdentityName) =>
      request(app)
        .put('/api/trainings/sessions/exercises/se1')
        .set(bearer(identity))
        .send({ completed: true });

    it.each(STRANGERS)('deniega a %s y no escribe', async (identity) => {
      const response = await mark(identity);

      expect(response.status).toBe(403);
      expect(prismaMock.writes()).toEqual([]);
    });

    it.each(VIEWERS)('permite a %s', async (identity) => {
      const response = await mark(identity);

      expect(response.status).toBe(200);
    });
  });
});

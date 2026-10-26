import { describe, it, expect, vi, beforeAll, beforeEach } from 'vitest';
import request from 'supertest';
import { prismaMock } from '../testing/prisma-mock';
import { bearer, useTestJwtSecret, type IdentityName } from '../testing/auth';
import { currentSeasonFixture, userRowWithSecrets } from '../testing/fixtures';

// Solo se mockea la base de datos: los guardas de autenticacion son los reales.
vi.mock('../db', async () => ({
  default: (await import('../testing/prisma-mock')).prismaMock.client,
}));
vi.mock('../services/email', () => ({ enviarCorreoGenerico: vi.fn().mockResolvedValue(true) }));

// Un jugador libre (sin club) es el recurso que un AdminClub sin club "coincidía" por null === null.
const FREE_PLAYER_ID = '123e4567-e89b-42d3-a456-426614174000';
let app: Awaited<typeof import('../index')>['app'];

const skills = Object.fromEntries(
  [
    'derechaPlano',
    'revesPlano',
    'topspinDerecha',
    'topspinReves',
    'corte',
    'bloqueoDerecha',
    'bloqueoReves',
    'servicio',
    'recepcion',
    'movilidad',
    'fortalezaMental',
    'experiencia',
  ].map((name) => [name, 50]),
);

const DENIED: IdentityName[] = ['adminWithoutClub', 'adminClub1'];

const routes = [
  {
    name: 'PUT /api/users/:id',
    call: (identity: IdentityName) =>
      request(app)
        .put(`/api/users/${FREE_PLAYER_ID}`)
        .set(bearer(identity))
        .send({ name: 'Nombre Nuevo' }),
    write: 'user.update',
  },
  {
    name: 'DELETE /api/users/:id',
    call: (identity: IdentityName) =>
      request(app).delete(`/api/users/${FREE_PLAYER_ID}`).set(bearer(identity)),
    write: 'user.delete',
  },
  {
    name: 'PUT /api/skills/:playerId',
    call: (identity: IdentityName) =>
      request(app).put(`/api/skills/${FREE_PLAYER_ID}`).set(bearer(identity)).send(skills),
    write: 'playerSkills.upsert',
  },
  {
    name: 'PUT /api/skills/:playerId/consolidate',
    call: (identity: IdentityName) =>
      request(app)
        .put(`/api/skills/${FREE_PLAYER_ID}/consolidate`)
        .set(bearer(identity))
        .send(skills),
    write: 'playerSkills.upsert',
  },
  {
    name: 'POST /api/trainings (plan para un jugador)',
    call: (identity: IdentityName) =>
      request(app).post('/api/trainings').set(bearer(identity)).send({
        playerId: FREE_PLAYER_ID,
        strengths: 'Fuerza',
        weaknesses: 'Velocidad',
        objectives: 'Ganar',
        sessionsPerWeek: 2,
        weeks: 2,
        startDate: '2030-06-03T00:00:00.000Z',
      }),
    write: 'playerTraining.create',
  },
];

describe('Un jugador libre (sin club) solo lo administra el SuperAdmin', () => {
  beforeAll(async () => {
    useTestJwtSecret();
    ({ app } = await import('../index'));
  });

  beforeEach(() => {
    prismaMock.reset();
    prismaMock.client.season.findFirst.mockResolvedValue(currentSeasonFixture());
    prismaMock.client.user.findUnique.mockResolvedValue({ id: FREE_PLAYER_ID, clubId: null });
    prismaMock.client.user.update.mockResolvedValue(userRowWithSecrets({ clubId: null }));
    prismaMock.client.user.delete.mockResolvedValue({});
    prismaMock.client.playerSkills.upsert.mockResolvedValue({});
    prismaMock.client.playerSkillUpdate.updateMany.mockResolvedValue({ count: 0 });
    prismaMock.client.playerTraining.create.mockResolvedValue({ id: 'plan-1' });
  });

  describe.each(routes)('$name', ({ call, write }) => {
    it.each(DENIED)('deniega a %s y no escribe nada', async (identity) => {
      const response = await call(identity);

      expect(response.status).toBe(403);
      expect(prismaMock.writes()).toEqual([]);
    });

    it('permite al SuperAdmin', async () => {
      const response = await call('superAdmin');

      expect([200, 201, 204]).toContain(response.status);
      expect(prismaMock.writes()).toContain(write);
    });
  });
});

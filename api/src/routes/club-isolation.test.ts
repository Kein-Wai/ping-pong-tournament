import { describe, it, expect, vi, beforeAll, beforeEach } from 'vitest';
import request from 'supertest';
import { prismaMock } from '../testing/prisma-mock';
import { bearer, useTestJwtSecret, CLUB_1, type IdentityName } from '../testing/auth';
import { currentSeasonFixture } from '../testing/fixtures';

// Solo se mockea la base de datos: los guardas de autenticacion son los reales.
vi.mock('../db', async () => ({
  default: (await import('../testing/prisma-mock')).prismaMock.client,
}));

const SCHEDULE_ID = '123e4567-e89b-42d3-a456-426614174000';
const PLAYER_A = '223e4567-e89b-42d3-a456-426614174000';
const PLAYER_B = '323e4567-e89b-42d3-a456-426614174000';
let app: Awaited<typeof import('../index')>['app'];

describe('Entrenamientos grupales y equipos: aislamiento entre clubes', () => {
  beforeAll(async () => {
    useTestJwtSecret();
    ({ app } = await import('../index'));
  });

  beforeEach(() => {
    prismaMock.reset();
    prismaMock.client.season.findFirst.mockResolvedValue(currentSeasonFixture());
  });

  describe('GET /api/general-trainings', () => {
    beforeEach(() => {
      prismaMock.client.generalTraining.findMany.mockResolvedValue([{ id: 'gt-1' }]);
    });

    it('un usuario sin club no recibe los entrenamientos de todos los clubes', async () => {
      const response = await request(app).get('/api/general-trainings').set(bearer('freePlayer'));

      expect(response.status).toBe(200);
      expect(response.body.data).toEqual([]);
      expect(prismaMock.client.generalTraining.findMany).not.toHaveBeenCalled();
    });

    it('un jugador del club recibe solo los de su club', async () => {
      await request(app).get('/api/general-trainings').set(bearer('playerClub1'));

      expect(prismaMock.client.generalTraining.findMany.mock.calls[0][0].where).toEqual({
        clubId: CLUB_1,
      });
    });
  });

  describe('POST /api/general-trainings', () => {
    const body = {
      scheduleId: SCHEDULE_ID,
      startDate: '2030-06-03T00:00:00.000Z',
      endDate: '2030-06-09T00:00:00.000Z',
      skillsToTrain: { servicio: true },
    };

    beforeEach(() => {
      prismaMock.client.generalTrainingSchedule.findUnique.mockResolvedValue({
        id: SCHEDULE_ID,
        clubId: CLUB_1,
        daysOfWeek: [0, 1, 2, 3, 4, 5, 6],
      });
      prismaMock.client.skillUpdateTemplate.create.mockResolvedValue({ id: 'tpl-1' });
      prismaMock.client.generalTraining.createMany.mockResolvedValue({ count: 7 });
    });

    it('un AdminClub no puede usar el horario de otro club', async () => {
      const response = await request(app)
        .post('/api/general-trainings')
        .set(bearer('adminClub2'))
        .send(body);

      expect(response.status).toBe(404);
      expect(prismaMock.writes()).toEqual([]);
    });

    it('el AdminClub del club sí puede', async () => {
      const response = await request(app)
        .post('/api/general-trainings')
        .set(bearer('adminClub1'))
        .send(body);

      expect(response.status).toBe(201);
      expect(prismaMock.writes()).toContain('generalTraining.createMany');
    });
  });

  describe('PUT /api/teams/:id/players', () => {
    const put = (identity: IdentityName, playerIds: string[]) =>
      request(app).put('/api/teams/team-1/players').set(bearer(identity)).send({ playerIds });

    beforeEach(() => {
      prismaMock.client.team.findUnique.mockResolvedValue({ id: 'team-1', clubId: CLUB_1 });
      prismaMock.client.team.update.mockResolvedValue({
        id: 'team-1',
        level: 'Intermedio',
        players: [],
      });
    });

    it('rechaza jugadores que no son del club del equipo', async () => {
      // La consulta filtra por club: solo uno de los dos jugadores pertenece a él.
      prismaMock.client.user.findMany.mockResolvedValue([{ level: 'Intermedio' }]);

      const response = await put('adminClub1', [PLAYER_A, PLAYER_B]);

      expect(response.status).toBe(400);
      expect(prismaMock.writes()).toEqual([]);
      expect(prismaMock.client.user.findMany.mock.calls[0][0].where).toMatchObject({
        clubId: CLUB_1,
      });
    });

    it('acepta una plantilla formada solo por jugadores del club', async () => {
      prismaMock.client.user.findMany.mockResolvedValue([
        { level: 'Intermedio' },
        { level: 'Avanzado' },
      ]);

      const response = await put('adminClub1', [PLAYER_A, PLAYER_B]);

      expect(response.status).toBe(200);
      expect(prismaMock.writes()).toContain('team.update');
    });
  });

  describe('POST /api/teams/matches/:matchId/availability', () => {
    const confirm = (identity: IdentityName) =>
      request(app).post('/api/teams/matches/tm-1/availability').set(bearer(identity));

    beforeEach(() => {
      prismaMock.client.teamMatch.findUnique.mockResolvedValue({
        id: 'tm-1',
        team: { clubId: CLUB_1, players: [{ id: 'player-1' }] },
      });
      prismaMock.client.teamMatchAvailability.findUnique.mockResolvedValue(null);
      prismaMock.client.teamMatchAvailability.create.mockResolvedValue({});
    });

    it.each<IdentityName>(['playerClub2', 'freePlayer'])(
      'deniega a %s, que no es del equipo',
      async (identity) => {
        const response = await confirm(identity);

        expect(response.status).toBe(403);
        expect(prismaMock.writes()).toEqual([]);
      },
    );

    it('permite a un jugador del equipo', async () => {
      const response = await confirm('playerClub1');

      expect(response.status).toBe(200);
      expect(prismaMock.writes()).toContain('teamMatchAvailability.create');
    });

    it('si el partido no existe responde 404', async () => {
      prismaMock.client.teamMatch.findUnique.mockResolvedValue(null);

      const response = await confirm('playerClub1');

      expect(response.status).toBe(404);
    });
  });
});

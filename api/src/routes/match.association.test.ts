import { describe, it, expect, vi, beforeAll, beforeEach } from 'vitest';
import request from 'supertest';
import { prismaMock } from '../testing/prisma-mock';
import { bearer, useTestJwtSecret, CLUB_1 } from '../testing/auth';
import { currentSeasonFixture } from '../testing/fixtures';

// Solo se mockea la base de datos: los guardas de autenticacion son los reales.
vi.mock('../db', async () => ({
  default: (await import('../testing/prisma-mock')).prismaMock.client,
}));
// Esta bateria prueba a que torneo, grupo y cuadro puede asociarse un partido;
// los motores que recalculan clasificaciones tienen sus propios tests.
vi.mock('../utils/stats', () => ({ handleMatchStatsUpdate: vi.fn() }));
vi.mock('../utils/match-processor', () => ({ processMatchResult: vi.fn() }));
vi.mock('../utils/standings', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../utils/standings')>()),
  updateGroupStandings: vi.fn(),
}));

const MATCH_ID = '123e4567-e89b-42d3-a456-426614174000';
const TOURNAMENT_ID = '223e4567-e89b-42d3-a456-426614174000';
const OTHER_TOURNAMENT_ID = '523e4567-e89b-42d3-a456-426614174000';
const GROUP_ID = '623e4567-e89b-42d3-a456-426614174000';
const OTHER_GROUP_ID = '723e4567-e89b-42d3-a456-426614174000';
const KNOCKOUT_ID = '823e4567-e89b-42d3-a456-426614174000';
const PLAYER_ONE = '323e4567-e89b-42d3-a456-426614174000';
const PLAYER_TWO = '423e4567-e89b-42d3-a456-426614174000';

let app: Awaited<typeof import('../index')>['app'];

describe('Partidos (/api/matches): torneo, grupo y cuadro a los que pertenecen', () => {
  beforeAll(async () => {
    useTestJwtSecret();
    ({ app } = await import('../index'));
  });

  beforeEach(() => {
    prismaMock.reset();
    prismaMock.client.season.findFirst.mockResolvedValue(currentSeasonFixture());
    prismaMock.client.$transaction.mockImplementation(async (callback: (tx: unknown) => unknown) =>
      callback(prismaMock.client),
    );
  });

  describe('PUT /:id', () => {
    const existing = {
      id: MATCH_ID,
      status: 'Programado',
      tournamentId: TOURNAMENT_ID,
      groupId: GROUP_ID,
      knockoutId: null,
      leagueId: null,
      walkover: false,
      playerOneId: PLAYER_ONE,
      playerTwoId: PLAYER_TWO,
      dateStart: new Date('2026-07-10T18:00:00Z'),
      tournament: { clubId: CLUB_1 },
      league: null,
      playerOne: { clubId: CLUB_1 },
    };
    const score = { setOnePlayerOne: 11, setOnePlayerTwo: 5, setTwoPlayerOne: 11, setTwoPlayerTwo: 7 };

    beforeEach(() => {
      prismaMock.client.match.findUnique.mockResolvedValue(existing);
      prismaMock.client.match.update.mockResolvedValue(existing);
    });

    it.each([
      ['tournamentId', { tournamentId: OTHER_TOURNAMENT_ID }],
      ['groupId', { groupId: OTHER_GROUP_ID }],
      ['knockoutId', { knockoutId: KNOCKOUT_ID }],
    ])('no permite cambiar el %s de un partido', async (_field, change) => {
      const response = await request(app)
        .put(`/api/matches/${MATCH_ID}`)
        .set(bearer('adminClub1'))
        .send({ ...score, ...change });

      expect(response.status).toBe(400);
      expect(prismaMock.writes()).toEqual([]);
    });

    it('acepta el cuerpo que repite el torneo y el grupo actuales', async () => {
      const response = await request(app)
        .put(`/api/matches/${MATCH_ID}`)
        .set(bearer('adminClub1'))
        .send({ ...score, tournamentId: TOURNAMENT_ID, groupId: GROUP_ID });

      expect(response.status).toBe(200);
      expect(prismaMock.writes()).toContain('match.update');
    });

    it('sigue guardando un marcador sin tocar la asociación', async () => {
      const response = await request(app)
        .put(`/api/matches/${MATCH_ID}`)
        .set(bearer('adminClub1'))
        .send(score);

      expect(response.status).toBe(200);
    });
  });

  describe('POST /', () => {
    const base = { playerOneId: PLAYER_ONE, playerTwoId: PLAYER_TWO, status: 'Programado' };

    beforeEach(() => {
      prismaMock.client.tournament.findUnique.mockResolvedValue({ id: TOURNAMENT_ID, clubId: CLUB_1 });
      prismaMock.client.match.create.mockResolvedValue({ id: MATCH_ID });
    });

    it('acepta un grupo que pertenece al torneo del partido', async () => {
      prismaMock.client.tournamentGroup.findUnique.mockResolvedValue({ tournamentId: TOURNAMENT_ID });

      const response = await request(app)
        .post('/api/matches')
        .set(bearer('adminClub1'))
        .send({ ...base, tournamentId: TOURNAMENT_ID, groupId: GROUP_ID });

      expect(response.status).toBe(201);
    });

    it('rechaza un grupo que pertenece a otro torneo', async () => {
      prismaMock.client.tournamentGroup.findUnique.mockResolvedValue({ tournamentId: OTHER_TOURNAMENT_ID });

      const response = await request(app)
        .post('/api/matches')
        .set(bearer('adminClub1'))
        .send({ ...base, tournamentId: TOURNAMENT_ID, groupId: OTHER_GROUP_ID });

      expect(response.status).toBe(400);
      expect(prismaMock.writes()).toEqual([]);
    });

    it('rechaza un grupo que no existe', async () => {
      prismaMock.client.tournamentGroup.findUnique.mockResolvedValue(null);

      const response = await request(app)
        .post('/api/matches')
        .set(bearer('adminClub1'))
        .send({ ...base, tournamentId: TOURNAMENT_ID, groupId: GROUP_ID });

      expect(response.status).toBe(400);
      expect(prismaMock.writes()).toEqual([]);
    });

    it('rechaza un cuadro que pertenece a otro torneo', async () => {
      prismaMock.client.tournamentKnockout.findUnique.mockResolvedValue({ tournamentId: OTHER_TOURNAMENT_ID });

      const response = await request(app)
        .post('/api/matches')
        .set(bearer('adminClub1'))
        .send({ ...base, tournamentId: TOURNAMENT_ID, knockoutId: KNOCKOUT_ID });

      expect(response.status).toBe(400);
      expect(prismaMock.writes()).toEqual([]);
    });

    it('rechaza un grupo o un cuadro sin torneo', async () => {
      const withGroup = await request(app)
        .post('/api/matches')
        .set(bearer('adminClub1'))
        .send({ ...base, groupId: GROUP_ID });
      const withKnockout = await request(app)
        .post('/api/matches')
        .set(bearer('adminClub1'))
        .send({ ...base, knockoutId: KNOCKOUT_ID });

      expect(withGroup.status).toBe(400);
      expect(withKnockout.status).toBe(400);
      expect(prismaMock.writes()).toEqual([]);
    });
  });
});

import { describe, it, expect, vi, beforeAll, beforeEach } from 'vitest';
import request from 'supertest';
import { prismaMock } from '../testing/prisma-mock';
import { bearer, useTestJwtSecret, CLUB_1, CLUB_2, type IdentityName } from '../testing/auth';
import { currentSeasonFixture } from '../testing/fixtures';

// Solo se mockea la base de datos: los guardas de autenticacion son los reales.
vi.mock('../db', async () => ({
  default: (await import('../testing/prisma-mock')).prismaMock.client,
}));
// Esta bateria prueba las reglas de partidos de liga; los motores de estadisticas tienen sus propios tests.
vi.mock('../utils/stats', () => ({ handleMatchStatsUpdate: vi.fn() }));
vi.mock('../utils/match-processor', () => ({ processMatchResult: vi.fn() }));

const MATCH_ID = '123e4567-e89b-42d3-a456-426614174000';
const LEAGUE_ID = '223e4567-e89b-42d3-a456-426614174000';
const PLAYER_ONE = '323e4567-e89b-42d3-a456-426614174000';
const PLAYER_TWO = '423e4567-e89b-42d3-a456-426614174000';

let app: Awaited<typeof import('../index')>['app'];

const leagueMatch = (league: Record<string, unknown> = {}, overrides: Record<string, unknown> = {}) => ({
  id: MATCH_ID,
  status: 'Programado',
  leagueId: LEAGUE_ID,
  tournamentId: null,
  playerOneId: PLAYER_ONE,
  playerTwoId: PLAYER_TWO,
  dateStart: new Date('2026-11-01T00:00:00Z'),
  league: { clubId: CLUB_1, status: 'Iniciado', ...league },
  playerOne: { clubId: CLUB_1 },
  tournament: null,
  ...overrides,
});

const result = {
  status: 'Completado',
  setOnePlayerOne: 11,
  setOnePlayerTwo: 5,
  setTwoPlayerOne: 11,
  setTwoPlayerTwo: 7,
};

describe('Partidos de liga (/api/matches)', () => {
  beforeAll(async () => {
    useTestJwtSecret();
    ({ app } = await import('../index'));
  });

  beforeEach(() => {
    prismaMock.reset();
    prismaMock.client.season.findFirst.mockResolvedValue(currentSeasonFixture());
    prismaMock.client.match.findUnique.mockResolvedValue(leagueMatch());
    prismaMock.client.match.update.mockResolvedValue(leagueMatch());
    prismaMock.client.$transaction.mockImplementation(async (callback: (tx: unknown) => unknown) =>
      callback(prismaMock.client),
    );
  });

  describe('PUT /:id (registrar el resultado)', () => {
    it('el admin del club registra el resultado de un partido de una liga Iniciada', async () => {
      const response = await request(app).put(`/api/matches/${MATCH_ID}`).set(bearer('adminClub1')).send(result);

      expect(response.status).toBe(200);
      expect(prismaMock.writes()).toContain('match.update');
    });

    it.each<IdentityName>(['adminClub2', 'playerClub1'])('deniega a %s', async (identity) => {
      const response = await request(app).put(`/api/matches/${MATCH_ID}`).set(bearer(identity)).send(result);

      expect(response.status).toBe(403);
      expect(prismaMock.writes()).toEqual([]);
    });

    it('el club lo decide la liga, no el primer jugador', async () => {
      prismaMock.client.match.findUnique.mockResolvedValue(
        leagueMatch({ clubId: CLUB_2 }, { playerOne: { clubId: CLUB_1 } }),
      );

      const response = await request(app).put(`/api/matches/${MATCH_ID}`).set(bearer('adminClub1')).send(result);

      expect(response.status).toBe(403);
      expect(prismaMock.writes()).toEqual([]);
    });

    it.each(['Programado', 'Completado', 'Cancelado'])(
      'no cambia resultados cuando la liga está %s',
      async (status) => {
        prismaMock.client.match.findUnique.mockResolvedValue(leagueMatch({ status }));

        const response = await request(app).put(`/api/matches/${MATCH_ID}`).set(bearer('adminClub1')).send(result);

        expect(response.status).toBe(400);
        expect(prismaMock.writes()).toEqual([]);
      },
    );
  });

  describe('PUT /:id: lo que no se puede cambiar', () => {
    it('no reescribe un partido W.O.', async () => {
      prismaMock.client.match.findUnique.mockResolvedValue(leagueMatch({}, { walkover: true, status: 'Completado' }));

      const response = await request(app).put(`/api/matches/${MATCH_ID}`).set(bearer('adminClub1')).send(result);

      expect(response.status).toBe(400);
      expect(prismaMock.writes()).toEqual([]);
    });

    it('no mueve un partido a otra liga', async () => {
      const response = await request(app)
        .put(`/api/matches/${MATCH_ID}`)
        .set(bearer('adminClub1'))
        .send({ ...result, leagueId: '923e4567-e89b-42d3-a456-426614174000' });

      expect(response.status).toBe(400);
      expect(prismaMock.writes()).toEqual([]);
    });

    it('no cambia los jugadores de un partido de liga', async () => {
      const response = await request(app)
        .put(`/api/matches/${MATCH_ID}`)
        .set(bearer('adminClub1'))
        .send({ ...result, playerOneId: '823e4567-e89b-42d3-a456-426614174000' });

      expect(response.status).toBe(400);
      expect(prismaMock.writes()).toEqual([]);
    });

    it('acepta el cuerpo que manda la pantalla, con los mismos jugadores y la misma liga', async () => {
      const response = await request(app)
        .put(`/api/matches/${MATCH_ID}`)
        .set(bearer('adminClub1'))
        .send({ ...result, leagueId: LEAGUE_ID, playerOneId: PLAYER_ONE, playerTwoId: PLAYER_TWO });

      expect(response.status).toBe(200);
    });
  });

  describe('POST / (crear partido)', () => {
    it('no permite crear a mano un partido de liga: se generan al iniciarla', async () => {
      const response = await request(app).post('/api/matches').set(bearer('adminClub1')).send({
        playerOneId: PLAYER_ONE,
        playerTwoId: PLAYER_TWO,
        dateStart: '2026-11-01T00:00:00.000Z',
        leagueId: LEAGUE_ID,
        ...result,
      });

      expect(response.status).toBe(400);
      expect(prismaMock.writes()).toEqual([]);
    });
  });
});

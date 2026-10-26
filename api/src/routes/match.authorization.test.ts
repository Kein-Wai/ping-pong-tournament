import { describe, it, expect, vi, beforeAll, beforeEach } from 'vitest';
import request from 'supertest';
import { prismaMock } from '../testing/prisma-mock';
import { bearer, useTestJwtSecret, CLUB_1, type IdentityName } from '../testing/auth';
import { currentSeasonFixture } from '../testing/fixtures';

// Solo se mockea la base de datos: los guardas de autenticacion son los reales.
vi.mock('../db', async () => ({
  default: (await import('../testing/prisma-mock')).prismaMock.client,
}));
// Esta bateria prueba QUIEN puede escribir un partido; los motores que recalculan
// estadisticas y clasificaciones tienen sus propios tests.
vi.mock('../utils/stats', () => ({ handleMatchStatsUpdate: vi.fn() }));
vi.mock('../utils/match-processor', () => ({ processMatchResult: vi.fn() }));
vi.mock('../utils/standings', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../utils/standings')>()),
  updateGroupStandings: vi.fn(),
}));

const MATCH_ID = '123e4567-e89b-42d3-a456-426614174000';
const TOURNAMENT_ID = '223e4567-e89b-42d3-a456-426614174000';
const PLAYER_ONE = '323e4567-e89b-42d3-a456-426614174000';
const PLAYER_TWO = '423e4567-e89b-42d3-a456-426614174000';

let app: Awaited<typeof import('../index')>['app'];

const existingMatch = (overrides: Record<string, unknown> = {}) => ({
  id: MATCH_ID,
  status: 'Programado',
  tournamentId: TOURNAMENT_ID,
  playerOneId: PLAYER_ONE,
  playerTwoId: PLAYER_TWO,
  dateStart: new Date('2026-07-10T18:00:00Z'),
  tournament: { clubId: CLUB_1 },
  playerOne: { clubId: CLUB_1 },
  ...overrides,
});

describe('Escritura de partidos (/api/matches): quien puede hacerlo', () => {
  beforeAll(async () => {
    useTestJwtSecret();
    ({ app } = await import('../index'));
  });

  beforeEach(() => {
    prismaMock.reset();
    prismaMock.client.season.findFirst.mockResolvedValue(currentSeasonFixture());
  });

  describe('POST /api/matches', () => {
    const body = {
      playerOneId: PLAYER_ONE,
      playerTwoId: PLAYER_TWO,
      tournamentId: TOURNAMENT_ID,
      status: 'Programado',
    };

    beforeEach(() => {
      prismaMock.client.tournament.findUnique.mockResolvedValue({
        id: TOURNAMENT_ID,
        clubId: CLUB_1,
      });
      prismaMock.client.match.create.mockResolvedValue({ id: MATCH_ID, ...body });
    });

    it.each<IdentityName>(['playerClub1', 'freePlayer', 'adminClub2'])(
      'deniega a %s y no escribe nada',
      async (identity) => {
        const response = await request(app).post('/api/matches').set(bearer(identity)).send(body);

        expect(response.status).toBe(403);
        expect(prismaMock.writes()).toEqual([]);
      },
    );

    it.each<IdentityName>(['adminClub1', 'superAdmin'])('permite a %s', async (identity) => {
      const response = await request(app).post('/api/matches').set(bearer(identity)).send(body);

      expect(response.status).toBe(201);
      expect(prismaMock.writes()).toContain('match.create');
    });

    it('sin torneo, el partido pertenece al club de los jugadores', async () => {
      prismaMock.client.user.findUnique.mockResolvedValue({ id: PLAYER_ONE, clubId: CLUB_1 });
      const freeMatch = { playerOneId: PLAYER_ONE, playerTwoId: PLAYER_TWO, status: 'Programado' };

      const denied = await request(app)
        .post('/api/matches')
        .set(bearer('adminClub2'))
        .send(freeMatch);
      const allowed = await request(app)
        .post('/api/matches')
        .set(bearer('adminClub1'))
        .send(freeMatch);

      expect(denied.status).toBe(403);
      expect(allowed.status).toBe(201);
    });
  });

  describe('PUT /api/matches/:id', () => {
    const body = { status: 'Programado' };

    beforeEach(() => {
      prismaMock.client.match.findUnique.mockResolvedValue(existingMatch());
      prismaMock.client.match.update.mockResolvedValue(existingMatch());
    });

    it.each<IdentityName>(['playerClub1', 'freePlayer', 'adminClub2'])(
      'deniega a %s y no escribe nada',
      async (identity) => {
        const response = await request(app)
          .put(`/api/matches/${MATCH_ID}`)
          .set(bearer(identity))
          .send(body);

        expect(response.status).toBe(403);
        expect(prismaMock.writes()).toEqual([]);
      },
    );

    it.each<IdentityName>(['adminClub1', 'superAdmin'])('permite a %s', async (identity) => {
      const response = await request(app)
        .put(`/api/matches/${MATCH_ID}`)
        .set(bearer(identity))
        .send(body);

      expect(response.status).toBe(200);
      expect(prismaMock.writes()).toContain('match.update');
    });

    it('un partido sin torneo pertenece al club de sus jugadores', async () => {
      prismaMock.client.match.findUnique.mockResolvedValue(
        existingMatch({ tournamentId: null, tournament: null }),
      );

      const denied = await request(app)
        .put(`/api/matches/${MATCH_ID}`)
        .set(bearer('adminClub2'))
        .send(body);
      const allowed = await request(app)
        .put(`/api/matches/${MATCH_ID}`)
        .set(bearer('adminClub1'))
        .send(body);

      expect(denied.status).toBe(403);
      expect(allowed.status).toBe(200);
    });

    it('un partido entre jugadores libres solo lo toca el SuperAdmin', async () => {
      prismaMock.client.match.findUnique.mockResolvedValue(
        existingMatch({
          tournamentId: null,
          tournament: null,
          playerOne: { clubId: null },
        }),
      );

      const admin = await request(app)
        .put(`/api/matches/${MATCH_ID}`)
        .set(bearer('adminClub1'))
        .send(body);
      const superAdmin = await request(app)
        .put(`/api/matches/${MATCH_ID}`)
        .set(bearer('superAdmin'))
        .send(body);

      expect(admin.status).toBe(403);
      expect(superAdmin.status).toBe(200);
    });

    it('si el partido no existe responde 404', async () => {
      prismaMock.client.match.findUnique.mockResolvedValue(null);

      const response = await request(app)
        .put(`/api/matches/${MATCH_ID}`)
        .set(bearer('adminClub1'))
        .send(body);

      expect(response.status).toBe(404);
    });
  });
});

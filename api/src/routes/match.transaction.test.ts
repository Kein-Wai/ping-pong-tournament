import { describe, it, expect, vi, beforeAll, beforeEach } from 'vitest';
import request from 'supertest';
import { prismaMock } from '../testing/prisma-mock';
import { bearer, useTestJwtSecret, CLUB_1 } from '../testing/auth';
import { currentSeasonFixture } from '../testing/fixtures';
import { handleMatchStatsUpdate } from '../utils/stats';
import { processMatchResult } from '../utils/match-processor';
import { updateGroupStandings } from '../utils/standings';

// Solo se mockea la base de datos; los motores se sustituyen por espías para ver
// con qué cliente (el de la transacción o el global) los llama la ruta.
vi.mock('../db', async () => ({
  default: (await import('../testing/prisma-mock')).prismaMock.client,
}));
vi.mock('../utils/stats', () => ({ handleMatchStatsUpdate: vi.fn() }));
vi.mock('../utils/match-processor', () => ({ processMatchResult: vi.fn() }));
vi.mock('../utils/standings', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../utils/standings')>()),
  updateGroupStandings: vi.fn(),
}));

const MATCH_ID = '123e4567-e89b-42d3-a456-426614174000';
const TOURNAMENT_ID = '223e4567-e89b-42d3-a456-426614174000';
const GROUP_ID = '523e4567-e89b-42d3-a456-426614174000';
const PLAYER_ONE = '323e4567-e89b-42d3-a456-426614174000';
const PLAYER_TWO = '423e4567-e89b-42d3-a456-426614174000';

let app: Awaited<typeof import('../index')>['app'];

/** Cliente de la transacción: distinto del global para saber quién escribe dentro. */
const tx = { match: { create: vi.fn(), update: vi.fn() } };

describe('Resultado de un partido: el guardado y sus efectos son atómicos', () => {
  beforeAll(async () => {
    useTestJwtSecret();
    ({ app } = await import('../index'));
  });

  beforeEach(() => {
    vi.clearAllMocks();
    prismaMock.reset();
    prismaMock.client.season.findFirst.mockResolvedValue(currentSeasonFixture());
    prismaMock.client.$transaction.mockImplementation(async (callback: (client: unknown) => unknown) =>
      callback(tx),
    );
  });

  describe('POST /api/matches', () => {
    const body = { playerOneId: PLAYER_ONE, playerTwoId: PLAYER_TWO, tournamentId: TOURNAMENT_ID, status: 'Programado' };
    const created = { id: MATCH_ID, ...body };

    beforeEach(() => {
      prismaMock.client.tournament.findUnique.mockResolvedValue({ id: TOURNAMENT_ID, clubId: CLUB_1 });
      tx.match.create.mockResolvedValue(created);
    });

    it('crea el partido y actualiza las estadísticas dentro de la misma transacción', async () => {
      const response = await request(app).post('/api/matches').set(bearer('adminClub1')).send(body);

      expect(response.status).toBe(201);
      expect(tx.match.create).toHaveBeenCalledTimes(1);
      expect(prismaMock.client.match.create).not.toHaveBeenCalled();
      expect(handleMatchStatsUpdate).toHaveBeenCalledWith(tx, null, created);
    });

    it('avanza el torneo (cuadro, cierre) fuera de la transacción, ya confirmado el partido', async () => {
      await request(app).post('/api/matches').set(bearer('adminClub1')).send(body);

      expect(vi.mocked(processMatchResult).mock.calls[0][0]).toBe(prismaMock.client);
      expect(vi.mocked(processMatchResult).mock.calls[0][1]).toBe(created);
    });

    it('si falla el cálculo de estadísticas responde 500 y no avanza el torneo', async () => {
      vi.mocked(handleMatchStatsUpdate).mockRejectedValueOnce(new Error('fallo de stats'));
      vi.spyOn(console, 'error').mockImplementation(() => undefined);

      const response = await request(app).post('/api/matches').set(bearer('adminClub1')).send(body);

      expect(response.status).toBe(500);
      expect(processMatchResult).not.toHaveBeenCalled();
    });
  });

  describe('PUT /api/matches/:id', () => {
    const existing = {
      id: MATCH_ID,
      status: 'Completado',
      tournamentId: TOURNAMENT_ID,
      groupId: GROUP_ID,
      playerOneId: PLAYER_ONE,
      playerTwoId: PLAYER_TWO,
      dateStart: new Date('2026-07-10T18:00:00Z'),
      tournament: { clubId: CLUB_1 },
      playerOne: { clubId: CLUB_1 },
    };
    const updated = { ...existing, status: 'Completado', groupId: GROUP_ID };

    beforeEach(() => {
      prismaMock.client.match.findUnique.mockResolvedValue(existing);
      tx.match.update.mockResolvedValue(updated);
    });

    it('actualiza el partido, revierte/aplica estadísticas y recalcula el grupo en una transacción', async () => {
      const response = await request(app)
        .put(`/api/matches/${MATCH_ID}`)
        .set(bearer('adminClub1'))
        .send({ status: 'Completado' });

      expect(response.status).toBe(200);
      expect(tx.match.update).toHaveBeenCalledTimes(1);
      expect(prismaMock.client.match.update).not.toHaveBeenCalled();
      expect(handleMatchStatsUpdate).toHaveBeenCalledWith(tx, existing, updated);
      expect(updateGroupStandings).toHaveBeenCalledWith(tx, GROUP_ID);
      expect(vi.mocked(processMatchResult).mock.calls[0][0]).toBe(prismaMock.client);
      expect(vi.mocked(processMatchResult).mock.calls[0][1]).toBe(updated);
    });

    it('si falla el recálculo del grupo responde 500 y no avanza el torneo', async () => {
      vi.mocked(updateGroupStandings).mockRejectedValueOnce(new Error('fallo de clasificación'));
      vi.spyOn(console, 'error').mockImplementation(() => undefined);

      const response = await request(app)
        .put(`/api/matches/${MATCH_ID}`)
        .set(bearer('adminClub1'))
        .send({ status: 'Completado' });

      expect(response.status).toBe(500);
      expect(processMatchResult).not.toHaveBeenCalled();
    });
  });
});

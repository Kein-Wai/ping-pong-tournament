import { describe, it, expect, vi, beforeAll, beforeEach } from 'vitest';
import request from 'supertest';
import { prismaMock } from '../testing/prisma-mock';
import { bearer, useTestJwtSecret, type IdentityName } from '../testing/auth';
import { currentSeasonFixture } from '../testing/fixtures';

// Solo se mockea la base de datos: los guardas de autenticacion son los reales.
vi.mock('../db', async () => ({
  default: (await import('../testing/prisma-mock')).prismaMock.client,
}));

// El propietario de los partidos manuales es `playerClub1` (id player-1).
const OWNER_ID = 'player-1';
const OWNER: IdentityName = 'playerClub1';
const STRANGERS: IdentityName[] = ['playerClub2', 'freePlayer', 'adminClub1', 'superAdmin'];
let app: Awaited<typeof import('../index')>['app'];

describe('Partidos manuales (/api/manual-matches): solo su propietario los modifica', () => {
  beforeAll(async () => {
    useTestJwtSecret();
    ({ app } = await import('../index'));
  });

  beforeEach(() => {
    prismaMock.reset();
    prismaMock.client.season.findFirst.mockResolvedValue(currentSeasonFixture());
    prismaMock.client.manualMatch.findUnique.mockResolvedValue({ id: 'mm1', userId: OWNER_ID });
    prismaMock.client.manualMatch.update.mockResolvedValue({ id: 'mm1', userId: OWNER_ID });
    prismaMock.client.pointAnalysis.findUnique.mockResolvedValue({
      id: 'pt1',
      manualMatchId: 'mm1',
      match: { userId: OWNER_ID },
    });
    prismaMock.client.pointAnalysis.create.mockResolvedValue({ id: 'pt-new' });
    prismaMock.client.pointAnalysis.delete.mockResolvedValue({ id: 'pt1' });
    prismaMock.client.stats.upsert.mockResolvedValue({});
    prismaMock.client.playerSkillUpdate.create.mockResolvedValue({});
  });

  describe.each([
    {
      name: 'PUT /:id',
      call: (identity: IdentityName) =>
        request(app)
          .put('/api/manual-matches/mm1')
          .set(bearer(identity))
          .send({ opponentName: 'Rival' }),
      write: 'manualMatch.update',
    },
    {
      name: 'POST /:id/points',
      call: (identity: IdentityName) =>
        request(app)
          .post('/api/manual-matches/mm1/points')
          .set(bearer(identity))
          .send({ setNumber: 1, pointOrder: 1, isWon: true }),
      write: 'pointAnalysis.create',
    },
    {
      name: 'DELETE /:id/points/:pointId',
      call: (identity: IdentityName) =>
        request(app).delete('/api/manual-matches/mm1/points/pt1').set(bearer(identity)),
      write: 'pointAnalysis.delete',
    },
    {
      name: 'PUT /:id/complete',
      call: (identity: IdentityName) =>
        request(app)
          .put('/api/manual-matches/mm1/complete')
          .set(bearer(identity))
          .send({ mySets: 3, opponentSets: 0 }),
      write: 'stats.upsert',
    },
  ])('$name', ({ call, write }) => {
    it('permite al propietario', async () => {
      const response = await call(OWNER);

      expect([200, 201]).toContain(response.status);
      expect(prismaMock.writes()).toContain(write);
    });

    it.each(STRANGERS)('deniega a %s y no escribe nada', async (identity) => {
      const response = await call(identity);

      expect(response.status).toBe(404);
      expect(prismaMock.writes()).toEqual([]);
    });

    it('si el partido no existe responde 404', async () => {
      prismaMock.client.manualMatch.findUnique.mockResolvedValue(null);
      prismaMock.client.pointAnalysis.findUnique.mockResolvedValue(null);

      const response = await call(OWNER);

      expect(response.status).toBe(404);
    });
  });
});

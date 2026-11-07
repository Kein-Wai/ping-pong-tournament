import { describe, it, expect, vi, beforeAll, beforeEach } from 'vitest';
import request from 'supertest';
import { prismaMock } from '../testing/prisma-mock';
import { bearer, sessionRowFor, useTestJwtSecret, type IdentityName } from '../testing/auth';
import { currentSeasonFixture } from '../testing/fixtures';

// Solo se mockea la base de datos: los guardas de autenticacion son los reales.
vi.mock('../db', async () => ({
  default: (await import('../testing/prisma-mock')).prismaMock.client,
}));

let app: Awaited<typeof import('../index')>['app'];

const payload = {
  location: 'Casa',
  matchType: 'Amistoso',
  format: 'Individual',
  opponentName: 'Rival Test',
};

// Un análisis de `player-1` (club-1) visto desde la base de datos.
const playerMatch = (
  ownerClubId: string | null = 'club-1',
  ownerClubStatus: string | null = 'Aprobado',
  ownerType = 'Player',
) => ({
  id: 'mm1',
  userId: 'player-1',
  coachId: 'admin-1',
  user: { clubId: ownerClubId, clubStatus: ownerClubStatus, userType: { name: ownerType } },
  points: [],
});

// Sesión de un AdminClub cuyo club sigue pendiente de aprobación.
const pendingClubSession = (id: string) => ({
  ...sessionRowFor(id),
  club: { status: 'Pendiente' },
});

// Lo que ve el AdminClub1 en el listado: sus análisis y los de jugadores aprobados de club-1.
const COACH_SCOPE = {
  OR: [
    { userId: 'admin-1' },
    { user: { clubId: 'club-1', clubStatus: 'Aprobado', userType: { name: 'Player' } } },
  ],
};

describe('Análisis de un jugador por su entrenador (/api/manual-matches)', () => {
  beforeAll(async () => {
    useTestJwtSecret();
    ({ app } = await import('../index'));
  });

  beforeEach(() => {
    prismaMock.reset();
    prismaMock.client.season.findFirst.mockResolvedValue(currentSeasonFixture());
    prismaMock.client.manualMatch.create.mockResolvedValue({ id: 'mm-new' });
    prismaMock.client.manualMatch.findUnique.mockResolvedValue(playerMatch());
    prismaMock.client.manualMatch.update.mockResolvedValue({ id: 'mm1' });
    prismaMock.client.user.findFirst.mockResolvedValue({ id: 'player-1' });
    prismaMock.client.pointAnalysis.create.mockResolvedValue({ id: 'pt-new' });
    prismaMock.client.stats.upsert.mockResolvedValue({});
    prismaMock.client.playerSkillUpdate.create.mockResolvedValue({});
  });

  describe('POST / con playerId', () => {
    const create = (identity: IdentityName, body: object = { ...payload, playerId: 'player-1' }) =>
      request(app).post('/api/manual-matches').set(bearer(identity)).send(body);

    it('crea el análisis a nombre del jugador y registra al entrenador', async () => {
      const response = await create('adminClub1');

      expect(response.status).toBe(201);
      expect(prismaMock.client.manualMatch.create).toHaveBeenCalledOnce();
      const { data } = prismaMock.client.manualMatch.create.mock.calls[0][0];
      expect(data).toMatchObject({ userId: 'player-1', coachId: 'admin-1' });
      expect(data).not.toHaveProperty('playerId');
    });

    it('solo busca jugadores aprobados del club del entrenador, tomado del token', async () => {
      await create('adminClub1');

      expect(prismaMock.client.user.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            id: 'player-1',
            clubId: 'club-1',
            clubStatus: 'Aprobado',
          }),
        }),
      );
    });

    it('responde 404 si el jugador no es de su club y no escribe nada', async () => {
      prismaMock.client.user.findFirst.mockResolvedValue(null);

      const response = await create('adminClub1');

      expect(response.status).toBe(404);
      expect(prismaMock.writes()).toEqual([]);
    });

    it.each<IdentityName>(['playerClub1', 'superAdmin', 'freePlayer'])(
      'responde 403 a %s y no escribe nada',
      async (identity) => {
        const response = await create(identity, { ...payload, playerId: 'player-2' });

        expect(response.status).toBe(403);
        expect(prismaMock.writes()).toEqual([]);
      },
    );

    it('responde 403 si el club del entrenador no está aprobado', async () => {
      prismaMock.client.user.findUniqueOrThrow.mockResolvedValue(pendingClubSession('admin-1'));

      const response = await create('adminClub1');

      expect(response.status).toBe(403);
      expect(prismaMock.writes()).toEqual([]);
    });

    it('sin playerId crea un análisis propio, sin entrenador', async () => {
      const response = await create('adminClub1', payload);

      expect(response.status).toBe(201);
      const { data } = prismaMock.client.manualMatch.create.mock.calls[0][0];
      expect(data).toMatchObject({ userId: 'admin-1' });
      expect(data.coachId).toBeUndefined();
      expect(prismaMock.client.user.findFirst).not.toHaveBeenCalled();
    });

    it('un jugador puede crear su propio análisis sin playerId', async () => {
      const response = await create('playerClub1', payload);

      expect(response.status).toBe(201);
      expect(prismaMock.client.manualMatch.create.mock.calls[0][0].data).toMatchObject({
        userId: 'player-1',
      });
    });
  });

  describe('acceso de los AdminClub al análisis de un jugador', () => {
    it('GET /:id lo devuelve al AdminClub del club del jugador', async () => {
      const response = await request(app).get('/api/manual-matches/mm1').set(bearer('adminClub1'));

      expect(response.status).toBe(200);
    });

    it('PUT /:id lo permite al AdminClub del club del jugador', async () => {
      const response = await request(app)
        .put('/api/manual-matches/mm1')
        .set(bearer('adminClub1'))
        .send({ opponentName: 'Otro' });

      expect(response.status).toBe(200);
      expect(prismaMock.writes()).toContain('manualMatch.update');
    });

    it('POST /:id/points lo permite al AdminClub del club del jugador', async () => {
      const response = await request(app)
        .post('/api/manual-matches/mm1/points')
        .set(bearer('adminClub1'))
        .send({ setNumber: 1, pointOrder: 1, isWon: true });

      expect(response.status).toBe(201);
    });

    it('DELETE /:id/points/:pointId lo permite al AdminClub del club del jugador', async () => {
      prismaMock.client.pointAnalysis.findUnique.mockResolvedValue({
        id: 'pt1',
        manualMatchId: 'mm1',
        match: {
          userId: 'player-1',
          user: { clubId: 'club-1', clubStatus: 'Aprobado', userType: { name: 'Player' } },
        },
      });
      prismaMock.client.pointAnalysis.delete.mockResolvedValue({ id: 'pt1' });

      const response = await request(app)
        .delete('/api/manual-matches/mm1/points/pt1')
        .set(bearer('adminClub1'));

      expect(response.status).toBe(200);
    });

    it('lo niega con 404 al AdminClub de otro club', async () => {
      const response = await request(app).get('/api/manual-matches/mm1').set(bearer('adminClub2'));

      expect(response.status).toBe(404);
    });

    it('lo niega con 404 al AdminClub si el jugador ya no está en ningún club', async () => {
      prismaMock.client.manualMatch.findUnique.mockResolvedValue(playerMatch(null));

      const response = await request(app).get('/api/manual-matches/mm1').set(bearer('adminClub1'));

      expect(response.status).toBe(404);
    });

    it('lo niega con 404 al AdminClub si el jugador aún está pendiente de aprobación', async () => {
      prismaMock.client.manualMatch.findUnique.mockResolvedValue(playerMatch('club-1', 'Pendiente'));

      const response = await request(app).get('/api/manual-matches/mm1').set(bearer('adminClub1'));

      expect(response.status).toBe(404);
    });

    it('no permite al AdminClub finalizar el análisis de un aspirante pendiente', async () => {
      prismaMock.client.manualMatch.findUnique.mockResolvedValue(playerMatch('club-1', 'Pendiente'));

      const response = await request(app)
        .put('/api/manual-matches/mm1/complete')
        .set(bearer('adminClub1'))
        .send({ mySets: 3, opponentSets: 1 });

      expect(response.status).toBe(404);
      expect(prismaMock.writes()).toEqual([]);
    });

    it('lo niega con 404 al AdminClub si el dueño es otro AdminClub del club', async () => {
      prismaMock.client.manualMatch.findUnique.mockResolvedValue(
        playerMatch('club-1', 'Aprobado', 'AdminClub'),
      );

      const response = await request(app).get('/api/manual-matches/mm1').set(bearer('adminClub1'));

      expect(response.status).toBe(404);
    });

    it('lo sigue permitiendo al jugador aunque aún esté pendiente de aprobación', async () => {
      prismaMock.client.manualMatch.findUnique.mockResolvedValue(playerMatch('club-1', 'Pendiente'));

      const response = await request(app).get('/api/manual-matches/mm1').set(bearer('playerClub1'));

      expect(response.status).toBe(200);
    });

    it('lo sigue permitiendo al jugador aunque ya no esté en ningún club', async () => {
      prismaMock.client.manualMatch.findUnique.mockResolvedValue(playerMatch(null));

      const response = await request(app).get('/api/manual-matches/mm1').set(bearer('playerClub1'));

      expect(response.status).toBe(200);
    });

    it('lo niega con 404 al AdminClub cuyo club no está aprobado', async () => {
      prismaMock.client.user.findUniqueOrThrow.mockResolvedValue(pendingClubSession('admin-1'));

      const response = await request(app).get('/api/manual-matches/mm1').set(bearer('adminClub1'));

      expect(response.status).toBe(404);
    });
  });

  describe('GET / (listado)', () => {
    const list = (identity: IdentityName, query = '') =>
      request(app).get(`/api/manual-matches${query}`).set(bearer(identity));
    const sentWhere = () => prismaMock.client.manualMatch.findMany.mock.calls[0][0].where;

    beforeEach(() => {
      prismaMock.client.manualMatch.findMany.mockResolvedValue([
        { id: 'mm1', userId: 'player-1', user: { id: 'player-1', name: 'Ana' } },
      ]);
    });

    it('el AdminClub recibe los suyos y los de los jugadores de su club, tomado del token', async () => {
      const response = await list('adminClub1');

      expect(response.status).toBe(200);
      expect(response.body.data).toHaveLength(1);
      expect(sentWhere()).toEqual(COACH_SCOPE);
    });

    it('el AdminClub puede filtrar por jugador sin ampliar su alcance', async () => {
      await list('adminClub1', '?playerId=player-1');

      expect(sentWhere()).toEqual({ AND: [COACH_SCOPE, { userId: 'player-1' }] });
    });

    it('incluye el jugador analizado de cada análisis', async () => {
      await list('adminClub1');

      const { include } = prismaMock.client.manualMatch.findMany.mock.calls[0][0];
      expect(include.user).toEqual({
        select: { id: true, name: true, surname: true, nickname: true },
      });
    });

    it('un jugador solo recibe los suyos', async () => {
      await list('playerClub1');

      expect(sentWhere()).toEqual({ userId: 'player-1' });
    });

    it('un jugador no amplía su alcance con ?playerId de otro jugador', async () => {
      await list('playerClub1', '?playerId=player-2');

      expect(sentWhere()).toEqual({ AND: [{ userId: 'player-1' }, { userId: 'player-2' }] });
    });

    it('un AdminClub con club pendiente solo recibe los suyos', async () => {
      prismaMock.client.user.findUniqueOrThrow.mockResolvedValue(pendingClubSession('admin-1'));

      await list('adminClub1');

      expect(sentWhere()).toEqual({ userId: 'admin-1' });
    });

    it('responde 400 si playerId viene vacío', async () => {
      const response = await list('adminClub1', '?playerId=');

      expect(response.status).toBe(400);
      expect(prismaMock.client.manualMatch.findMany).not.toHaveBeenCalled();
    });
  });

  describe('PUT /:id/complete hecho por el entrenador', () => {
    it('acredita estadísticas y habilidades al jugador, no al entrenador', async () => {
      prismaMock.client.manualMatch.updateMany.mockResolvedValue({ count: 1 });
      const response = await request(app)
        .put('/api/manual-matches/mm1/complete')
        .set(bearer('adminClub1'))
        .send({ mySets: 3, opponentSets: 1 });

      expect(response.status).toBe(200);
      expect(prismaMock.client.stats.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { userId_seasonId: { userId: 'player-1', seasonId: 'season-1' } },
        }),
      );
      expect(prismaMock.client.playerSkillUpdate.create).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ playerId: 'player-1' }) }),
      );
    });
  });
});

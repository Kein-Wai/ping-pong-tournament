import { describe, it, expect, vi, beforeAll, beforeEach } from 'vitest';
import request from 'supertest';
import { Prisma } from '@prisma/client';
import { prismaMock } from '../testing/prisma-mock';
import * as leagueLogic from '../utils/league';
import { bearer, useTestJwtSecret, CLUB_1, type IdentityName } from '../testing/auth';

// Solo se mockea la base de datos: los guardas de autenticacion son los reales.
vi.mock('../db', async () => ({
  default: (await import('../testing/prisma-mock')).prismaMock.client,
}));

// La logica de negocio de ligas tiene sus propios tests (utils/league.test.ts):
// aqui se prueba quien puede llamarla y con que datos.
vi.mock('../utils/league', () => ({
  startLeague: vi.fn(),
  cancelLeague: vi.fn(),
  finalizeLeague: vi.fn(),
  withdrawPlayer: vi.fn(),
  getLeagueStandings: vi.fn(),
}));

const LEAGUE_ID = '123e4567-e89b-42d3-a456-426614174000';
const PLAYER_A = '223e4567-e89b-42d3-a456-426614174001';
const PLAYER_B = '323e4567-e89b-42d3-a456-426614174002';
let app: Awaited<typeof import('../index')>['app'];

const league = (overrides: Record<string, unknown> = {}) => ({
  id: LEAGUE_ID,
  clubId: CLUB_1,
  name: 'Liga de invierno',
  status: 'Programado',
  ...overrides,
});

const uniqueViolation = () =>
  new Prisma.PrismaClientKnownRequestError('Unique constraint', {
    code: 'P2002',
    clientVersion: 'test',
  });

describe('Ligas (/api/leagues)', () => {
  beforeAll(async () => {
    useTestJwtSecret();
    ({ app } = await import('../index'));
  });

  beforeEach(() => {
    prismaMock.reset();
    prismaMock.client.league.findUnique.mockResolvedValue(league());
    prismaMock.client.season.findUnique.mockResolvedValue({ id: 'season-1' });
  });

  describe('GET / (listado)', () => {
    it('el SuperAdmin ve las ligas de todos los clubes', async () => {
      prismaMock.client.league.findMany.mockResolvedValue([league()]);

      const response = await request(app).get('/api/leagues').set(bearer('superAdmin'));

      expect(response.status).toBe(200);
      expect(prismaMock.client.league.findMany.mock.calls[0][0].where).toEqual({});
    });

    it.each<IdentityName>(['adminClub1', 'playerClub1'])(
      '%s solo ve las ligas de su club',
      async (identity) => {
        prismaMock.client.league.findMany.mockResolvedValue([league()]);

        const response = await request(app).get('/api/leagues').set(bearer(identity));

        expect(response.status).toBe(200);
        expect(prismaMock.client.league.findMany.mock.calls[0][0].where).toEqual({ clubId: CLUB_1 });
      },
    );

    it.each<IdentityName>(['freePlayer', 'adminWithoutClub'])(
      '%s, sin club, recibe una lista vacía sin consultar ligas',
      async (identity) => {
        const response = await request(app).get('/api/leagues').set(bearer(identity));

        expect(response.status).toBe(200);
        expect(response.body.data).toEqual([]);
        expect(prismaMock.client.league.findMany).not.toHaveBeenCalled();
      },
    );
  });

  describe('POST / (crear)', () => {
    const body = { name: 'Liga de invierno', dateStart: '2026-11-01T00:00:00.000Z', setsToWin: 3 };

    it.each<IdentityName>(['playerClub1', 'freePlayer'])('deniega a %s', async (identity) => {
      const response = await request(app).post('/api/leagues').set(bearer(identity)).send(body);

      expect(response.status).toBe(403);
      expect(prismaMock.writes()).toEqual([]);
    });

    it('un SuperAdmin sin club no puede crear ligas', async () => {
      const response = await request(app).post('/api/leagues').set(bearer('superAdmin')).send(body);

      expect(response.status).toBe(403);
      expect(prismaMock.writes()).toEqual([]);
    });

    it('el admin crea la liga en su club y en la temporada actual, ignorando el clubId del cuerpo', async () => {
      prismaMock.client.league.create.mockResolvedValue(league());

      const response = await request(app)
        .post('/api/leagues')
        .set(bearer('adminClub1'))
        .send({ ...body, clubId: 'club-ajeno' });

      expect(response.status).toBe(201);
      const { data } = prismaMock.client.league.create.mock.calls[0][0];
      expect(data.clubId).toBe(CLUB_1);
      expect(data.seasonId).toBe('season-1');
      expect(data.setsToWin).toBe(3);
    });

    it.each([
      {},
      { name: 'ab', dateStart: '2026-11-01T00:00:00.000Z' },
      { name: 'Liga válida', dateStart: 'no-es-fecha' },
      { name: 'Liga válida', dateStart: '2026-11-01T00:00:00.000Z', setsToWin: 5 },
      { name: 'Liga válida', dateStart: '2026-11-01T00:00:00.000Z', setsToWin: 0 },
    ])('rechaza con 400 un cuerpo inválido (%j)', async (invalid) => {
      const response = await request(app).post('/api/leagues').set(bearer('adminClub1')).send(invalid);

      expect(response.status).toBe(400);
      expect(prismaMock.writes()).toEqual([]);
    });

    it('responde 409 si el club ya tiene una liga con ese nombre', async () => {
      prismaMock.client.league.create.mockRejectedValue(uniqueViolation());

      const response = await request(app).post('/api/leagues').set(bearer('adminClub1')).send(body);

      expect(response.status).toBe(409);
    });
  });

  describe('GET /:id (detalle)', () => {
    const detail = () => ({
      ...league(),
      participants: [{ playerId: PLAYER_A, player: { id: PLAYER_A, name: 'Ana', password: 'secreto' } }],
    });

    it.each<IdentityName>(['adminClub1', 'playerClub1', 'superAdmin'])('permite a %s', async (identity) => {
      prismaMock.client.league.findUnique.mockResolvedValue(detail());

      const response = await request(app).get(`/api/leagues/${LEAGUE_ID}`).set(bearer(identity));

      expect(response.status).toBe(200);
      expect(response.body.data.participants).toHaveLength(1);
    });

    it('solo pide los campos públicos de los participantes, nunca la fila de usuario entera', async () => {
      prismaMock.client.league.findUnique.mockResolvedValue(detail());

      await request(app).get(`/api/leagues/${LEAGUE_ID}`).set(bearer('adminClub1'));

      const { include } = prismaMock.client.league.findUnique.mock.calls[0][0];
      expect(include.participants.include.player).toEqual({
        select: { id: true, name: true, surname: true, avatarUrl: true },
      });
    });

    it.each<IdentityName>(['playerClub2', 'adminClub2', 'freePlayer'])(
      'oculta la liga a %s con un 404',
      async (identity) => {
        prismaMock.client.league.findUnique.mockResolvedValue(detail());

        const response = await request(app).get(`/api/leagues/${LEAGUE_ID}`).set(bearer(identity));

        expect(response.status).toBe(404);
      },
    );

    it('responde 404 si la liga no existe', async () => {
      prismaMock.client.league.findUnique.mockResolvedValue(null);

      const response = await request(app).get(`/api/leagues/${LEAGUE_ID}`).set(bearer('adminClub1'));

      expect(response.status).toBe(404);
    });
  });

  describe('PUT /:id (editar)', () => {
    it('el admin del club edita una liga Programada', async () => {
      prismaMock.client.league.update.mockResolvedValue(league({ name: 'Nueva' }));

      const response = await request(app)
        .put(`/api/leagues/${LEAGUE_ID}`)
        .set(bearer('adminClub1'))
        .send({ name: 'Nueva liga', doubleRound: true });

      expect(response.status).toBe(200);
      expect(prismaMock.client.league.update.mock.calls[0][0].data).toEqual({
        name: 'Nueva liga',
        doubleRound: true,
      });
    });

    it.each<IdentityName>(['adminClub2', 'playerClub1'])('deniega a %s', async (identity) => {
      const response = await request(app)
        .put(`/api/leagues/${LEAGUE_ID}`)
        .set(bearer(identity))
        .send({ name: 'Nueva liga' });

      expect(response.status).toBe(403);
      expect(prismaMock.writes()).toEqual([]);
    });

    it('no permite editar una liga ya iniciada', async () => {
      prismaMock.client.league.findUnique.mockResolvedValue(league({ status: 'Iniciado' }));

      const response = await request(app)
        .put(`/api/leagues/${LEAGUE_ID}`)
        .set(bearer('adminClub1'))
        .send({ name: 'Nueva liga' });

      expect(response.status).toBe(400);
      expect(prismaMock.writes()).toEqual([]);
    });

    it('rechaza con 400 un cuerpo vacío', async () => {
      const response = await request(app)
        .put(`/api/leagues/${LEAGUE_ID}`)
        .set(bearer('adminClub1'))
        .send({});

      expect(response.status).toBe(400);
    });

    it('responde 409 si el nuevo nombre ya existe en el club', async () => {
      prismaMock.client.league.update.mockRejectedValue(uniqueViolation());

      const response = await request(app)
        .put(`/api/leagues/${LEAGUE_ID}`)
        .set(bearer('adminClub1'))
        .send({ name: 'Otra liga' });

      expect(response.status).toBe(409);
    });
  });

  describe('DELETE /:id (borrar)', () => {
    it('el admin del club borra una liga Programada', async () => {
      const response = await request(app).delete(`/api/leagues/${LEAGUE_ID}`).set(bearer('adminClub1'));

      expect(response.status).toBe(200);
      expect(prismaMock.writes()).toEqual(['league.delete']);
    });

    it.each(['Iniciado', 'Completado', 'Cancelado'])(
      'no permite borrar una liga %s',
      async (status) => {
        prismaMock.client.league.findUnique.mockResolvedValue(league({ status }));

        const response = await request(app)
          .delete(`/api/leagues/${LEAGUE_ID}`)
          .set(bearer('adminClub1'));

        expect(response.status).toBe(400);
        expect(prismaMock.writes()).toEqual([]);
      },
    );

    it.each<IdentityName>(['adminClub2', 'playerClub1'])('deniega a %s', async (identity) => {
      const response = await request(app).delete(`/api/leagues/${LEAGUE_ID}`).set(bearer(identity));

      expect(response.status).toBe(403);
      expect(prismaMock.writes()).toEqual([]);
    });
  });

  describe('POST /:id/participants (el admin añade jugadores)', () => {
    const path = `/api/leagues/${LEAGUE_ID}/participants`;

    it('añade como Confirmados solo a los que aún no están inscritos', async () => {
      prismaMock.client.user.findMany.mockResolvedValue([{ id: PLAYER_A }, { id: PLAYER_B }]);
      prismaMock.client.leagueParticipant.findMany.mockResolvedValue([{ playerId: PLAYER_A }]);

      const response = await request(app)
        .post(path)
        .set(bearer('adminClub1'))
        .send({ playerIds: [PLAYER_A, PLAYER_B] });

      expect(response.status).toBe(201);
      expect(prismaMock.client.leagueParticipant.createMany.mock.calls[0][0].data).toEqual([
        { leagueId: LEAGUE_ID, playerId: PLAYER_B, status: 'Confirmado' },
      ]);
    });

    it('un jugador repetido en la lista se añade una sola vez', async () => {
      prismaMock.client.user.findMany.mockResolvedValue([{ id: PLAYER_A }]);
      prismaMock.client.leagueParticipant.findMany.mockResolvedValue([]);

      const response = await request(app)
        .post(path)
        .set(bearer('adminClub1'))
        .send({ playerIds: [PLAYER_A, PLAYER_A] });

      expect(response.status).toBe(201);
      expect(prismaMock.client.leagueParticipant.createMany.mock.calls[0][0].data).toHaveLength(1);
    });

    it('no añade jugadores a una liga sin club', async () => {
      prismaMock.client.league.findUnique.mockResolvedValue(league({ clubId: null }));

      const response = await request(app)
        .post(path)
        .set(bearer('superAdmin'))
        .send({ playerIds: [PLAYER_A] });

      expect(response.status).toBe(400);
      expect(prismaMock.writes()).toEqual([]);
    });

    it('rechaza jugadores que no pertenecen al club de la liga', async () => {
      prismaMock.client.user.findMany.mockResolvedValue([{ id: PLAYER_A }]);
      prismaMock.client.leagueParticipant.findMany.mockResolvedValue([]);

      const response = await request(app)
        .post(path)
        .set(bearer('adminClub1'))
        .send({ playerIds: [PLAYER_A, PLAYER_B] });

      expect(response.status).toBe(400);
      expect(prismaMock.writes()).toEqual([]);
    });

    it.each([{}, { playerIds: [] }, { playerIds: ['no-uuid'] }])(
      'rechaza con 400 un cuerpo inválido (%j)',
      async (invalid) => {
        const response = await request(app).post(path).set(bearer('adminClub1')).send(invalid);

        expect(response.status).toBe(400);
      },
    );

    it.each<IdentityName>(['adminClub2', 'playerClub1'])('deniega a %s', async (identity) => {
      const response = await request(app).post(path).set(bearer(identity)).send({ playerIds: [PLAYER_A] });

      expect(response.status).toBe(403);
      expect(prismaMock.writes()).toEqual([]);
    });

    it('no permite añadir jugadores a una liga iniciada', async () => {
      prismaMock.client.league.findUnique.mockResolvedValue(league({ status: 'Iniciado' }));

      const response = await request(app)
        .post(path)
        .set(bearer('adminClub1'))
        .send({ playerIds: [PLAYER_A] });

      expect(response.status).toBe(400);
      expect(prismaMock.writes()).toEqual([]);
    });
  });

  describe('PUT /:id/participants/:playerId/status (confirmar)', () => {
    const path = `/api/leagues/${LEAGUE_ID}/participants/${PLAYER_A}/status`;

    it('el admin confirma una inscripción pendiente', async () => {
      prismaMock.client.leagueParticipant.findUnique.mockResolvedValue({ playerId: PLAYER_A });

      const response = await request(app)
        .put(path)
        .set(bearer('adminClub1'))
        .send({ status: 'Confirmado' });

      expect(response.status).toBe(200);
      expect(prismaMock.client.leagueParticipant.update.mock.calls[0][0].data).toEqual({
        status: 'Confirmado',
      });
    });

    it('no acepta NoPresentado antes de iniciar la liga', async () => {
      const response = await request(app)
        .put(path)
        .set(bearer('adminClub1'))
        .send({ status: 'NoPresentado' });

      expect(response.status).toBe(400);
      expect(prismaMock.writes()).toEqual([]);
    });

    it('responde 404 si el participante no existe', async () => {
      prismaMock.client.leagueParticipant.findUnique.mockResolvedValue(null);

      const response = await request(app)
        .put(path)
        .set(bearer('adminClub1'))
        .send({ status: 'Confirmado' });

      expect(response.status).toBe(404);
    });

    it('deniega a un admin de otro club', async () => {
      const response = await request(app)
        .put(path)
        .set(bearer('adminClub2'))
        .send({ status: 'Confirmado' });

      expect(response.status).toBe(403);
    });
  });

  describe('DELETE /:id/participants/:playerId (el admin quita a un jugador)', () => {
    const path = `/api/leagues/${LEAGUE_ID}/participants/${PLAYER_A}`;

    it('quita al jugador de una liga Programada', async () => {
      prismaMock.client.leagueParticipant.findUnique.mockResolvedValue({ playerId: PLAYER_A });

      const response = await request(app).delete(path).set(bearer('adminClub1'));

      expect(response.status).toBe(200);
      expect(prismaMock.writes()).toEqual(['leagueParticipant.delete']);
    });

    it('no permite quitar jugadores de una liga iniciada', async () => {
      prismaMock.client.league.findUnique.mockResolvedValue(league({ status: 'Iniciado' }));

      const response = await request(app).delete(path).set(bearer('adminClub1'));

      expect(response.status).toBe(400);
      expect(prismaMock.writes()).toEqual([]);
    });

    it('deniega a un admin de otro club', async () => {
      const response = await request(app).delete(path).set(bearer('adminClub2'));

      expect(response.status).toBe(403);
    });
  });

  describe('POST /:id/register (el jugador se inscribe)', () => {
    const path = `/api/leagues/${LEAGUE_ID}/register`;

    it('inscribe al jugador como Pendiente', async () => {
      prismaMock.client.leagueParticipant.findUnique.mockResolvedValue(null);
      prismaMock.client.leagueParticipant.create.mockResolvedValue({ id: 'p1' });

      const response = await request(app).post(path).set(bearer('playerClub1'));

      expect(response.status).toBe(201);
      expect(prismaMock.client.leagueParticipant.create.mock.calls[0][0].data).toEqual({
        leagueId: LEAGUE_ID,
        playerId: 'player-1',
        status: 'Pendiente',
      });
    });

    it('responde 409 si ya está inscrito', async () => {
      prismaMock.client.leagueParticipant.findUnique.mockResolvedValue({ id: 'p1' });

      const response = await request(app).post(path).set(bearer('playerClub1'));

      expect(response.status).toBe(409);
      expect(prismaMock.writes()).toEqual([]);
    });

    it.each<IdentityName>(['playerClub2', 'freePlayer'])(
      'oculta la liga a %s (otro club o sin club)',
      async (identity) => {
        const response = await request(app).post(path).set(bearer(identity));

        expect(response.status).toBe(404);
        expect(prismaMock.writes()).toEqual([]);
      },
    );

    it('un admin no se inscribe como jugador', async () => {
      const response = await request(app).post(path).set(bearer('adminClub1'));

      expect(response.status).toBe(403);
    });

    it('cierra la inscripción cuando la liga ya no está Programada', async () => {
      prismaMock.client.league.findUnique.mockResolvedValue(league({ status: 'Iniciado' }));

      const response = await request(app).post(path).set(bearer('playerClub1'));

      expect(response.status).toBe(400);
      expect(prismaMock.writes()).toEqual([]);
    });
  });

  describe('DELETE /:id/register (el jugador se da de baja)', () => {
    const path = `/api/leagues/${LEAGUE_ID}/register`;

    it('borra solo la inscripción del propio jugador', async () => {
      prismaMock.client.leagueParticipant.findUnique.mockResolvedValue({ id: 'p1' });

      const response = await request(app).delete(path).set(bearer('playerClub1'));

      expect(response.status).toBe(200);
      expect(prismaMock.client.leagueParticipant.delete.mock.calls[0][0].where).toEqual({
        leagueId_playerId: { leagueId: LEAGUE_ID, playerId: 'player-1' },
      });
    });

    it('responde 404 si el jugador no estaba inscrito', async () => {
      prismaMock.client.leagueParticipant.findUnique.mockResolvedValue(null);

      const response = await request(app).delete(path).set(bearer('playerClub1'));

      expect(response.status).toBe(404);
    });

    it('no permite darse de baja una vez iniciada la liga', async () => {
      prismaMock.client.league.findUnique.mockResolvedValue(league({ status: 'Iniciado' }));

      const response = await request(app).delete(path).set(bearer('playerClub1'));

      expect(response.status).toBe(400);
      expect(prismaMock.writes()).toEqual([]);
    });
  });
});

describe('Ligas (/api/leagues): ciclo de vida, calendario y clasificación', () => {
  beforeAll(async () => {
    useTestJwtSecret();
    ({ app } = await import('../index'));
  });

  beforeEach(() => {
    prismaMock.reset();
    vi.mocked(leagueLogic.startLeague).mockReset();
    vi.mocked(leagueLogic.cancelLeague).mockReset();
    vi.mocked(leagueLogic.finalizeLeague).mockReset();
    vi.mocked(leagueLogic.withdrawPlayer).mockReset();
    vi.mocked(leagueLogic.getLeagueStandings).mockReset();
    prismaMock.client.league.findUnique.mockResolvedValue(league());
    prismaMock.client.$transaction.mockImplementation(async (callback: (tx: unknown) => unknown) =>
      callback(prismaMock.client),
    );
  });

  describe.each([
    ['POST', `/api/leagues/${LEAGUE_ID}/start`],
    ['POST', `/api/leagues/${LEAGUE_ID}/cancel`],
    ['POST', `/api/leagues/${LEAGUE_ID}/finish`],
    ['POST', `/api/leagues/${LEAGUE_ID}/participants/${PLAYER_A}/withdraw`],
  ])('%s %s', (_method, path) => {
    it.each<IdentityName>(['playerClub1', 'freePlayer', 'adminClub2'])('deniega a %s', async (identity) => {
      const response = await request(app).post(path).set(bearer(identity));

      expect(response.status).toBe(403);
      expect(leagueLogic.startLeague).not.toHaveBeenCalled();
      expect(leagueLogic.cancelLeague).not.toHaveBeenCalled();
      expect(leagueLogic.finalizeLeague).not.toHaveBeenCalled();
      expect(leagueLogic.withdrawPlayer).not.toHaveBeenCalled();
    });

    it('responde 404 si la liga no existe', async () => {
      prismaMock.client.league.findUnique.mockResolvedValue(null);

      const response = await request(app).post(path).set(bearer('adminClub1'));

      expect(response.status).toBe(404);
    });
  });

  describe('POST /:id/start', () => {
    it('el admin del club inicia una liga Programada', async () => {
      const response = await request(app).post(`/api/leagues/${LEAGUE_ID}/start`).set(bearer('adminClub1'));

      expect(response.status).toBe(200);
      expect(leagueLogic.startLeague).toHaveBeenCalledWith(expect.anything(), expect.objectContaining({ id: LEAGUE_ID }));
    });

    it('no inicia una liga que ya no está Programada', async () => {
      prismaMock.client.league.findUnique.mockResolvedValue(league({ status: 'Iniciado' }));

      const response = await request(app).post(`/api/leagues/${LEAGUE_ID}/start`).set(bearer('adminClub1'));

      expect(response.status).toBe(400);
      expect(leagueLogic.startLeague).not.toHaveBeenCalled();
    });

    it('devuelve el error de negocio de la lógica (mínimo de jugadores)', async () => {
      const { ApiError } = await import('../http/response');
      vi.mocked(leagueLogic.startLeague).mockRejectedValue(new ApiError(400, 'Se necesitan al menos 3 jugadores confirmados'));

      const response = await request(app).post(`/api/leagues/${LEAGUE_ID}/start`).set(bearer('adminClub1'));

      expect(response.status).toBe(400);
      expect(response.body.error).toContain('al menos 3');
    });
  });

  describe('POST /:id/cancel', () => {
    it('el admin del club cancela la liga', async () => {
      const response = await request(app).post(`/api/leagues/${LEAGUE_ID}/cancel`).set(bearer('adminClub1'));

      expect(response.status).toBe(200);
      expect(leagueLogic.cancelLeague).toHaveBeenCalledOnce();
    });
  });

  describe('POST /:id/finish', () => {
    it('el admin del club finaliza una liga Iniciada', async () => {
      prismaMock.client.league.findUnique.mockResolvedValue(league({ status: 'Iniciado' }));

      const response = await request(app).post(`/api/leagues/${LEAGUE_ID}/finish`).set(bearer('adminClub1'));

      expect(response.status).toBe(200);
      expect(leagueLogic.finalizeLeague).toHaveBeenCalledWith(expect.anything(), LEAGUE_ID);
    });

    it.each(['Programado', 'Completado', 'Cancelado'])('no finaliza una liga %s', async (status) => {
      prismaMock.client.league.findUnique.mockResolvedValue(league({ status }));

      const response = await request(app).post(`/api/leagues/${LEAGUE_ID}/finish`).set(bearer('adminClub1'));

      expect(response.status).toBe(400);
      expect(leagueLogic.finalizeLeague).not.toHaveBeenCalled();
    });
  });

  describe('POST /:id/participants/:playerId/withdraw', () => {
    it('el admin del club retira al jugador indicado', async () => {
      const response = await request(app)
        .post(`/api/leagues/${LEAGUE_ID}/participants/${PLAYER_A}/withdraw`)
        .set(bearer('adminClub1'));

      expect(response.status).toBe(200);
      expect(leagueLogic.withdrawPlayer).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({ id: LEAGUE_ID }),
        PLAYER_A,
      );
    });
  });

  describe('GET /:id/matches (calendario)', () => {
    it('devuelve los partidos ordenados por jornada con solo los campos públicos de los jugadores', async () => {
      prismaMock.client.match.findMany.mockResolvedValue([{ id: 'm1', round: 1 }]);

      const response = await request(app).get(`/api/leagues/${LEAGUE_ID}/matches`).set(bearer('playerClub1'));

      expect(response.status).toBe(200);
      const query = prismaMock.client.match.findMany.mock.calls[0][0];
      expect(query).toMatchObject({
        where: { leagueId: LEAGUE_ID },
        orderBy: [{ round: 'asc' }, { matchOrder: 'asc' }],
      });
      const publicFields = { select: { id: true, name: true, surname: true, avatarUrl: true } };
      expect(query.include).toEqual({ playerOne: publicFields, playerTwo: publicFields });
    });

    it.each<IdentityName>(['playerClub2', 'adminClub2', 'freePlayer'])('oculta el calendario a %s', async (identity) => {
      const response = await request(app).get(`/api/leagues/${LEAGUE_ID}/matches`).set(bearer(identity));

      expect(response.status).toBe(404);
      expect(prismaMock.client.match.findMany).not.toHaveBeenCalled();
    });
  });

  describe('GET /:id/standings (clasificación)', () => {
    it.each<IdentityName>(['playerClub1', 'adminClub1', 'superAdmin'])('permite a %s', async (identity) => {
      vi.mocked(leagueLogic.getLeagueStandings).mockResolvedValue({ final: false, standings: [] });

      const response = await request(app).get(`/api/leagues/${LEAGUE_ID}/standings`).set(bearer(identity));

      expect(response.status).toBe(200);
      expect(response.body.data).toEqual({ final: false, standings: [] });
    });

    it.each<IdentityName>(['playerClub2', 'freePlayer'])('oculta la clasificación a %s', async (identity) => {
      const response = await request(app).get(`/api/leagues/${LEAGUE_ID}/standings`).set(bearer(identity));

      expect(response.status).toBe(404);
      expect(leagueLogic.getLeagueStandings).not.toHaveBeenCalled();
    });
  });
});

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import jwt from 'jsonwebtoken';
import { TEST_JWT_SECRET } from '../testing/auth';
import { ensureCurrentSeason } from '../utils/season';

/**
 * Prueba de integración con PostgreSQL real: los tests normales mockean Prisma, así que no
 * comprueban SQL, transacciones ni índices. Solo se ejecuta si `TEST_DATABASE_URL` apunta a una
 * base DESECHABLE con las migraciones aplicadas (`prisma migrate deploy`); borra sus tablas.
 *
 *   docker run -d --rm --name pingpong-sync-test -e POSTGRES_PASSWORD=test -e POSTGRES_DB=sync_test \
 *     -p 127.0.0.1:55999:5432 postgres:18
 *   DATABASE_URL=$TEST_DATABASE_URL npx prisma migrate deploy
 *   TEST_DATABASE_URL=postgresql://postgres:test@localhost:55999/sync_test?schema=public npx vitest run <este archivo>
 */
const TEST_DATABASE_URL = process.env.TEST_DATABASE_URL;

const MATCH_ID = '11111111-1111-4111-8111-111111111111';
const POINTS = ['a', 'b', 'c'].map((letter, index) => ({
  id: `${index + 1}${index + 1}${index + 1}${index + 1}${index + 1}${index + 1}${index + 1}${index + 1}-aaaa-4aaa-8aaa-aaaaaaaaaaaa`,
  setNumber: 1,
  pointOrder: index + 1,
  isWon: letter !== 'b',
}));
const sync = (n: number) => `00000000-0000-4000-8000-00000000000${n}`;

const document = (overrides: Record<string, unknown> = {}) => ({
  syncId: sync(1),
  baseVersion: null,
  match: {
    location: 'Casa',
    matchType: 'Amistoso',
    format: 'Individual',
    opponentName: 'Rival',
    status: 'Iniciado',
  },
  points: POINTS,
  ...overrides,
});

describe.skipIf(!TEST_DATABASE_URL)('Sincronización de partidos con PostgreSQL real', () => {
  let app: Awaited<typeof import('../index')>['app'];
  let prisma: Awaited<typeof import('../db')>['default'];
  let playerToken: string;
  let strangerToken: string;
  let playerId: string;

  beforeAll(async () => {
    process.env.DATABASE_URL = TEST_DATABASE_URL;
    process.env.DIRECT_URL = TEST_DATABASE_URL;
    process.env.JWT_SECRET = TEST_JWT_SECRET;
    prisma = (await import('../db')).default;
    ({ app } = await import('../index'));

    await prisma.$executeRawUnsafe(
      'TRUNCATE "manual_match", "point_analysis", "stats", "player_skill_update", "user", "club", "user_type", "season" CASCADE',
    );
    await ensureCurrentSeason(prisma);
    const playerType = await prisma.userType.create({ data: { name: 'Player' } });
    const club = await prisma.club.create({ data: { name: 'Club de prueba', city: 'Madrid', status: 'Aprobado' } });
    const player = await prisma.user.create({
      data: { userTypeId: playerType.id, name: 'Ana', email: 'ana@test.com', active: true, clubId: club.id, clubStatus: 'Aprobado' },
    });
    const stranger = await prisma.user.create({
      data: { userTypeId: playerType.id, name: 'Eva', email: 'eva@test.com', active: true },
    });
    playerId = player.id;
    playerToken = jwt.sign({ id: player.id, role: 'Player', clubId: club.id }, TEST_JWT_SECRET);
    strangerToken = jwt.sign({ id: stranger.id, role: 'Player', clubId: null }, TEST_JWT_SECRET);
  });

  afterAll(async () => {
    await prisma?.$disconnect();
  });

  const put = (token: string, doc: object, id = MATCH_ID) =>
    request(app).put(`/api/manual-matches/${id}/sync`).set('Authorization', `Bearer ${token}`).send(doc);
  const stats = () => prisma.stats.findFirst({ where: { userId: playerId } });

  it('crea el partido con el id del móvil, versión 1 y todos sus puntos', async () => {
    const response = await put(playerToken, document());

    expect(response.status).toBe(200);
    expect(response.body.data).toMatchObject({ id: MATCH_ID, version: 1, userId: playerId });
    expect(response.body.data.points).toHaveLength(3);
  });

  it('reenviar el mismo envío no duplica puntos ni cambia la versión', async () => {
    const response = await put(playerToken, document());

    expect(response.status).toBe(200);
    expect(response.body.data.version).toBe(1);
    expect(await prisma.pointAnalysis.count({ where: { manualMatchId: MATCH_ID } })).toBe(3);
  });

  it('con la versión descargada reemplaza los puntos y sube la versión', async () => {
    const response = await put(
      playerToken,
      document({ syncId: sync(2), baseVersion: 1, points: POINTS.slice(0, 2) }),
    );

    expect(response.status).toBe(200);
    expect(response.body.data.version).toBe(2);
    expect(response.body.data.points).toHaveLength(2);
  });

  it('con una versión vieja responde 409 y no cambia nada', async () => {
    const response = await put(playerToken, document({ syncId: sync(3), baseVersion: 1 }));

    expect(response.status).toBe(409);
    expect(await prisma.pointAnalysis.count({ where: { manualMatchId: MATCH_ID } })).toBe(2);
  });

  it('otro usuario no puede sincronizar sobre ese partido', async () => {
    const response = await put(strangerToken, document({ syncId: sync(4), baseVersion: 2 }));

    expect(response.status).toBe(404);
  });

  it('un punto de otro partido no se puede adoptar', async () => {
    const otherId = '99999999-9999-4999-8999-999999999999';

    const response = await put(playerToken, document({ syncId: sync(5) }), otherId);

    expect(response.status).toBe(409);
    expect(await prisma.manualMatch.findUnique({ where: { id: otherId } })).toBeNull();
  });

  it('al finalizarlo suma las estadísticas una sola vez, aunque se repita el envío', async () => {
    const final = document({
      syncId: sync(6),
      baseVersion: 2,
      match: { ...document().match, status: 'Completado' },
      result: { mySets: 3, opponentSets: 1, setScores: [{ myScore: 11, oppScore: 7 }] },
    });

    const first = await put(playerToken, final);
    const repeated = await put(playerToken, final);

    expect(first.status).toBe(200);
    expect(first.body.data.status).toBe('Completado');
    expect(repeated.status).toBe(200);
    expect((await stats())?.manualMatchWon).toBe(1);
    expect((await stats())?.manualPointWon).toBe(11);
  });

  it('un partido finalizado no admite un envío distinto', async () => {
    const response = await put(playerToken, document({ syncId: sync(7), baseVersion: 4 }));

    expect(response.status).toBe(409);
    expect((await stats())?.manualMatchWon).toBe(1);
  });

  it('PUT /:id/complete repetido responde 409 y no vuelve a sumar', async () => {
    const response = await request(app)
      .put(`/api/manual-matches/${MATCH_ID}/complete`)
      .set('Authorization', `Bearer ${playerToken}`)
      .send({ mySets: 3, opponentSets: 1 });

    expect(response.status).toBe(409);
    expect((await stats())?.manualMatchWon).toBe(1);
  });

  it('dos envíos simultáneos del mismo partido nuevo dejan un solo partido', async () => {
    const id = '88888888-8888-4888-8888-888888888888';
    const pointsFor = (offset: number) =>
      POINTS.map((p, i) => ({ ...p, id: `${offset}${offset}${offset}${i}aaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa`.slice(0, 36) }));

    const results = await Promise.all([
      put(playerToken, document({ syncId: sync(8), points: pointsFor(1) }), id),
      put(playerToken, document({ syncId: sync(9), points: pointsFor(2) }), id),
    ]);

    expect(await prisma.manualMatch.count({ where: { id } })).toBe(1);
    expect(results.map((r) => r.status).sort()).not.toContain(500);
  });
});

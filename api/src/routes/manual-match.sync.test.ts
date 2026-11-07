import { describe, it, expect, vi, beforeAll, beforeEach } from 'vitest';
import request from 'supertest';
import { prismaMock } from '../testing/prisma-mock';
import { bearer, useTestJwtSecret } from '../testing/auth';
import { currentSeasonFixture } from '../testing/fixtures';

vi.mock('../db', async () => ({
  default: (await import('../testing/prisma-mock')).prismaMock.client,
}));

let app: Awaited<typeof import('../index')>['app'];

const MATCH_ID = '11111111-1111-4111-8111-111111111111';
const URL = `/api/manual-matches/${MATCH_ID}/sync`;
const body = (overrides: Record<string, unknown> = {}) => ({
  syncId: '22222222-2222-4222-8222-222222222222',
  baseVersion: null,
  match: {
    location: 'Casa',
    matchType: 'Amistoso',
    format: 'Individual',
    opponentName: 'Rival',
    status: 'Iniciado',
  },
  points: [{ id: '44444444-4444-4444-8444-444444444444', setNumber: 1, pointOrder: 1, isWon: true }],
  ...overrides,
});

describe('PUT /api/manual-matches/:id/sync', () => {
  beforeAll(async () => {
    useTestJwtSecret();
    ({ app } = await import('../index'));
  });

  beforeEach(() => {
    prismaMock.reset();
    prismaMock.client.season.findFirst.mockResolvedValue(currentSeasonFixture());
    prismaMock.client.pointAnalysis.findMany.mockResolvedValue([]);
  });

  it('exige sesión', async () => {
    const response = await request(app).put(URL).send(body());

    expect(response.status).toBe(401);
  });

  it('rechaza un identificador que no es un UUID', async () => {
    const response = await request(app)
      .put('/api/manual-matches/no-es-uuid/sync')
      .set(bearer('playerClub1'))
      .send(body());

    expect(response.status).toBe(400);
  });

  it('rechaza un documento inválido sin escribir nada', async () => {
    const response = await request(app)
      .put(URL)
      .set(bearer('playerClub1'))
      .send(body({ points: [{ id: 'x', setNumber: 0 }] }));

    expect(response.status).toBe(400);
    expect(prismaMock.writes()).toEqual([]);
  });

  it('un partido finalizado sin resultado es inválido', async () => {
    const response = await request(app)
      .put(URL)
      .set(bearer('playerClub1'))
      .send(body({ match: { ...body().match, status: 'Completado' } }));

    expect(response.status).toBe(400);
  });

  it('crea el partido nuevo en una transacción serializable', async () => {
    prismaMock.client.manualMatch.findUnique
      .mockResolvedValueOnce(null)
      .mockResolvedValue({ id: MATCH_ID, version: 1, points: [] });

    const response = await request(app).put(URL).set(bearer('playerClub1')).send(body());

    expect(response.status).toBe(200);
    expect(response.body.data).toMatchObject({ id: MATCH_ID, version: 1 });
    expect(prismaMock.client.$transaction).toHaveBeenCalledWith(expect.any(Function), {
      isolationLevel: 'Serializable',
    });
    expect(prismaMock.writes()).toEqual(
      expect.arrayContaining(['manualMatch.create', 'pointAnalysis.createMany']),
    );
  });

  it('responde 409 si el partido cambió en otro dispositivo', async () => {
    prismaMock.client.manualMatch.findUnique.mockResolvedValueOnce({
      id: MATCH_ID,
      userId: 'player-1',
      version: 7,
      status: 'Iniciado',
      lastSyncId: null,
      user: { clubId: 'club-1', clubStatus: 'Aprobado', userType: { name: 'Player' } },
    });

    const response = await request(app)
      .put(URL)
      .set(bearer('playerClub1'))
      .send(body({ baseVersion: 3 }));

    expect(response.status).toBe(409);
    expect(prismaMock.writes()).toEqual([]);
  });

  it('responde 404 al usuario sin acceso a ese partido', async () => {
    prismaMock.client.manualMatch.findUnique.mockResolvedValueOnce({
      id: MATCH_ID,
      userId: 'otro-jugador',
      version: 3,
      status: 'Iniciado',
      lastSyncId: null,
      user: { clubId: 'club-9', clubStatus: 'Aprobado', userType: { name: 'Player' } },
    });

    const response = await request(app)
      .put(URL)
      .set(bearer('playerClub1'))
      .send(body({ baseVersion: 3 }));

    expect(response.status).toBe(404);
    expect(prismaMock.writes()).toEqual([]);
  });

  it('responde 503 si choca con otro envío en curso para que se reintente', async () => {
    prismaMock.client.$transaction.mockRejectedValueOnce(
      Object.assign(new Error('write conflict'), { code: 'P2034' }),
    );

    const response = await request(app).put(URL).set(bearer('playerClub1')).send(body());

    expect(response.status).toBe(503);
  });

  it('admite un partido largo: más de 100 kB de puntos no se rechaza por tamaño', async () => {
    const points = Array.from({ length: 1500 }, (_, index) => ({
      id: `${String(index).padStart(8, '0')}-4444-4444-8444-444444444444`,
      setNumber: 1,
      pointOrder: index + 1,
      isWon: index % 2 === 0,
      category: 'Servicio',
    }));
    prismaMock.client.manualMatch.findUnique
      .mockResolvedValueOnce(null)
      .mockResolvedValue({ id: MATCH_ID, version: 1, points: [] });

    const response = await request(app).put(URL).set(bearer('playerClub1')).send(body({ points }));

    expect(JSON.stringify(points).length).toBeGreaterThan(100_000);
    expect(response.status).toBe(200);
  });

  it('rechaza más de 2000 puntos', async () => {
    const points = Array.from({ length: 2001 }, (_, index) => ({
      id: `${String(index).padStart(8, '0')}-4444-4444-8444-444444444444`,
      setNumber: 1,
      pointOrder: index + 1,
      isWon: true,
    }));

    const response = await request(app).put(URL).set(bearer('playerClub1')).send(body({ points }));

    expect(response.status).toBe(400);
  });
});

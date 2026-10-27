import { describe, it, expect, vi, beforeAll, beforeEach } from 'vitest';
import request from 'supertest';
import { prismaMock } from '../testing/prisma-mock';
import { bearer, useTestJwtSecret, type IdentityName } from '../testing/auth';

// Solo se mockea la base de datos: los guardas de autenticacion son los reales.
vi.mock('../db', async () => ({
  default: (await import('../testing/prisma-mock')).prismaMock.client,
}));

const URL = '/api/warmup-routines';
const OWNER: IdentityName = 'playerClub1'; // id player-1
const OWNER_ID = 'player-1';
const OTHER_PLAYERS: IdentityName[] = ['playerClub2', 'freePlayer'];
const NOT_PLAYERS: IdentityName[] = ['adminClub1', 'superAdmin', 'adminWithoutClub'];

const ITEMS = [{ exerciseKey: 'estiramientos', durationSec: 60, restSec: 10 }];
const BODY = { name: 'Torneo', items: ITEMS };

const savedRoutine = (overrides: Record<string, unknown> = {}) => ({
  id: 'r1',
  name: 'Torneo',
  items: ITEMS,
  createdAt: '2026-10-27T10:00:00.000Z',
  updatedAt: '2026-10-27T10:00:00.000Z',
  ...overrides,
});

const prismaError = (code: string) => Object.assign(new Error(`Prisma ${code}`), { code });

let app: Awaited<typeof import('../index')>['app'];

describe('Rutinas de calentamiento (/api/warmup-routines)', () => {
  beforeAll(async () => {
    useTestJwtSecret();
    ({ app } = await import('../index'));
  });

  beforeEach(() => {
    prismaMock.reset();
    const routines = prismaMock.client.warmupRoutine;
    routines.findMany.mockResolvedValue([savedRoutine()]);
    routines.count.mockResolvedValue(0);
    routines.create.mockResolvedValue(savedRoutine());
    routines.update.mockResolvedValue(savedRoutine({ name: 'Nueva' }));
    routines.delete.mockResolvedValue({ id: 'r1' });
    // Solo el propietario encuentra su rutina: si la ruta no filtra por usuario, un extraño la vería.
    routines.findFirst.mockImplementation(async ({ where }: { where: { id: string; userId: string } }) =>
      where.id === 'r1' && where.userId === OWNER_ID ? { id: 'r1' } : null,
    );
  });

  describe('acceso', () => {
    it('Debería responder 401 sin token', async () => {
      const response = await request(app).get(URL);

      expect(response.status).toBe(401);
    });

    it.each(NOT_PLAYERS)('Debería denegar con 403 a %s y no tocar la base de datos', async (identity) => {
      const reads = await request(app).get(URL).set(bearer(identity));
      const writes = await request(app).post(URL).set(bearer(identity)).send(BODY);

      expect(reads.status).toBe(403);
      expect(writes.status).toBe(403);
      expect(prismaMock.client.warmupRoutine.findMany).not.toHaveBeenCalled();
      expect(prismaMock.writes()).toEqual([]);
    });

    it.each([OWNER, ...OTHER_PLAYERS])('Debería dejar pasar al jugador %s', async (identity) => {
      const response = await request(app).get(URL).set(bearer(identity));

      expect(response.status).toBe(200);
    });
  });

  describe('GET /', () => {
    it('Debería devolver solo las rutinas del jugador, la modificada más recientemente primero', async () => {
      const response = await request(app).get(URL).set(bearer(OWNER));

      expect(response.status).toBe(200);
      expect(response.body).toEqual({ success: true, data: [savedRoutine()] });
      const query = prismaMock.client.warmupRoutine.findMany.mock.calls[0][0];
      expect(query.where).toEqual({ userId: OWNER_ID });
      expect(query.orderBy).toEqual({ updatedAt: 'desc' });
    });

    it('Debería no exponer el identificador del propietario', async () => {
      await request(app).get(URL).set(bearer(OWNER));

      const query = prismaMock.client.warmupRoutine.findMany.mock.calls[0][0];
      expect(query.select).toMatchObject({ id: true, name: true, items: true });
      expect(query.select).not.toHaveProperty('userId');
    });
  });

  describe('POST /', () => {
    it('Debería crear la rutina a nombre del jugador autenticado y responder 201', async () => {
      const response = await request(app).post(URL).set(bearer(OWNER)).send(BODY);

      expect(response.status).toBe(201);
      expect(response.body).toEqual({ success: true, data: savedRoutine() });
      expect(prismaMock.client.warmupRoutine.create).toHaveBeenCalledWith(
        expect.objectContaining({ data: { userId: OWNER_ID, name: 'Torneo', items: ITEMS } }),
      );
    });

    it('Debería ignorar un userId enviado en el cuerpo', async () => {
      await request(app).post(URL).set(bearer(OWNER)).send({ ...BODY, userId: 'player-2' });

      const { data } = prismaMock.client.warmupRoutine.create.mock.calls[0][0];
      expect(data.userId).toBe(OWNER_ID);
    });

    it('Debería contar y crear dentro de una transacción serializable', async () => {
      await request(app).post(URL).set(bearer(OWNER)).send(BODY);

      expect(prismaMock.client.$transaction).toHaveBeenCalledWith(expect.any(Function), {
        isolationLevel: 'Serializable',
      });
      expect(prismaMock.client.warmupRoutine.count).toHaveBeenCalledWith({ where: { userId: OWNER_ID } });
    });

    it('Debería permitir la quinta rutina', async () => {
      prismaMock.client.warmupRoutine.count.mockResolvedValue(4);

      const response = await request(app).post(URL).set(bearer(OWNER)).send(BODY);

      expect(response.status).toBe(201);
    });

    it('Debería responder 409 y no crear nada si el jugador ya tiene cinco rutinas', async () => {
      prismaMock.client.warmupRoutine.count.mockResolvedValue(5);

      const response = await request(app).post(URL).set(bearer(OWNER)).send(BODY);

      expect(response.status).toBe(409);
      expect(response.body).toEqual({
        success: false,
        error: 'Has alcanzado el máximo de 5 rutinas. Borra una para guardar otra.',
      });
      expect(prismaMock.writes()).toEqual([]);
    });

    it('Debería responder 409 si ya existe una rutina con ese nombre', async () => {
      prismaMock.client.warmupRoutine.create.mockRejectedValue(prismaError('P2002'));

      const response = await request(app).post(URL).set(bearer(OWNER)).send(BODY);

      expect(response.status).toBe(409);
      expect(response.body.error).toBe('Ya tienes una rutina con ese nombre.');
    });

    it('Debería responder 409 para que reintente si dos peticiones chocan en la transacción', async () => {
      prismaMock.client.$transaction.mockRejectedValue(prismaError('P2034'));

      const response = await request(app).post(URL).set(bearer(OWNER)).send(BODY);

      expect(response.status).toBe(409);
      expect(response.body.error).toBe('No se pudo guardar la rutina. Inténtalo de nuevo.');
    });

    it.each([
      ['sin nombre', { items: ITEMS }],
      ['con el nombre vacío', { ...BODY, name: '   ' }],
      ['sin ejercicios', { ...BODY, items: [] }],
      ['con un ejercicio que no existe', { ...BODY, items: [{ ...ITEMS[0], exerciseKey: 'plancha' }] }],
      ['con una duración fuera de rango', { ...BODY, items: [{ ...ITEMS[0], durationSec: 5 }] }],
    ])('Debería responder 400 y no escribir nada con un cuerpo %s', async (_caso, body) => {
      const response = await request(app).post(URL).set(bearer(OWNER)).send(body);

      expect(response.status).toBe(400);
      expect(response.body).toMatchObject({ success: false, error: 'Datos inválidos' });
      expect(prismaMock.client.$transaction).not.toHaveBeenCalled();
      expect(prismaMock.writes()).toEqual([]);
    });
  });

  describe('PUT /:id', () => {
    const body = { name: 'Nueva', items: ITEMS };

    it('Debería actualizar la rutina del propietario', async () => {
      const response = await request(app).put(`${URL}/r1`).set(bearer(OWNER)).send(body);

      expect(response.status).toBe(200);
      expect(response.body).toEqual({ success: true, data: savedRoutine({ name: 'Nueva' }) });
      expect(prismaMock.client.warmupRoutine.update).toHaveBeenCalledWith(
        expect.objectContaining({ where: { id: 'r1' }, data: body }),
      );
    });

    it.each(OTHER_PLAYERS)('Debería responder 404 a %s, que no es el propietario, sin escribir nada', async (identity) => {
      const response = await request(app).put(`${URL}/r1`).set(bearer(identity)).send(body);

      expect(response.status).toBe(404);
      expect(prismaMock.writes()).toEqual([]);
    });

    it('Debería responder 404 si la rutina no existe', async () => {
      const response = await request(app).put(`${URL}/no-existe`).set(bearer(OWNER)).send(body);

      expect(response.status).toBe(404);
      expect(prismaMock.writes()).toEqual([]);
    });

    it('Debería responder 409 si el nuevo nombre ya lo usa otra rutina del jugador', async () => {
      prismaMock.client.warmupRoutine.update.mockRejectedValue(prismaError('P2002'));

      const response = await request(app).put(`${URL}/r1`).set(bearer(OWNER)).send(body);

      expect(response.status).toBe(409);
      expect(response.body.error).toBe('Ya tienes una rutina con ese nombre.');
    });

    it('Debería responder 400 y no escribir nada con un cuerpo inválido', async () => {
      const response = await request(app).put(`${URL}/r1`).set(bearer(OWNER)).send({ name: 'Nueva', items: [] });

      expect(response.status).toBe(400);
      expect(prismaMock.writes()).toEqual([]);
    });
  });

  describe('DELETE /:id', () => {
    it('Debería borrar la rutina del propietario', async () => {
      const response = await request(app).delete(`${URL}/r1`).set(bearer(OWNER));

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(prismaMock.client.warmupRoutine.delete).toHaveBeenCalledWith({ where: { id: 'r1' } });
    });

    it.each(OTHER_PLAYERS)('Debería responder 404 a %s, que no es el propietario, sin borrar nada', async (identity) => {
      const response = await request(app).delete(`${URL}/r1`).set(bearer(identity));

      expect(response.status).toBe(404);
      expect(prismaMock.writes()).toEqual([]);
    });

    it('Debería responder 404 si la rutina no existe', async () => {
      const response = await request(app).delete(`${URL}/no-existe`).set(bearer(OWNER));

      expect(response.status).toBe(404);
    });
  });
});

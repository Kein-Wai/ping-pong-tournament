import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AxiosError } from 'axios';
import { createMemoryLocalStore } from './memoryLocalStore';
import { MATCHES_COLLECTION, type LocalMatch } from './localMatches';
import { enqueueOperation, listOutbox } from './outbox';
import { createMatchHandler, discardMatchCopy, saveMatchAsNew } from './matchesSync';

const item = {} as never;
const doc = (overrides: Partial<LocalMatch> = {}): LocalMatch => ({
  data: {
    id: 'm1',
    userId: 'me',
    date: '2026-11-01T10:00:00.000Z',
    location: 'Casa',
    matchType: 'Amistoso',
    format: 'Individual',
    setsToWin: 3,
    opponentName: 'Rival',
    status: 'Iniciado',
    mySets: 0,
    opponentSets: 0,
    analysisType: 'Extenso',
    points: [{ id: 'p1', setNumber: 1, pointOrder: 1, isWon: true }],
  },
  baseVersion: null,
  revision: 2,
  syncedRevision: 0,
  syncId: 'sync-1',
  conflict: null,
  ...overrides,
});

const rejection = (status: number, error: string) =>
  new AxiosError('x', 'ERR_BAD_REQUEST', undefined, undefined, { status, data: { error } } as never);

const setup = async (local: LocalMatch = doc()) => {
  const store = createMemoryLocalStore();
  await store.apply('me', [
    { type: 'put', collection: MATCHES_COLLECTION, id: 'm1', value: local },
    enqueueOperation({ id: 'partido:m1', kind: 'partido', payload: { matchId: 'm1' } }, 1),
  ]);
  const service = { sync: vi.fn() };
  let n = 0;
  const handler = createMatchHandler({ service, newId: () => `nuevo-${++n}` });
  const run = () => handler({ matchId: 'm1' }, item, { store, userId: 'me' });
  const read = async (id = 'm1') => (await store.get<LocalMatch>('me', MATCHES_COLLECTION, id))?.value;
  return { store, service, run, read };
};

describe('manejador de partidos', () => {
  beforeEach(() => vi.clearAllMocks());

  it('envía el documento entero con su syncId y la versión descargada', async () => {
    const { run, service } = await setup(doc({ baseVersion: 3 }));
    service.sync.mockResolvedValue({ id: 'm1', version: 4 });

    await run();

    expect(service.sync).toHaveBeenCalledWith(
      'm1',
      expect.objectContaining({
        syncId: 'sync-1',
        baseVersion: 3,
        points: [expect.objectContaining({ id: 'p1', isWon: true })],
      }),
    );
  });

  it('un partido finalizado lleva su resultado', async () => {
    const local = doc();
    local.data = { ...local.data, status: 'Completado', mySets: 3, opponentSets: 1, setScores: [{ myScore: 11, oppScore: 5 }] };
    const { run, service } = await setup(local);
    service.sync.mockResolvedValue({ id: 'm1', version: 1 });

    await run();

    expect(service.sync.mock.calls[0][1].result).toEqual({
      mySets: 3,
      opponentSets: 1,
      lightNotes: null,
      setScores: [{ myScore: 11, oppScore: 5 }],
    });
  });

  it('al terminar anota la nueva versión y deja la copia como enviada', async () => {
    const { run, service, read } = await setup();
    service.sync.mockResolvedValue({ id: 'm1', version: 1 });

    await run();

    expect(await read()).toMatchObject({ baseVersion: 1, syncedRevision: 2, conflict: null });
  });

  it('si se cambió el partido mientras se enviaba, esos cambios siguen pendientes', async () => {
    const { run, service, read, store } = await setup();
    service.sync.mockImplementation(async () => {
      const current = (await read())!;
      await store.apply('me', [
        { type: 'put', collection: MATCHES_COLLECTION, id: 'm1', value: { ...current, revision: 3 } },
      ]);
      return { id: 'm1', version: 1 };
    });

    await run();

    expect(await read()).toMatchObject({ revision: 3, syncedRevision: 2, baseVersion: 1 });
  });

  it.each([
    [409, 'El partido cambió en otro dispositivo.'],
    [404, 'Partido no encontrado o sin acceso'],
    [400, 'Datos inválidos'],
    [403, 'Solo el entrenador de un club aprobado puede analizar a un jugador'],
  ])('un rechazo %i conserva la copia local y anota el motivo', async (status, reason) => {
    const { run, service, read } = await setup();
    const error = rejection(status, reason);
    service.sync.mockRejectedValue(error);

    await expect(run()).rejects.toBe(error);

    expect(await read()).toMatchObject({ conflict: reason, revision: 2, syncedRevision: 0 });
  });

  it('un fallo de red se propaga sin marcar conflicto', async () => {
    const { run, service, read } = await setup();
    service.sync.mockRejectedValue(new AxiosError('Network Error', 'ERR_NETWORK'));

    await expect(run()).rejects.toBeDefined();

    expect((await read())?.conflict).toBeNull();
  });

  it('si la copia local ya no existe no hace nada', async () => {
    const { run, service, store } = await setup();
    await store.apply('me', [{ type: 'remove', collection: MATCHES_COLLECTION, id: 'm1' }]);

    await run();

    expect(service.sync).not.toHaveBeenCalled();
  });

  describe('guardar como partido nuevo', () => {
    it('crea una copia con ids nuevos y sin versión, y quita el pendiente en conflicto', async () => {
      const { store, read } = await setup(doc({ baseVersion: 3, conflict: 'El partido cambió en otro dispositivo.' }));
      let n = 0;

      await saveMatchAsNew({ store, userId: 'me' }, 'm1', { newId: () => `nuevo-${++n}`, now: () => 5 });

      const copy = await read('nuevo-1');
      expect(copy).toMatchObject({ baseVersion: null, conflict: null, revision: 1, syncedRevision: 0 });
      expect(copy?.data.points).toHaveLength(1);
      expect(copy?.data.points[0].id).not.toBe('p1');
      expect(await read('m1')).toBeUndefined();
      expect((await listOutbox(store, 'me')).map((i) => i.id)).toEqual(['partido:nuevo-1']);
    });
  });

  describe('descartar', () => {
    it('elimina la copia local para que no se vuelva a encolar en el arranque', async () => {
      const { store, read } = await setup();

      await discardMatchCopy({ store, userId: 'me' }, 'm1');

      expect(await read()).toBeUndefined();
    });
  });
});

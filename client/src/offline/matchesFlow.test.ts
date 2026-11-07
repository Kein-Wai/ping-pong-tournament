import { describe, it, expect, vi } from 'vitest';
import { AxiosError } from 'axios';
import { createMemoryLocalStore } from './memoryLocalStore';
import { createManualMatchesRepository } from './manualMatchesRepository';
import { createMatchHandler, saveMatchAsNew } from './matchesSync';
import { listOutbox } from './outbox';
import { createSyncEngine } from './syncEngine';

const CREATE = {
  opponentName: 'Rival',
  matchType: 'Amistoso' as const,
  location: 'Casa' as const,
  format: 'Individual' as const,
  analysisType: 'Extenso' as const,
  status: 'Iniciado' as const,
};

/** Repositorio y motor sobre el mismo almacén, como en la app: lo que uno encola lo envía el otro. */
const setup = () => {
  const store = createMemoryLocalStore();
  let counter = 0;
  const newId = () => `id-${++counter}`;
  const service = {
    list: vi.fn().mockResolvedValue([]),
    byId: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    addPoint: vi.fn(),
    deletePoint: vi.fn(),
    complete: vi.fn(),
    sync: vi.fn(),
  };
  const repository = createManualMatchesRepository({
    service,
    getStore: async () => store,
    getUser: () => ({ id: 'me', name: 'Ana' }),
    isOnline: () => false,
    newId,
    now: Date.now,
    afterChange: () => undefined,
  });
  const engine = createSyncEngine({
    store,
    handlers: { partido: createMatchHandler({ service, newId }) },
  });
  return { store, service, repository, engine, newId };
};

describe('análisis sin conexión: de crear a sincronizar', () => {
  it('analiza un partido entero sin red y lo envía como un solo documento al salir', async () => {
    const { repository, engine, service, store } = setup();
    service.sync.mockResolvedValue({ id: 'id-1', version: 1 });
    const { id } = await repository.create(CREATE);
    repository.openMatch(id);
    await repository.addPoint(id, { setNumber: 1, pointOrder: 1, isWon: true, category: 'Saque' as never });
    await repository.addPoint(id, { setNumber: 1, pointOrder: 2, isWon: false });
    await repository.complete(id, { mySets: 3, opponentSets: 0, setScores: [{ myScore: 11, oppScore: 8 }] });
    await repository.closeMatch(id);

    await engine.run('me', { force: true });

    expect(service.sync).toHaveBeenCalledTimes(1);
    const body = service.sync.mock.calls[0][1];
    expect(body).toMatchObject({ baseVersion: null, match: { status: 'Completado' }, result: { mySets: 3 } });
    expect(body.points).toHaveLength(2);
    expect(await listOutbox(store, 'me')).toEqual([]);
    expect((await repository.byId(id)).localState).toBeUndefined();
  });

  it('un conflicto conserva la copia local y «guardar como partido nuevo» la envía como otro partido', async () => {
    const { repository, engine, service, store, newId } = setup();
    service.sync
      .mockRejectedValueOnce(
        new AxiosError('x', 'ERR_BAD_REQUEST', undefined, undefined, {
          status: 409,
          data: { error: 'El partido cambió en otro dispositivo.' },
        } as never),
      )
      .mockResolvedValueOnce({ id: 'otro', version: 1 });
    const { id } = await repository.create(CREATE);
    await repository.addPoint(id, { setNumber: 1, pointOrder: 1, isWon: true });
    await repository.closeMatch(id);
    await engine.run('me', { force: true });
    expect(await repository.byId(id)).toMatchObject({ localState: 'conflicto', points: [expect.anything()] });
    expect((await listOutbox(store, 'me'))[0]).toMatchObject({ status: 'requiere-atencion' });

    await saveMatchAsNew({ store, userId: 'me' }, id, { newId, now: Date.now });
    await engine.run('me', { force: true });

    expect(service.sync).toHaveBeenCalledTimes(2);
    const [secondId, secondBody] = service.sync.mock.calls[1];
    expect(secondId).not.toBe(id);
    expect(secondBody.baseVersion).toBeNull();
    expect(await listOutbox(store, 'me')).toEqual([]);
  });

  it('sin red el partido queda pendiente y se envía al reintentar', async () => {
    const { repository, engine, service } = setup();
    service.sync
      .mockRejectedValueOnce(new AxiosError('Network Error', 'ERR_NETWORK'))
      .mockResolvedValueOnce({ id: 'id-1', version: 1 });
    const { id } = await repository.create(CREATE);

    await engine.run('me', { force: true });
    expect((await repository.byId(id)).localState).toBe('pendiente');
    await engine.run('me', { force: true });

    expect(service.sync).toHaveBeenCalledTimes(2);
    expect((await repository.byId(id)).localState).toBeUndefined();
  });
});

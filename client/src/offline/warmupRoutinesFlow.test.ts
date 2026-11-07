import { describe, it, expect, vi } from 'vitest';
import { AxiosError } from 'axios';
import { createMemoryLocalStore } from './memoryLocalStore';
import { listOutbox } from './outbox';
import { createSyncEngine } from './syncEngine';
import { createWarmupRoutinesRepository } from './warmupRoutinesRepository';
import { createWarmupRoutineHandler } from './warmupRoutinesSync';

const ITEMS = [{ exerciseKey: 'estiramientos' as const, durationSec: 60, restSec: 10 }];
const serverRoutine = (id: string, name: string) => ({
  id,
  name,
  items: ITEMS,
  createdAt: '2026-11-01T10:00:00.000Z',
  updatedAt: '2026-11-01T10:00:00.000Z',
});

/** Repositorio y motor sobre el mismo almacén, como en la app: lo que uno encola lo envía el otro. */
const setup = () => {
  const store = createMemoryLocalStore();
  const service = { list: vi.fn().mockResolvedValue([]), create: vi.fn(), update: vi.fn(), remove: vi.fn() };
  const repository = createWarmupRoutinesRepository({
    service,
    getStore: async () => store,
    getUserId: () => 'u1',
    isOnline: () => false,
    newId: (() => {
      let n = 0;
      return () => `local-${++n}`;
    })(),
    now: Date.now,
    afterChange: () => undefined,
  });
  const engine = createSyncEngine({
    store,
    handlers: { rutina: createWarmupRoutineHandler({ service, notify: vi.fn() }) },
  });
  return { store, service, repository, engine };
};

describe('rutinas de calentamiento: de crear sin red a sincronizar', () => {
  it('crear, editar y volver a editar sin red envía una sola creación con el último contenido', async () => {
    const { repository, engine, service, store } = setup();
    service.create.mockResolvedValue(serverRoutine('srv-1', 'Final'));
    const { id } = await repository.create({ name: 'Primera', items: ITEMS });
    await repository.update(id, { name: 'Final', items: ITEMS });

    await engine.run('u1');

    expect(service.create).toHaveBeenCalledTimes(1);
    expect(service.create).toHaveBeenCalledWith({ name: 'Final', items: ITEMS });
    expect(await listOutbox(store, 'u1')).toEqual([]);
  });

  it('una edición posterior a la creación usa el id que dio el servidor', async () => {
    const { repository, engine, service } = setup();
    service.create.mockResolvedValue(serverRoutine('srv-1', 'A'));
    service.update.mockResolvedValue(serverRoutine('srv-1', 'B'));
    const { id } = await repository.create({ name: 'A', items: ITEMS });
    await engine.run('u1');

    await repository.update(id, { name: 'B', items: ITEMS });
    await engine.run('u1');

    expect(service.update).toHaveBeenCalledWith('srv-1', { name: 'B', items: ITEMS });
  });

  it('sin red la rutina se conserva y se envía al reintentar', async () => {
    const { repository, engine, service } = setup();
    service.create
      .mockRejectedValueOnce(new AxiosError('Network Error', 'ERR_NETWORK'))
      .mockResolvedValueOnce(serverRoutine('srv-1', 'A'));
    await repository.create({ name: 'A', items: ITEMS });

    await engine.run('u1');
    await engine.run('u1', { force: true });

    expect(service.create).toHaveBeenCalledTimes(2);
    expect((await repository.list())[0]).toMatchObject({ id: 'local-1' });
  });
});

import { describe, it, expect } from 'vitest';
import { createMemoryLocalStore } from './memoryLocalStore';
import {
  discardAllOutbox,
  discardOutboxItem,
  enqueueOperation,
  listOutbox,
  retryOutboxItem,
  updateOutboxItem,
} from './outbox';

const setup = async () => {
  const store = createMemoryLocalStore();
  await store.apply('u1', [enqueueOperation({ id: 'a', kind: 'rutina', payload: { n: 1 } }, 500)]);
  return store;
};

describe('outbox', () => {
  it('un pendiente recién encolado está pendiente y sin intentos', async () => {
    const store = await setup();

    expect(await listOutbox(store, 'u1')).toEqual([
      {
        id: 'a',
        kind: 'rutina',
        payload: { n: 1 },
        status: 'pendiente',
        createdAt: 500,
        attempts: 0,
        nextAttemptAt: 0,
        reason: null,
      },
    ]);
  });

  it('cada usuario ve solo sus pendientes', async () => {
    const store = await setup();

    expect(await listOutbox(store, 'u2')).toEqual([]);
  });

  it('se encola en la misma transacción que el cambio local', async () => {
    const store = createMemoryLocalStore();

    await store.apply('u1', [
      { type: 'put', collection: 'rutinas', id: 'r1', value: { nombre: 'x' } },
      enqueueOperation({ id: 'a', kind: 'rutina', payload: 'r1' }, 1),
    ]);

    expect(await store.get('u1', 'rutinas', 'r1')).not.toBeNull();
    expect(await listOutbox(store, 'u1')).toHaveLength(1);
  });

  it('actualizar el estado conserva el contenido y su orden', async () => {
    const store = await setup();
    await store.apply('u1', [enqueueOperation({ id: 'b', kind: 'rutina', payload: 2 }, 600)]);

    await updateOutboxItem(store, 'u1', 'a', 'requiere-atencion', { reason: 'Duplicado' });

    const [first, second] = await listOutbox(store, 'u1');
    expect(first).toMatchObject({ id: 'a', status: 'requiere-atencion', reason: 'Duplicado', payload: { n: 1 } });
    expect(second.id).toBe('b');
  });

  it('reintentar devuelve el pendiente a la cola y limpia el motivo', async () => {
    const store = await setup();
    await updateOutboxItem(store, 'u1', 'a', 'requiere-atencion', { reason: 'x', nextAttemptAt: 99 });

    await retryOutboxItem(store, 'u1', 'a');

    expect((await listOutbox(store, 'u1'))[0]).toMatchObject({
      status: 'pendiente',
      reason: null,
      nextAttemptAt: 0,
    });
  });

  it('descartar lo elimina', async () => {
    const store = await setup();

    await discardOutboxItem(store, 'u1', 'a');

    expect(await listOutbox(store, 'u1')).toEqual([]);
  });

  it('actualizar un pendiente que ya no existe no hace nada', async () => {
    const store = createMemoryLocalStore();

    await updateOutboxItem(store, 'u1', 'fantasma', 'pendiente');

    expect(await listOutbox(store, 'u1')).toEqual([]);
  });

  it('descartar todo vacía la cola del usuario y no toca la de otro', async () => {
    const store = await setup();
    await store.apply('u1', [enqueueOperation({ id: 'b', kind: 'rutina', payload: 2 }, 600)]);
    await store.apply('u2', [enqueueOperation({ id: 'x', kind: 'rutina', payload: 3 }, 700)]);

    await discardAllOutbox(store, 'u1');

    expect(await listOutbox(store, 'u1')).toEqual([]);
    expect(await listOutbox(store, 'u2')).toHaveLength(1);
  });
});

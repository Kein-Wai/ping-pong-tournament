import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { resetAppLocalStore, setAppLocalStore } from './appLocalStore';
import { getAppSync, registerOutboxHandler, registerStartupTask, startAppSync, stopAppSync } from './appSync';
import { createMemoryLocalStore } from './memoryLocalStore';
import { useSyncStore } from '../store/syncStore';
import { enqueueOperation, listOutbox } from './outbox';

describe('appSync', () => {
  beforeEach(() => {
    resetAppLocalStore();
  });
  afterEach(() => stopAppSync());

  it('envía los pendientes del usuario con el manejador registrado para su tipo', async () => {
    const store = createMemoryLocalStore();
    await store.apply('u1', [enqueueOperation({ id: 'a', kind: 'prueba', payload: 7 }, 1)]);
    setAppLocalStore(store);
    const handler = vi.fn().mockResolvedValue(undefined);
    registerOutboxHandler('prueba', handler);

    await startAppSync('u1');
    await vi.waitFor(() => expect(handler).toHaveBeenCalledWith(7, expect.anything(), expect.anything()));

    await vi.waitFor(async () => expect(await listOutbox(store, 'u1')).toEqual([]));
  });

  it('sin almacén local (navegador) no arranca nada', async () => {
    setAppLocalStore(null);

    await startAppSync('u1');

    expect(getAppSync()).toBeNull();
  });

  it('pedirlo otra vez para el mismo usuario conserva el mismo controlador', async () => {
    setAppLocalStore(createMemoryLocalStore());

    await startAppSync('u1');
    const first = getAppSync();
    await startAppSync('u1');

    expect(getAppSync()).toBe(first);
  });

  it('parar la sincronización libera el controlador', async () => {
    setAppLocalStore(createMemoryLocalStore());
    await startAppSync('u1');

    stopAppSync();

    expect(getAppSync()).toBeNull();
  });

  it('al parar se ponen a cero los contadores de la sesión', async () => {
    setAppLocalStore(createMemoryLocalStore());
    await startAppSync('u1');
    useSyncStore.getState().setCounts({ pending: 4, needsAttention: 1 });

    stopAppSync();

    expect(useSyncStore.getState()).toMatchObject({ pending: 0, needsAttention: 0 });
  });
});

describe('tareas de arranque', () => {
  it('se ejecutan antes del primer envío', async () => {
    resetAppLocalStore();
    setAppLocalStore(createMemoryLocalStore());
    const order: string[] = [];
    registerStartupTask(async () => {
      order.push('tarea');
    });

    await startAppSync('u-arranque');

    expect(order).toEqual(['tarea']);
    stopAppSync();
  });
});

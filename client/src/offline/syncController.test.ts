import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { AxiosError } from 'axios';
import { useConnectivityStore } from '../store/connectivityStore';
import { useSyncStore } from '../store/syncStore';
import { createMemoryLocalStore } from './memoryLocalStore';
import { enqueueOperation, listOutbox } from './outbox';
import { createSyncController } from './syncController';
import { createSyncEngine } from './syncEngine';

const flush = () => vi.advanceTimersByTimeAsync(0);

const setup = async (userId: string | null = 'u1') => {
  const store = createMemoryLocalStore();
  await store.apply('u1', [enqueueOperation({ id: 'a', kind: 'rutina', payload: 'a' }, 1)]);
  const handler = vi.fn().mockResolvedValue(undefined);
  const engine = createSyncEngine({ store, handlers: { rutina: handler } });
  const controller = createSyncController({ store, engine, getUserId: () => userId });
  return { store, handler, controller };
};

describe('syncController', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    useConnectivityStore.setState({ networkOnline: true, workOffline: false });
    useSyncStore.setState({ pending: 0, needsAttention: 0, syncing: false, openMatches: 0 });
  });
  afterEach(() => vi.useRealTimers());

  it('al arrancar con red envía los pendientes y deja los contadores a cero', async () => {
    const { handler, controller } = await setup();

    controller.start();
    await flush();

    expect(handler).toHaveBeenCalledTimes(1);
    expect(useSyncStore.getState()).toMatchObject({ pending: 0, needsAttention: 0, syncing: false });
    controller.stop();
  });

  it('al arrancar sin red no envía pero cuenta los pendientes', async () => {
    useConnectivityStore.setState({ networkOnline: false });
    const { handler, controller } = await setup();

    controller.start();
    await flush();

    expect(handler).not.toHaveBeenCalled();
    expect(useSyncStore.getState().pending).toBe(1);
    controller.stop();
  });

  it('al volver la red envía lo pendiente', async () => {
    useConnectivityStore.setState({ networkOnline: false });
    const { handler, controller } = await setup();
    controller.start();
    await flush();

    useConnectivityStore.getState().setNetworkOnline(true);
    await flush();

    expect(handler).toHaveBeenCalledTimes(1);
    controller.stop();
  });

  it('con «Trabajar offline» activado no envía; al desactivarlo sí', async () => {
    useConnectivityStore.setState({ workOffline: true });
    const { handler, controller } = await setup();
    controller.start();
    await flush();
    expect(handler).not.toHaveBeenCalled();

    useConnectivityStore.getState().setWorkOffline(false);
    await flush();

    expect(handler).toHaveBeenCalledTimes(1);
    controller.stop();
  });

  it('no envía mientras hay un partido abierto y lo hace al cerrarlo', async () => {
    const release = useSyncStore.getState().blockSync();
    const { handler, controller } = await setup();
    controller.start();
    await flush();
    expect(handler).not.toHaveBeenCalled();

    release();
    await flush();

    expect(handler).toHaveBeenCalledTimes(1);
    controller.stop();
  });

  it('sin usuario no hace nada', async () => {
    const { handler, controller } = await setup(null);

    controller.start();
    await flush();

    expect(handler).not.toHaveBeenCalled();
    controller.stop();
  });

  it('el botón «Sincronizar» envía aunque el pendiente esté esperando un reintento', async () => {
    const { store, handler, controller } = await setup();
    handler.mockRejectedValueOnce(new AxiosError('Network Error', 'ERR_NETWORK'));
    controller.start();
    await flush();
    expect(useSyncStore.getState().pending).toBe(1);

    await controller.syncNow();

    expect(handler).toHaveBeenCalledTimes(2);
    expect(await listOutbox(store, 'u1')).toEqual([]);
    controller.stop();
  });

  it('reintenta solo cuando vence la espera', async () => {
    const { handler, controller } = await setup();
    handler.mockRejectedValueOnce(new AxiosError('Network Error', 'ERR_NETWORK'));
    controller.start();
    await flush();
    expect(handler).toHaveBeenCalledTimes(1);

    await vi.advanceTimersByTimeAsync(31_000);

    expect(handler).toHaveBeenCalledTimes(2);
    controller.stop();
  });

  it('syncNow sin red no intenta nada', async () => {
    useConnectivityStore.setState({ networkOnline: false });
    const { handler, controller } = await setup();

    await controller.syncNow();

    expect(handler).not.toHaveBeenCalled();
  });

  it('cuenta aparte los que requieren atención', async () => {
    const { handler, controller } = await setup();
    handler.mockRejectedValue(
      new AxiosError('x', 'ERR_BAD_REQUEST', undefined, undefined, { status: 409 } as never),
    );

    controller.start();
    await flush();

    expect(useSyncStore.getState()).toMatchObject({ pending: 0, needsAttention: 1 });
    controller.stop();
  });
});

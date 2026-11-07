import { describe, it, expect, vi } from 'vitest';
import { AxiosError } from 'axios';
import { createMemoryLocalStore } from './memoryLocalStore';
import { enqueueOperation, listOutbox } from './outbox';
import { createSyncEngine, backoffDelay } from './syncEngine';

const rejection = (status: number, error?: string) =>
  new AxiosError('x', 'ERR_BAD_REQUEST', undefined, undefined, {
    status,
    data: error ? { success: false, error } : undefined,
  } as never);
const networkError = () => new AxiosError('Network Error', 'ERR_NETWORK');

const setup = async (ids = ['a', 'b']) => {
  const store = createMemoryLocalStore();
  await store.apply(
    'u1',
    ids.map((id) => enqueueOperation({ id, kind: 'rutina', payload: id }, 1)),
  );
  let clock = 1_000;
  const handler = vi.fn().mockResolvedValue(undefined);
  const isBlocked = vi.fn().mockReturnValue(false);
  const engine = createSyncEngine({
    store,
    handlers: { rutina: handler },
    now: () => clock,
    isBlocked,
  });
  return { store, engine, handler, isBlocked, advance: (ms: number) => (clock += ms) };
};

describe('syncEngine', () => {
  it('envía los pendientes por orden y los elimina de la cola', async () => {
    const { store, engine, handler } = await setup();

    const result = await engine.run('u1');

    expect(handler.mock.calls.map(([payload]) => payload)).toEqual(['a', 'b']);
    expect(await listOutbox(store, 'u1')).toEqual([]);
    expect(result).toMatchObject({ sent: 2, needsAttention: 0, stopped: null });
  });

  it('sin red conserva el pendiente, cuenta el intento y espera más cada vez', async () => {
    const { store, engine, handler, advance } = await setup(['a']);
    handler.mockRejectedValue(networkError());

    const first = await engine.run('u1');
    const [afterFirst] = await listOutbox(store, 'u1');
    advance(backoffDelay(1));
    await engine.run('u1');
    const [afterSecond] = await listOutbox(store, 'u1');

    expect(first.stopped).toBe('network');
    expect(afterFirst).toMatchObject({ status: 'pendiente', attempts: 1 });
    expect(afterSecond.attempts).toBe(2);
    expect(afterSecond.nextAttemptAt - 1_000 - backoffDelay(1)).toBe(backoffDelay(2));
  });

  it('el fallo de red detiene la tanda: no sigue con los demás', async () => {
    const { engine, handler } = await setup();
    handler.mockRejectedValue(networkError());

    await engine.run('u1');

    expect(handler).toHaveBeenCalledTimes(1);
  });

  it('un error del servidor (5xx) se trata como reintentable', async () => {
    const { store, engine, handler } = await setup(['a']);
    handler.mockRejectedValue(rejection(503));

    await engine.run('u1');

    expect((await listOutbox(store, 'u1'))[0]).toMatchObject({ status: 'pendiente', attempts: 1 });
  });

  it.each([400, 403, 404, 409])(
    'el rechazo %i pasa a «requiere atención» con el motivo y sigue con el resto',
    async (status) => {
      const { store, engine, handler } = await setup();
      handler.mockRejectedValueOnce(rejection(status, 'Nombre duplicado')).mockResolvedValue(undefined);

      const result = await engine.run('u1');

      const items = await listOutbox(store, 'u1');
      expect(items).toHaveLength(1);
      expect(items[0]).toMatchObject({ id: 'a', status: 'requiere-atencion', reason: 'Nombre duplicado' });
      expect(result).toMatchObject({ sent: 1, needsAttention: 1, stopped: null });
    },
  );

  it('un pendiente que requiere atención no se vuelve a enviar solo', async () => {
    const { engine, handler } = await setup(['a']);
    handler.mockRejectedValueOnce(rejection(409));
    await engine.run('u1');

    await engine.run('u1', { force: true });

    expect(handler).toHaveBeenCalledTimes(1);
  });

  it('respeta la espera de un pendiente salvo que el envío sea manual', async () => {
    const { engine, handler } = await setup(['a']);
    handler.mockRejectedValueOnce(networkError());
    await engine.run('u1');
    handler.mockClear();

    await engine.run('u1');
    expect(handler).not.toHaveBeenCalled();

    await engine.run('u1', { force: true });
    expect(handler).toHaveBeenCalledTimes(1);
  });

  it('no sincroniza mientras haya un partido abierto', async () => {
    const { store, engine, handler, isBlocked } = await setup();
    isBlocked.mockReturnValue(true);

    const result = await engine.run('u1');

    expect(handler).not.toHaveBeenCalled();
    expect(await listOutbox(store, 'u1')).toHaveLength(2);
    expect(result.stopped).toBe('blocked');
  });

  it('un tipo sin manejador pasa a «requiere atención»', async () => {
    const store = createMemoryLocalStore();
    await store.apply('u1', [enqueueOperation({ id: 'z', kind: 'raro', payload: 1 }, 1)]);
    const engine = createSyncEngine({ store, handlers: {}, now: () => 1 });

    await engine.run('u1');

    expect((await listOutbox(store, 'u1'))[0]).toMatchObject({ status: 'requiere-atencion' });
  });

  it('recupera lo que se quedó «enviando» por un cierre de la app', async () => {
    const { store, engine, handler } = await setup(['a']);
    const [item] = await listOutbox(store, 'u1');
    await store.apply('u1', [
      { type: 'put', collection: 'outbox', id: 'a', status: 'enviando', value: { ...item } },
    ]);

    await engine.run('u1');

    expect(handler).toHaveBeenCalledTimes(1);
  });

  it('dos ejecuciones a la vez comparten una sola tanda', async () => {
    const { engine, handler } = await setup(['a']);

    await Promise.all([engine.run('u1'), engine.run('u1')]);

    expect(handler).toHaveBeenCalledTimes(1);
  });

  it('solo envía los pendientes del usuario indicado', async () => {
    const { store, engine, handler } = await setup(['a']);
    await store.apply('u2', [enqueueOperation({ id: 'x', kind: 'rutina', payload: 'x' }, 1)]);

    await engine.run('u1');

    expect(handler).toHaveBeenCalledTimes(1);
    expect(await listOutbox(store, 'u2')).toHaveLength(1);
  });

  it('el retraso crece de forma exponencial con un tope', () => {
    expect(backoffDelay(2)).toBe(backoffDelay(1) * 2);
    expect(backoffDelay(50)).toBe(backoffDelay(49));
  });

  it('el manejador recibe el almacén y el usuario para poder anotar el resultado', async () => {
    const { engine, handler, store } = await setup(['a']);

    await engine.run('u1');

    expect(handler).toHaveBeenCalledWith('a', expect.anything(), { store, userId: 'u1' });
  });

  it('si el pendiente se vuelve a encolar durante el envío, no se pierde ese cambio', async () => {
    const { store, engine, handler } = await setup(['a']);
    handler.mockImplementation(async () => {
      await store.apply('u1', [enqueueOperation({ id: 'a', kind: 'rutina', payload: 'nuevo' }, 5)]);
    });

    await engine.run('u1');

    expect(await listOutbox(store, 'u1')).toMatchObject([{ id: 'a', payload: 'nuevo', status: 'pendiente' }]);
  });

  it('si el pendiente se descarta durante el envío, no reaparece', async () => {
    const { store, engine, handler } = await setup(['a']);
    handler.mockImplementation(async () => {
      await store.apply('u1', [{ type: 'remove', collection: 'outbox', id: 'a' }]);
      throw new AxiosError('x', 'ERR_BAD_REQUEST', undefined, undefined, { status: 409 } as never);
    });

    await engine.run('u1');

    expect(await listOutbox(store, 'u1')).toEqual([]);
  });
});

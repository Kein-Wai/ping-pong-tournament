import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AxiosError } from 'axios';
import type { SavedWarmupRoutine } from '../types/warmupRoutine';
import { createMemoryLocalStore } from './memoryLocalStore';
import { ROUTINES_COLLECTION, type LocalRoutine } from './warmupRoutinesRepository';
import { createWarmupRoutineHandler } from './warmupRoutinesSync';

const ITEMS = [{ exerciseKey: 'estiramientos' as const, durationSec: 60, restSec: 10 }];
const item = { id: 'rutina:l1' } as never;

const rejection = (status: number, error: string) =>
  new AxiosError('x', 'ERR_BAD_REQUEST', undefined, undefined, { status, data: { error } } as never);

const saved = (id: string, name: string): SavedWarmupRoutine => ({
  id,
  name,
  items: ITEMS,
  createdAt: '2026-11-01T10:00:00.000Z',
  updatedAt: '2026-11-01T10:00:00.000Z',
});

const setup = async (local: Partial<LocalRoutine> = {}) => {
  const store = createMemoryLocalStore();
  const routine: LocalRoutine = {
    ...saved('l1', 'Torneo'),
    serverId: null,
    syncError: null,
    ...local,
  };
  await store.apply('u1', [{ type: 'put', collection: ROUTINES_COLLECTION, id: 'l1', value: routine }]);
  const service = { list: vi.fn(), create: vi.fn(), update: vi.fn(), remove: vi.fn() };
  const notify = vi.fn();
  const handler = createWarmupRoutineHandler({ service, notify });
  const run = (payload: unknown) => handler(payload, item, { store, userId: 'u1' });
  const read = async () => (await store.get<LocalRoutine>('u1', ROUTINES_COLLECTION, 'l1'))?.value;
  return { store, service, notify, run, read };
};

describe('manejador de rutinas', () => {
  beforeEach(() => vi.clearAllMocks());

  it('una rutina nueva se crea en el servidor y se anota su id', async () => {
    const { run, service, read } = await setup();
    service.create.mockResolvedValue(saved('srv-1', 'Torneo'));

    await run({ op: 'save', routineId: 'l1' });

    expect(service.create).toHaveBeenCalledWith({ name: 'Torneo', items: ITEMS });
    expect(await read()).toMatchObject({ id: 'l1', serverId: 'srv-1', syncError: null });
  });

  it('una rutina ya creada se actualiza en el servidor con su id de allí', async () => {
    const { run, service } = await setup({ serverId: 'srv-1', name: 'Editada' });
    service.update.mockResolvedValue(saved('srv-1', 'Editada'));

    await run({ op: 'save', routineId: 'l1' });

    expect(service.update).toHaveBeenCalledWith('srv-1', { name: 'Editada', items: ITEMS });
    expect(service.create).not.toHaveBeenCalled();
  });

  it('si la rutina se borró del móvil antes de enviar, no hace nada', async () => {
    const { run, service, store } = await setup();
    await store.apply('u1', [{ type: 'remove', collection: ROUTINES_COLLECTION, id: 'l1' }]);

    await run({ op: 'save', routineId: 'l1' });

    expect(service.create).not.toHaveBeenCalled();
  });

  it('no pisa lo que el usuario editó mientras se enviaba', async () => {
    const { run, service, store, read } = await setup();
    service.create.mockImplementation(async () => {
      const current = (await read())!;
      await store.apply('u1', [
        { type: 'put', collection: ROUTINES_COLLECTION, id: 'l1', value: { ...current, name: 'Más nueva' } },
      ]);
      return saved('srv-1', 'Torneo');
    });

    await run({ op: 'save', routineId: 'l1' });

    expect(await read()).toMatchObject({ name: 'Más nueva', serverId: 'srv-1' });
  });

  it('el borrado elimina la rutina del servidor', async () => {
    const { run, service } = await setup();

    await run({ op: 'delete', routineId: 'l1', serverId: 'srv-1' });

    expect(service.remove).toHaveBeenCalledWith('srv-1');
  });

  it('borrar algo que ya no existe en el servidor se da por hecho', async () => {
    const { run, service } = await setup();
    service.remove.mockRejectedValue(
      new AxiosError('x', 'ERR_BAD_REQUEST', undefined, undefined, { status: 404 } as never),
    );

    await expect(run({ op: 'delete', routineId: 'l1', serverId: 'srv-1' })).resolves.toBeUndefined();
  });

  describe('nombre repetido', () => {
    it('se guarda con « (2)» y se avisa al usuario', async () => {
      const { run, service, notify, read } = await setup();
      service.create
        .mockRejectedValueOnce(rejection(409, 'Ya tienes una rutina con ese nombre.'))
        .mockResolvedValueOnce(saved('srv-1', 'Torneo (2)'));

      await run({ op: 'save', routineId: 'l1' });

      expect(service.create).toHaveBeenLastCalledWith({ name: 'Torneo (2)', items: ITEMS });
      expect(await read()).toMatchObject({ name: 'Torneo (2)', serverId: 'srv-1' });
      expect(notify).toHaveBeenCalledWith(expect.stringContaining('Torneo (2)'));
    });

    it('si « (2)» también existe prueba con « (3)»', async () => {
      const { run, service } = await setup();
      const duplicate = rejection(409, 'Ya tienes una rutina con ese nombre.');
      service.create
        .mockRejectedValueOnce(duplicate)
        .mockRejectedValueOnce(duplicate)
        .mockResolvedValueOnce(saved('srv-1', 'Torneo (3)'));

      await run({ op: 'save', routineId: 'l1' });

      expect(service.create).toHaveBeenLastCalledWith({ name: 'Torneo (3)', items: ITEMS });
    });

    it('recorta el nombre base para que con el sufijo no pase de 40 caracteres', async () => {
      const longName = 'x'.repeat(40);
      const { run, service } = await setup({ name: longName });
      service.create
        .mockRejectedValueOnce(rejection(409, 'Ya tienes una rutina con ese nombre.'))
        .mockResolvedValueOnce(saved('srv-1', 'ok'));

      await run({ op: 'save', routineId: 'l1' });

      const retried = service.create.mock.calls[1][0].name as string;
      expect(retried.length).toBeLessThanOrEqual(40);
      expect(retried.endsWith(' (2)')).toBe(true);
    });

    it('al actualizar una rutina del servidor también reintenta con otro nombre', async () => {
      const { run, service } = await setup({ serverId: 'srv-1' });
      service.update
        .mockRejectedValueOnce(rejection(409, 'Ya tienes una rutina con ese nombre.'))
        .mockResolvedValueOnce(saved('srv-1', 'Torneo (2)'));

      await run({ op: 'save', routineId: 'l1' });

      expect(service.update).toHaveBeenLastCalledWith('srv-1', { name: 'Torneo (2)', items: ITEMS });
    });
  });

  describe('fallos que el usuario debe resolver', () => {
    it('el tope de rutinas deja la rutina en el móvil marcada «No se pudo sincronizar»', async () => {
      const { run, service, read } = await setup();
      const max = rejection(409, 'Has alcanzado el máximo de 5 rutinas. Borra una para guardar otra.');
      service.create.mockRejectedValue(max);

      await expect(run({ op: 'save', routineId: 'l1' })).rejects.toBe(max);

      expect((await read())?.syncError).toMatch(/No se pudo sincronizar.*máximo de 5/);
    });

    it('un fallo de red se propaga sin marcar la rutina', async () => {
      const { run, service, read } = await setup();
      service.create.mockRejectedValue(new AxiosError('Network Error', 'ERR_NETWORK'));

      await expect(run({ op: 'save', routineId: 'l1' })).rejects.toBeDefined();

      expect((await read())?.syncError).toBeNull();
    });

    it('un rechazo 404 al actualizar marca la rutina como no sincronizada', async () => {
      const { run, service, read } = await setup({ serverId: 'srv-1' });
      service.update.mockRejectedValue(rejection(404, 'Rutina no encontrada'));

      await expect(run({ op: 'save', routineId: 'l1' })).rejects.toBeDefined();

      expect((await read())?.syncError).toMatch(/No se pudo sincronizar/);
    });
  });
});

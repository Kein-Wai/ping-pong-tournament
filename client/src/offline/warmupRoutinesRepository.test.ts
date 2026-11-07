import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { SavedWarmupRoutine } from '../types/warmupRoutine';
import { createMemoryLocalStore } from './memoryLocalStore';
import { listOutbox } from './outbox';
import { createWarmupRoutinesRepository } from './warmupRoutinesRepository';

const ITEMS = [{ exerciseKey: 'estiramientos' as const, durationSec: 60, restSec: 10 }];
const server = (id: string, name: string, updatedAt = '2026-10-01T10:00:00.000Z'): SavedWarmupRoutine => ({
  id,
  name,
  items: ITEMS,
  createdAt: updatedAt,
  updatedAt,
});

const setup = (options: { online?: boolean; native?: boolean } = {}) => {
  const store = createMemoryLocalStore();
  const service = {
    list: vi.fn().mockResolvedValue([]),
    create: vi.fn(),
    update: vi.fn(),
    remove: vi.fn(),
  };
  const afterChange = vi.fn();
  let counter = 0;
  let clock = Date.parse('2026-11-01T10:00:00.000Z');
  const network = { online: options.online ?? false };
  const repository = createWarmupRoutinesRepository({
    service,
    getStore: async () => (options.native === false ? null : store),
    getUserId: () => 'u1',
    isOnline: () => network.online,
    newId: () => `local-${++counter}`,
    now: () => (clock += 1000),
    afterChange,
  });
  return { store, service, repository, afterChange, network };
};

describe('warmupRoutinesRepository', () => {
  beforeEach(() => vi.clearAllMocks());

  describe('en el navegador (sin almacén local)', () => {
    it('delega todo en el servicio', async () => {
      const { repository, service } = setup({ native: false, online: true });
      service.list.mockResolvedValue([server('r1', 'A')]);
      service.create.mockResolvedValue(server('r2', 'B'));

      expect(await repository.list()).toEqual([server('r1', 'A')]);
      expect(await repository.create({ name: 'B', items: ITEMS })).toEqual(server('r2', 'B'));
      await repository.update('r1', { name: 'X', items: ITEMS });
      await repository.remove('r1');

      expect(service.update).toHaveBeenCalledWith('r1', { name: 'X', items: ITEMS });
      expect(service.remove).toHaveBeenCalledWith('r1');
    });
  });

  describe('listar', () => {
    it('con red guarda en el móvil lo que hay en el servidor y lo devuelve', async () => {
      const { repository, service, network } = setup({ online: true });
      service.list.mockResolvedValue([server('r1', 'A')]);

      const online = await repository.list();
      service.list.mockClear();
      network.online = false;
      const offline = await repository.list();

      expect(online).toMatchObject([{ id: 'r1', name: 'A' }]);
      expect(offline).toMatchObject([{ id: 'r1', name: 'A' }]);
      expect(service.list).not.toHaveBeenCalled();
    });

    it('sin red devuelve lo guardado en el móvil sin pedir nada', async () => {
      const { repository, service } = setup({ online: false });

      expect(await repository.list()).toEqual([]);
      expect(service.list).not.toHaveBeenCalled();
    });

    it('si el servidor falla con red, usa lo guardado', async () => {
      const { repository, service } = setup({ online: true });
      service.list.mockResolvedValueOnce([server('r1', 'A')]);
      await repository.list();
      service.list.mockRejectedValue(new Error('Network Error'));

      expect(await repository.list()).toMatchObject([{ id: 'r1' }]);
    });

    it('las más recientes primero', async () => {
      const { repository, service } = setup({ online: true });
      service.list.mockResolvedValue([
        server('r1', 'Vieja', '2026-10-01T10:00:00.000Z'),
        server('r2', 'Nueva', '2026-10-05T10:00:00.000Z'),
      ]);

      expect((await repository.list()).map((r) => r.id)).toEqual(['r2', 'r1']);
    });

    it('una rutina borrada en otro dispositivo desaparece del móvil', async () => {
      const { repository, service } = setup({ online: true });
      service.list.mockResolvedValueOnce([server('r1', 'A'), server('r2', 'B')]);
      await repository.list();
      service.list.mockResolvedValueOnce([server('r1', 'A')]);

      expect((await repository.list()).map((r) => r.id)).toEqual(['r1']);
    });

    it('un cambio local pendiente no se pisa con la versión del servidor', async () => {
      const { repository, service } = setup({ online: true });
      service.list.mockResolvedValue([server('r1', 'A')]);
      await repository.list();
      await repository.update('r1', { name: 'Editada sin red', items: ITEMS });

      const result = await repository.list();

      expect(result[0].name).toBe('Editada sin red');
    });
  });

  describe('crear', () => {
    it('guarda la rutina en el móvil con un id propio y la deja en cola', async () => {
      const { repository, store, afterChange } = setup();

      const created = await repository.create({ name: 'Nueva', items: ITEMS });

      expect(created).toMatchObject({ id: 'local-1', name: 'Nueva', items: ITEMS });
      expect((await repository.list()).map((r) => r.id)).toEqual(['local-1']);
      expect(await listOutbox(store, 'u1')).toMatchObject([
        { id: 'rutina:local-1', kind: 'rutina', payload: { op: 'save', routineId: 'local-1' } },
      ]);
      expect(afterChange).toHaveBeenCalled();
    });

    it('no deja pasar de 5 rutinas guardadas en el móvil', async () => {
      const { repository } = setup();
      for (let i = 0; i < 5; i++) await repository.create({ name: `R${i}`, items: ITEMS });

      await expect(repository.create({ name: 'Sexta', items: ITEMS })).rejects.toThrow(/máximo/);
    });
  });

  describe('editar', () => {
    it('cambia la rutina en el móvil y la deja en cola; dos ediciones seguidas dejan un solo envío', async () => {
      const { repository, store } = setup();
      const { id } = await repository.create({ name: 'A', items: ITEMS });

      await repository.update(id, { name: 'B', items: ITEMS });
      await repository.update(id, { name: 'C', items: ITEMS });

      expect((await repository.list())[0].name).toBe('C');
      expect(await listOutbox(store, 'u1')).toHaveLength(1);
    });

    it('editar una rutina que no existe falla', async () => {
      const { repository } = setup();

      await expect(repository.update('nada', { name: 'X', items: ITEMS })).rejects.toThrow();
    });

    it('editar la rutina que no se pudo sincronizar limpia su aviso', async () => {
      const { repository, store } = setup();
      const { id } = await repository.create({ name: 'A', items: ITEMS });
      const doc = await store.get<{ syncError: string | null }>('u1', 'rutinas', id);
      await store.apply('u1', [
        { type: 'put', collection: 'rutinas', id, value: { ...doc!.value, syncError: 'fallo' } },
      ]);

      await repository.update(id, { name: 'A2', items: ITEMS });

      expect((await repository.list())[0].syncError).toBeNull();
    });
  });

  describe('borrar', () => {
    it('una rutina ya sincronizada se quita del móvil y deja el borrado en cola con su id del servidor', async () => {
      const { repository, service, store } = setup({ online: true });
      service.list.mockResolvedValue([server('r1', 'A')]);
      await repository.list();

      await repository.remove('r1');

      expect(await repository.list()).toEqual([]);
      expect(await listOutbox(store, 'u1')).toMatchObject([
        { id: 'rutina:r1', payload: { op: 'delete', routineId: 'r1', serverId: 'r1' } },
      ]);
    });

    it('una rutina que nunca llegó al servidor se quita sin dejar nada en cola', async () => {
      const { repository, store } = setup();
      const { id } = await repository.create({ name: 'A', items: ITEMS });

      await repository.remove(id);

      expect(await repository.list()).toEqual([]);
      expect(await listOutbox(store, 'u1')).toEqual([]);
    });
  });
});

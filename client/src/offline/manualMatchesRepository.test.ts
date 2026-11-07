import { describe, it, expect, vi } from 'vitest';
import { createMemoryLocalStore } from './memoryLocalStore';
import { listOutbox } from './outbox';
import { createManualMatchesRepository } from './manualMatchesRepository';
import type { MatchData } from './localMatches';

const ME = { id: 'me', name: 'Ana', surname: 'Pérez', nickname: null };

const serverMatch = (id: string, overrides: Partial<MatchData & { version: number }> = {}) =>
  ({
    id,
    userId: 'me',
    date: '2026-11-01T00:00:00.000Z',
    location: 'Casa',
    matchType: 'Amistoso',
    format: 'Individual',
    setsToWin: 3,
    opponentName: `Rival ${id}`,
    status: 'Completado',
    mySets: 3,
    opponentSets: 1,
    analysisType: 'Extenso',
    points: [{ id: `${id}-p1`, setNumber: 1, pointOrder: 1, isWon: true }],
    version: 4,
    ...overrides,
  }) as never;

const setup = (options: { online?: boolean; native?: boolean } = {}) => {
  const store = createMemoryLocalStore();
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
  const network = { online: options.online ?? false };
  const afterChange = vi.fn();
  let counter = 0;
  const repository = createManualMatchesRepository({
    service,
    getStore: async () => (options.native === false ? null : store),
    getUser: () => ME,
    isOnline: () => network.online,
    newId: () => `id-${++counter}`,
    now: () => Date.parse('2026-11-07T10:00:00.000Z'),
    afterChange,
  });
  return { store, service, repository, network, afterChange };
};

const CREATE = {
  opponentName: 'Rival',
  matchType: 'Amistoso' as const,
  location: 'Casa' as const,
  format: 'Individual' as const,
  analysisType: 'Extenso' as const,
  status: 'Iniciado' as const,
  setsToWin: 3,
};

describe('manualMatchesRepository', () => {
  describe('en el navegador (sin almacén local)', () => {
    it('delega todo en el servicio', async () => {
      const { repository, service } = setup({ native: false });
      service.list.mockResolvedValue([{ id: 'a' }]);
      service.byId.mockResolvedValue({ id: 'a' });
      service.create.mockResolvedValue({ id: 'b' });
      service.addPoint.mockResolvedValue({ id: 'p' });

      expect(await repository.list({ playerId: 'x' })).toEqual([{ id: 'a' }]);
      expect(service.list).toHaveBeenCalledWith({ playerId: 'x' });
      expect(await repository.byId('a')).toEqual({ id: 'a' });
      expect(await repository.create(CREATE)).toEqual({ id: 'b' });
      await repository.update('a', { opponentName: 'X' });
      await repository.addPoint('a', { setNumber: 1, pointOrder: 1, isWon: true });
      await repository.deletePoint('a', 'p');
      await repository.complete('a', { mySets: 3, opponentSets: 0 });

      expect(service.update).toHaveBeenCalledWith('a', { opponentName: 'X' });
      expect(service.deletePoint).toHaveBeenCalledWith('a', 'p');
      expect(service.complete).toHaveBeenCalledWith('a', { mySets: 3, opponentSets: 0 });
    });
  });

  describe('crear', () => {
    it('crea el partido en el móvil con un id propio y lo deja en cola sin llamar al servidor', async () => {
      const { repository, service, store, afterChange } = setup({ online: true });

      const created = await repository.create(CREATE);

      expect(created).toMatchObject({ id: 'id-1', opponentName: 'Rival', status: 'Iniciado', userId: 'me' });
      expect(service.create).not.toHaveBeenCalled();
      expect(await listOutbox(store, 'me')).toMatchObject([
        { id: 'partido:id-1', kind: 'partido', payload: { matchId: 'id-1' } },
      ]);
      expect(afterChange).toHaveBeenCalled();
    });

    it('un entrenador lo crea a nombre de un jugador', async () => {
      const { repository } = setup();

      const created = await repository.create({ ...CREATE, playerId: 'player-9' });

      expect(created).toMatchObject({ userId: 'player-9', coachId: 'me' });
    });

    it('aparece enseguida en el listado como pendiente de enviar', async () => {
      const { repository } = setup();
      await repository.create(CREATE);

      const rows = await repository.list();

      expect(rows).toMatchObject([{ id: 'id-1', localState: 'pendiente' }]);
    });
  });

  describe('listar', () => {
    it('con red guarda la lista del servidor y la devuelve; sin red usa lo guardado', async () => {
      const { repository, service, network } = setup({ online: true });
      service.list.mockResolvedValue([serverMatch('a')]);
      service.byId.mockResolvedValue(serverMatch('a'));

      const online = await repository.list();
      service.list.mockClear();
      network.online = false;
      const offline = await repository.list();

      expect(online).toMatchObject([{ id: 'a' }]);
      expect(offline).toMatchObject([{ id: 'a' }]);
      expect(service.list).not.toHaveBeenCalled();
    });

    it('si el servidor falla con red, usa lo guardado', async () => {
      const { repository, service } = setup({ online: true });
      service.list.mockResolvedValueOnce([serverMatch('a')]);
      await repository.list();
      service.list.mockRejectedValue(new Error('Network Error'));

      expect(await repository.list()).toMatchObject([{ id: 'a' }]);
    });

    it('filtra por jugador y ordena por fecha, el más reciente primero', async () => {
      const { repository, service } = setup({ online: true });
      service.list.mockResolvedValue([
        serverMatch('viejo', { date: '2026-10-01T00:00:00.000Z' }),
        serverMatch('nuevo', { date: '2026-11-05T00:00:00.000Z' }),
        serverMatch('ajeno', { userId: 'otro' }),
      ]);

      expect((await repository.list()).map((m) => m.id)).toEqual(['nuevo', 'ajeno', 'viejo']);
      expect((await repository.list({ playerId: 'otro' })).map((m) => m.id)).toEqual(['ajeno']);
    });

    it('un cambio local sin enviar prevalece sobre lo que dice el servidor', async () => {
      const { repository, service } = setup({ online: true });
      service.list.mockResolvedValue([serverMatch('a', { status: 'Programado' })]);
      service.byId.mockResolvedValue(serverMatch('a', { status: 'Programado' }));
      await repository.list();
      await repository.prefetched();
      await repository.update('a', { status: 'Iniciado' });

      const rows = await repository.list();

      expect(rows[0]).toMatchObject({ status: 'Iniciado', localState: 'pendiente' });
    });

    it('descarga el detalle de los 20 más recientes para poder abrirlos sin red', async () => {
      const { repository, service } = setup({ online: true });
      const rows = Array.from({ length: 25 }, (_, i) =>
        serverMatch(`m${i}`, { date: `2026-10-${String(i + 1).padStart(2, '0')}T00:00:00.000Z` }),
      );
      service.list.mockResolvedValue(rows);
      service.byId.mockImplementation(async (id: string) => serverMatch(id));

      await repository.list();
      await repository.prefetched();

      expect(service.byId).toHaveBeenCalledTimes(20);
      expect(service.byId).toHaveBeenCalledWith('m24');
      expect(service.byId).not.toHaveBeenCalledWith('m0');
    });
  });

  describe('abrir un partido', () => {
    it('sin red devuelve el detalle descargado antes', async () => {
      const { repository, service, network } = setup({ online: true });
      service.list.mockResolvedValue([serverMatch('a')]);
      service.byId.mockResolvedValue(serverMatch('a'));
      await repository.list();
      await repository.prefetched();
      network.online = false;

      expect(await repository.byId('a')).toMatchObject({ id: 'a', points: [{ id: 'a-p1' }] });
    });

    it('sin red y sin detalle descargado avisa de que no está disponible', async () => {
      const { repository, service, network } = setup({ online: true });
      service.list.mockResolvedValue([serverMatch('a')]);
      await repository.list();
      network.online = false;

      await expect(repository.byId('a')).rejects.toThrow(/sin conexión/);
    });

    it('con red descarga el detalle y lo guarda', async () => {
      const { repository, service, network } = setup({ online: true });
      service.byId.mockResolvedValue(serverMatch('a'));

      await repository.byId('a');
      network.online = false;

      expect(await repository.byId('a')).toMatchObject({ id: 'a' });
    });

    it('si hay cambios locales sin enviar, no los pisa con la versión del servidor', async () => {
      const { repository, service } = setup({ online: true });
      service.byId.mockResolvedValue(serverMatch('a', { opponentName: 'Servidor' }));
      await repository.byId('a');
      await repository.update('a', { opponentName: 'Local' });

      expect(await repository.byId('a')).toMatchObject({ opponentName: 'Local' });
    });
  });

  describe('registrar puntos', () => {
    const open = async () => {
      const ctx = setup();
      const { id } = await ctx.repository.create(CREATE);
      ctx.repository.openMatch(id);
      return { ...ctx, id };
    };

    it('añade el punto en el móvil con un id propio sin llamar al servidor', async () => {
      const { repository, service, id } = await open();

      const point = await repository.addPoint<{ id: string }>(id, { setNumber: 1, pointOrder: 1, isWon: true });

      expect(point.id).toMatch(/^id-/);
      expect(point.id).not.toBe(id);
      expect(service.addPoint).not.toHaveBeenCalled();
      expect((await repository.byId(id)).points).toHaveLength(1);
    });

    it('deshacer quita el punto', async () => {
      const { repository, id } = await open();
      const { id: pointId } = await repository.addPoint<{ id: string }>(id, { setNumber: 1, pointOrder: 1, isWon: true });

      await repository.deletePoint(id, pointId);

      expect((await repository.byId(id)).points).toEqual([]);
    });

    it('mientras el partido está abierto los cambios no se encolan; al cerrarlo se encola una sola vez', async () => {
      const { repository, store, afterChange, id } = await open();
      await repository.addPoint(id, { setNumber: 1, pointOrder: 1, isWon: true });
      await repository.update(id, { opponentName: 'Cambiado' });
      expect(await listOutbox(store, 'me')).toHaveLength(1);
      afterChange.mockClear();

      await repository.closeMatch(id);

      const queue = await listOutbox(store, 'me');
      expect(queue).toHaveLength(1);
      expect(afterChange).toHaveBeenCalled();
    });

    it('cerrar un partido sin cambios no encola nada', async () => {
      const { repository, service, store, afterChange } = setup({ online: true });
      service.byId.mockResolvedValue(serverMatch('a'));
      await repository.byId('a');
      repository.openMatch('a');
      afterChange.mockClear();

      await repository.closeMatch('a');

      expect(await listOutbox(store, 'me')).toEqual([]);
      expect(afterChange).not.toHaveBeenCalled();
    });
  });

  describe('finalizar', () => {
    it('guarda el resultado en el móvil, lo marca completado y lo deja en cola', async () => {
      const { repository, service, store } = setup();
      const { id } = await repository.create(CREATE);

      const done = await repository.complete(id, {
        mySets: 3,
        opponentSets: 1,
        setScores: [{ myScore: 11, oppScore: 5 }],
        lightNotes: 'bien',
      });

      expect(done).toMatchObject({ status: 'Completado', mySets: 3, opponentSets: 1, lightNotes: 'bien' });
      expect(service.complete).not.toHaveBeenCalled();
      expect(await listOutbox(store, 'me')).toHaveLength(1);
    });
  });

  describe('modificar fuera del análisis', () => {
    it('cambiar el rival o planificar se encola enseguida', async () => {
      const { repository, store, afterChange } = setup();
      const { id } = await repository.create({ ...CREATE, status: 'Programado' });
      afterChange.mockClear();

      await repository.update(id, { planningNotes: '{"strategy":"x"}' });

      expect(await listOutbox(store, 'me')).toHaveLength(1);
      expect(afterChange).toHaveBeenCalled();
      expect(await repository.byId(id)).toMatchObject({ planningNotes: '{"strategy":"x"}' });
    });

    it('editar un partido que no está en el móvil falla', async () => {
      const { repository } = setup();

      await expect(repository.update('nada', { opponentName: 'X' })).rejects.toThrow();
    });
  });

  describe('arranque', () => {
    it('encola los partidos con cambios que se quedaron sin enviar (app cerrada con el partido abierto)', async () => {
      const { repository, store } = setup();
      const { id } = await repository.create(CREATE);
      repository.openMatch(id);
      await repository.addPoint(id, { setNumber: 1, pointOrder: 1, isWon: true });
      await store.apply('me', [{ type: 'remove', collection: 'outbox', id: `partido:${id}` }]);

      await repository.enqueueUnsent();

      expect(await listOutbox(store, 'me')).toHaveLength(1);
    });

    it('no encola un partido que sigue abierto', async () => {
      const { repository, store } = setup();
      const { id } = await repository.create(CREATE);
      repository.openMatch(id);
      await repository.addPoint(id, { setNumber: 1, pointOrder: 1, isWon: true });
      await store.apply('me', [{ type: 'remove', collection: 'outbox', id: `partido:${id}` }]);

      await repository.enqueueUnsent({ except: [id] });

      expect(await listOutbox(store, 'me')).toEqual([]);
    });
  });
});

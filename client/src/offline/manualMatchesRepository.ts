import {
  manualMatchesService,
  type AddPointPayload,
  type CompleteMatchPayload,
  type CreateManualMatchPayload,
  type UpdateManualMatchPayload,
} from '../api/services/manualMatches';
import { useAuthStore } from '../store/authStore';
import { selectIsOnline, useConnectivityStore } from '../store/connectivityStore';
import type { ManualMatch, ManualMatchPlayer } from '../types/api';
import type { TrackedPoint } from '../types/manualMatch';
import { getAppLocalStore } from './appLocalStore';
import { getAppSync } from './appSync';
import type { LocalStore, StoreOperation } from './localStore';
import {
  fromServer,
  hasUnsentChanges,
  MATCH_LIST_COLLECTION,
  MATCH_LIST_ID,
  MATCH_OUTBOX_KIND,
  MATCHES_COLLECTION,
  RECENT_DETAILS,
  toView,
  type LocalMatch,
  type MatchData,
  type MatchView,
} from './localMatches';
import { enqueueOperation, listOutbox } from './outbox';
import { PLAYERS_CACHE_COLLECTION, PLAYERS_CACHE_ID } from './clubPlayersCache';

export const matchOutboxId = (matchId: string) => `${MATCH_OUTBOX_KIND}:${matchId}`;

type Service = Pick<
  typeof manualMatchesService,
  'list' | 'byId' | 'create' | 'update' | 'addPoint' | 'deletePoint' | 'complete'
>;

interface RepositoryDeps {
  service: Service;
  getStore: () => Promise<LocalStore | null>;
  /** Usuario con la sesión abierta, o `null` sin sesión. */
  getUser: () => (ManualMatchPlayer & { id: string }) | null;
  isOnline: () => boolean;
  newId: () => string;
  now: () => number;
  /** Se llama tras encolar un envío, para que la app lo mande cuanto antes. */
  afterChange: () => void;
}

const byDateDesc = (a: { date: string }, b: { date: string }) => b.date.localeCompare(a.date);

/**
 * Partidos de análisis con la misma interfaz que `manualMatchesService`. En el navegador delega en
 * el servidor. En la app nativa es local-first (ADR 0003): el partido vive entero en el móvil
 * desde que se crea, cada punto y cada cambio se guardan allí sin esperar a la red, y el documento
 * completo se envía de una vez al finalizar o al salir del análisis.
 */
export const createManualMatchesRepository = ({
  service,
  getStore,
  getUser,
  isOnline,
  newId,
  now,
  afterChange,
}: RepositoryDeps) => {
  /** Partidos abiertos en pantalla: sus cambios se acumulan y se encolan al cerrarlos. */
  const open = new Set<string>();
  let prefetching: Promise<void> = Promise.resolve();

  const local = async () => {
    const store = await getStore();
    const user = getUser();
    return store && user ? { store, userId: user.id, user } : null;
  };
  type Ctx = NonNullable<Awaited<ReturnType<typeof local>>>;

  const readDoc = async (ctx: Ctx, id: string) =>
    (await ctx.store.get<LocalMatch>(ctx.userId, MATCHES_COLLECTION, id))?.value ?? null;

  const putOp = (id: string, doc: LocalMatch): StoreOperation => ({
    type: 'put',
    collection: MATCHES_COLLECTION,
    id,
    value: doc,
  });

  /** Guarda la copia con un envío nuevo en cola, en una sola transacción. */
  const saveAndEnqueue = async (ctx: Ctx, doc: LocalMatch) => {
    const withSync = { ...doc, syncId: newId() };
    await ctx.store.apply(ctx.userId, [
      putOp(doc.data.id, withSync),
      enqueueOperation(
        {
          id: matchOutboxId(doc.data.id),
          kind: MATCH_OUTBOX_KIND,
          // El rival solo sirve para nombrar el pendiente en la lista; el envío lee la copia local.
          payload: { matchId: doc.data.id, opponent: doc.data.opponentName },
        },
        now(),
      ),
    ]);
    afterChange();
  };

  const getOrFail = async (ctx: Ctx, id: string) => {
    const doc = await readDoc(ctx, id);
    if (!doc) throw new Error('Partido no encontrado en este móvil.');
    return doc;
  };

  /** Aplica un cambio a la copia local; si el partido no está abierto en pantalla, lo encola al instante. */
  const edit = async (ctx: Ctx, id: string, change: (data: MatchData) => MatchData, enqueueNow = false) => {
    const doc = await getOrFail(ctx, id);
    const next: LocalMatch = { ...doc, data: change(doc.data), revision: doc.revision + 1 };
    if (enqueueNow || !open.has(id)) await saveAndEnqueue(ctx, next);
    else await ctx.store.apply(ctx.userId, [putOp(id, next)]);
    return next;
  };

  const ownerOf = async (ctx: Ctx, playerId: string | undefined): Promise<ManualMatchPlayer> => {
    if (!playerId || playerId === ctx.userId) return ctx.user;
    const cached = await ctx.store.get<ManualMatchPlayer[]>(ctx.userId, PLAYERS_CACHE_COLLECTION, PLAYERS_CACHE_ID);
    return cached?.value.find((p) => p.id === playerId) ?? { id: playerId, name: 'Jugador' };
  };

  /** Baja el detalle de los partidos más recientes que no tengan cambios locales. */
  const prefetchRecent = async (ctx: Ctx, rows: MatchData[]) => {
    for (const row of [...rows].sort(byDateDesc).slice(0, RECENT_DETAILS)) {
      try {
        const existing = await readDoc(ctx, row.id);
        if (existing && hasUnsentChanges(existing)) continue;
        const detail = await service.byId<MatchData & { version?: number }>(row.id);
        const current = await readDoc(ctx, row.id);
        if (current && hasUnsentChanges(current)) continue;
        await ctx.store.apply(ctx.userId, [putOp(row.id, fromServer(detail))]);
      } catch {
        // Sin red o sin acceso a ese partido: se queda sin detalle y se intentará en la próxima.
      }
    }
  };

  return {
    list: async (filters: { playerId?: string } = {}): Promise<ManualMatch[]> => {
      const ctx = await local();
      if (!ctx) return service.list(filters);

      if (isOnline()) {
        try {
          const rows = await service.list();
          await ctx.store.apply(ctx.userId, [
            { type: 'put', collection: MATCH_LIST_COLLECTION, id: MATCH_LIST_ID, value: rows },
          ]);
          prefetching = prefetchRecent(ctx, rows as unknown as MatchData[]);
        } catch {
          // Sin respuesta del servidor se trabaja con la lista guardada.
        }
      }

      const cached =
        (await ctx.store.get<MatchData[]>(ctx.userId, MATCH_LIST_COLLECTION, MATCH_LIST_ID))?.value ?? [];
      const merged = new Map<string, MatchView>(cached.map((row) => [row.id, row]));
      // La copia del móvil prevalece si tiene cambios sin enviar o un conflicto, y suma los creados sin conexión.
      for (const doc of (await ctx.store.list<LocalMatch>(ctx.userId, MATCHES_COLLECTION)).map((d) => d.value)) {
        const view = toView(doc);
        if (view.localState || !merged.has(doc.data.id)) {
          merged.set(doc.data.id, { ...(merged.get(doc.data.id) ?? {}), ...view });
        }
      }
      return [...merged.values()]
        .filter((row) => !filters.playerId || row.userId === filters.playerId)
        .sort(byDateDesc) as unknown as ManualMatch[];
    },

    byId: async <T = ManualMatch>(id: string): Promise<T> => {
      const ctx = await local();
      if (!ctx) return service.byId<T>(id);

      const doc = await readDoc(ctx, id);
      if (doc && hasUnsentChanges(doc)) return toView(doc) as unknown as T;
      if (isOnline()) {
        try {
          const detail = await service.byId<MatchData & { version?: number }>(id);
          const fresh = fromServer(detail);
          await ctx.store.apply(ctx.userId, [putOp(id, fresh)]);
          return toView(fresh) as unknown as T;
        } catch (error) {
          if (!doc) throw error;
        }
      }
      if (doc) return toView(doc) as unknown as T;
      throw new Error('Este partido no está disponible sin conexión: ábrelo una vez con conexión.');
    },

    create: async (payload: CreateManualMatchPayload): Promise<ManualMatch> => {
      const ctx = await local();
      if (!ctx) return service.create(payload);

      const { playerId, ...fields } = payload;
      const isCoach = !!playerId && playerId !== ctx.userId;
      const id = newId();
      const data: MatchData = {
        ...fields,
        id,
        userId: isCoach ? playerId : ctx.userId,
        coachId: isCoach ? ctx.userId : null,
        user: await ownerOf(ctx, playerId),
        date: payload.date ?? new Date(now()).toISOString(),
        status: payload.status ?? 'Iniciado',
        analysisType: payload.analysisType ?? 'Extenso',
        setsToWin: payload.setsToWin ?? 3,
        mySets: 0,
        opponentSets: 0,
        points: [],
      };
      const created: LocalMatch = {
        data,
        baseVersion: null,
        revision: 1,
        syncedRevision: 0,
        syncId: null,
        conflict: null,
      };
      await saveAndEnqueue(ctx, created);
      return toView(created) as unknown as ManualMatch;
    },

    update: async (id: string, payload: UpdateManualMatchPayload): Promise<ManualMatch> => {
      const ctx = await local();
      if (!ctx) return service.update(id, payload);
      const next = await edit(ctx, id, (data) => ({ ...data, ...payload }));
      return toView(next) as unknown as ManualMatch;
    },

    addPoint: async <T = TrackedPoint>(id: string, payload: AddPointPayload): Promise<T> => {
      const ctx = await local();
      if (!ctx) return service.addPoint<T>(id, payload);
      const point: TrackedPoint = { ...payload, id: newId() };
      await edit(ctx, id, (data) => ({ ...data, points: [...data.points, point] }));
      return point as unknown as T;
    },

    deletePoint: async (id: string, pointId: string): Promise<void> => {
      const ctx = await local();
      if (!ctx) return service.deletePoint(id, pointId);
      await edit(ctx, id, (data) => ({ ...data, points: data.points.filter((p) => p.id !== pointId) }));
    },

    complete: async (id: string, payload: CompleteMatchPayload): Promise<ManualMatch> => {
      const ctx = await local();
      if (!ctx) return service.complete(id, payload);
      // Finalizar siempre se envía: el partido sigue abierto en pantalla mostrando el informe.
      const next = await edit(ctx, id, (data) => ({ ...data, ...payload, status: 'Completado' }), true);
      return toView(next) as unknown as ManualMatch;
    },

    /** Marca el partido como abierto en pantalla: no se sincroniza ni se encola hasta cerrarlo. */
    openMatch: (id: string): void => {
      open.add(id);
    },

    /** Cierra el partido y, si quedaron cambios sin enviar, los encola. */
    closeMatch: async (id: string): Promise<void> => {
      open.delete(id);
      const ctx = await local();
      if (!ctx) return;
      const doc = await readDoc(ctx, id);
      if (doc && doc.revision > doc.syncedRevision && !doc.conflict) await saveAndEnqueue(ctx, doc);
    },

    /** Al arrancar: encola lo que se quedó sin enviar porque la app se cerró con el partido abierto. */
    enqueueUnsent: async ({ except = [] }: { except?: string[] } = {}): Promise<void> => {
      const ctx = await local();
      if (!ctx) return;
      const queued = new Set((await listOutbox(ctx.store, ctx.userId)).map((item) => item.id));
      for (const { value: doc } of await ctx.store.list<LocalMatch>(ctx.userId, MATCHES_COLLECTION)) {
        const id = doc.data.id;
        if (doc.revision > doc.syncedRevision && !doc.conflict && !queued.has(matchOutboxId(id)) && !except.includes(id)) {
          await saveAndEnqueue(ctx, doc);
        }
      }
    },

    /** Espera a que termine la descarga de detalles en segundo plano (la usan los tests). */
    prefetched: (): Promise<void> => prefetching,
  };
};

export const manualMatchesRepository = createManualMatchesRepository({
  service: manualMatchesService,
  getStore: getAppLocalStore,
  getUser: () => {
    const user = useAuthStore.getState().user;
    return user ? { id: user.id, name: user.name, surname: user.surname, nickname: user.nickname } : null;
  },
  isOnline: () => selectIsOnline(useConnectivityStore.getState()),
  newId: () => crypto.randomUUID(),
  now: Date.now,
  afterChange: () => void getAppSync()?.syncNow(),
});

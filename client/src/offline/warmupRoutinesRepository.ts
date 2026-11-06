import { warmupRoutinesService } from '../api/services/warmupRoutines';
import { useAuthStore } from '../store/authStore';
import { selectIsOnline, useConnectivityStore } from '../store/connectivityStore';
import type { SavedWarmupRoutine, WarmupRoutinePayload } from '../types/warmupRoutine';
import { MAX_SAVED_ROUTINES } from '../utils/warmupRoutine';
import { getAppLocalStore } from './appLocalStore';
import { getAppSync } from './appSync';
import type { LocalStore, StoreOperation } from './localStore';
import { enqueueOperation, listOutbox, OUTBOX_COLLECTION } from './outbox';

export const ROUTINES_COLLECTION = 'rutinas';
export const ROUTINE_OUTBOX_KIND = 'rutina';

/** Rutina tal como se guarda en el móvil: la del servidor más lo que hace falta para sincronizarla. */
export interface LocalRoutine extends SavedWarmupRoutine {
  /** Id de la rutina en el servidor; `null` mientras no se ha creado allí. */
  serverId: string | null;
}

/** Qué se debe hacer con una rutina al sincronizar. */
export type RoutineOutboxPayload =
  | { op: 'save'; routineId: string }
  // El borrado lleva el id del servidor porque la rutina local ya no existe cuando se envía.
  | { op: 'delete'; routineId: string; serverId: string };

export const routineOutboxId = (routineId: string) => `${ROUTINE_OUTBOX_KIND}:${routineId}`;

type RoutinesService = Pick<typeof warmupRoutinesService, 'list' | 'create' | 'update' | 'remove'>;

interface RepositoryDeps {
  service: RoutinesService;
  getStore: () => Promise<LocalStore | null>;
  getUserId: () => string | null;
  isOnline: () => boolean;
  newId: () => string;
  now: () => number;
  /** Se llama tras encolar un cambio, para que la app lo envíe cuanto antes. */
  afterChange: () => void;
}

const newest = (a: LocalRoutine, b: LocalRoutine) => b.updatedAt.localeCompare(a.updatedAt);

/**
 * Rutinas de calentamiento con la misma interfaz que el servicio de la API. En el navegador lo
 * delega todo en el servidor. En la app nativa trabaja primero sobre el móvil: lee y escribe en el
 * almacén local y deja cada cambio en la cola de pendientes para enviarlo cuando haya conexión.
 */
export const createWarmupRoutinesRepository = ({
  service,
  getStore,
  getUserId,
  isOnline,
  newId,
  now,
  afterChange,
}: RepositoryDeps) => {
  /** Almacén y usuario, o `null` si no hay modo sin conexión (navegador) o sesión. */
  const local = async () => {
    const store = await getStore();
    const userId = getUserId();
    return store && userId ? { store, userId } : null;
  };

  const readAll = async ({ store, userId }: { store: LocalStore; userId: string }) =>
    (await store.list<LocalRoutine>(userId, ROUTINES_COLLECTION)).map((doc) => doc.value);

  const put = (routine: LocalRoutine): StoreOperation => ({
    type: 'put',
    collection: ROUTINES_COLLECTION,
    id: routine.id,
    value: routine,
  });

  const queueSave = (routineId: string): StoreOperation =>
    enqueueOperation(
      {
        id: routineOutboxId(routineId),
        kind: ROUTINE_OUTBOX_KIND,
        payload: { op: 'save', routineId } satisfies RoutineOutboxPayload,
      },
      now(),
    );

  /** Pone al día el móvil con lo que dice el servidor, sin pisar los cambios que aún esperan envío. */
  const refreshFromServer = async (ctx: { store: LocalStore; userId: string }) => {
    const remote = await service.list();
    const current = await readAll(ctx);
    const outbox = await listOutbox(ctx.store, ctx.userId);
    const pendingIds = new Set(outbox.map((item) => item.id));
    // Un borrado en cola: el servidor aún la tiene, pero no debe reaparecer en el móvil.
    const deletingOnServer = new Set(
      outbox
        .map((item) => item.payload as Partial<RoutineOutboxPayload>)
        .flatMap((payload) => (payload?.op === 'delete' ? [payload.serverId] : [])),
    );
    const isPending = (routine: LocalRoutine) => pendingIds.has(routineOutboxId(routine.id));

    const operations: StoreOperation[] = [];
    const remoteIds = new Set(remote.map((routine) => routine.id));

    for (const routine of remote) {
      if (deletingOnServer.has(routine.id)) continue;
      const existing = current.find((candidate) => candidate.serverId === routine.id);
      if (existing && isPending(existing)) continue;
      operations.push(
        put({ ...routine, id: existing?.id ?? routine.id, serverId: routine.id, syncError: null }),
      );
    }
    // Lo que ya estaba en el servidor y ya no está lo borraron desde otro dispositivo.
    for (const routine of current) {
      if (routine.serverId && !remoteIds.has(routine.serverId) && !isPending(routine)) {
        operations.push({ type: 'remove', collection: ROUTINES_COLLECTION, id: routine.id });
      }
    }
    if (operations.length > 0) await ctx.store.apply(ctx.userId, operations);
  };

  const getOrFail = async (ctx: { store: LocalStore; userId: string }, id: string) => {
    const doc = await ctx.store.get<LocalRoutine>(ctx.userId, ROUTINES_COLLECTION, id);
    if (!doc) throw new Error('Rutina no encontrada');
    return doc.value;
  };

  return {
    list: async (): Promise<SavedWarmupRoutine[]> => {
      const ctx = await local();
      if (!ctx) return service.list();
      if (isOnline()) {
        try {
          await refreshFromServer(ctx);
        } catch {
          // Sin respuesta del servidor se trabaja con lo guardado en el móvil.
        }
      }
      return (await readAll(ctx)).sort(newest);
    },

    create: async (payload: WarmupRoutinePayload): Promise<SavedWarmupRoutine> => {
      const ctx = await local();
      if (!ctx) return service.create(payload);
      if ((await readAll(ctx)).length >= MAX_SAVED_ROUTINES) {
        throw new Error(
          `Has alcanzado el máximo de ${MAX_SAVED_ROUTINES} rutinas. Borra una para guardar otra.`,
        );
      }
      const stamp = new Date(now()).toISOString();
      const routine: LocalRoutine = {
        id: newId(),
        serverId: null,
        name: payload.name,
        items: payload.items,
        createdAt: stamp,
        updatedAt: stamp,
        syncError: null,
      };
      await ctx.store.apply(ctx.userId, [put(routine), queueSave(routine.id)]);
      afterChange();
      return routine;
    },

    update: async (id: string, payload: WarmupRoutinePayload): Promise<SavedWarmupRoutine> => {
      const ctx = await local();
      if (!ctx) return service.update(id, payload);
      const routine: LocalRoutine = {
        ...(await getOrFail(ctx, id)),
        name: payload.name,
        items: payload.items,
        updatedAt: new Date(now()).toISOString(),
        syncError: null,
      };
      await ctx.store.apply(ctx.userId, [put(routine), queueSave(id)]);
      afterChange();
      return routine;
    },

    remove: async (id: string): Promise<void> => {
      const ctx = await local();
      if (!ctx) return service.remove(id);
      const routine = await getOrFail(ctx, id);
      const operations: StoreOperation[] = [
        { type: 'remove', collection: ROUTINES_COLLECTION, id },
      ];
      if (routine.serverId) {
        operations.push(
          enqueueOperation(
            {
              id: routineOutboxId(id),
              kind: ROUTINE_OUTBOX_KIND,
              payload: {
                op: 'delete',
                routineId: id,
                serverId: routine.serverId,
              } satisfies RoutineOutboxPayload,
            },
            now(),
          ),
        );
      } else {
        // Nunca llegó al servidor: basta con olvidarla y quitar su envío de la cola.
        operations.push({ type: 'remove', collection: OUTBOX_COLLECTION, id: routineOutboxId(id) });
      }
      await ctx.store.apply(ctx.userId, operations);
      afterChange();
    },
  };
};

export const warmupRoutinesRepository = createWarmupRoutinesRepository({
  service: warmupRoutinesService,
  getStore: getAppLocalStore,
  getUserId: () => useAuthStore.getState().user?.id ?? null,
  isOnline: () => selectIsOnline(useConnectivityStore.getState()),
  newId: () => crypto.randomUUID(),
  now: Date.now,
  afterChange: () => void getAppSync()?.syncNow(),
});

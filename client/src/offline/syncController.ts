import { selectIsOnline, useConnectivityStore } from '../store/connectivityStore';
import { selectIsSyncBlocked, useSyncStore } from '../store/syncStore';
import type { LocalStore } from './localStore';
import { listOutbox } from './outbox';
import type { SyncEngine } from './syncEngine';

interface SyncControllerOptions {
  store: LocalStore;
  engine: SyncEngine;
  /** Usuario con la sesión abierta; sin él no hay nada que enviar. */
  getUserId: () => string | null;
}

/**
 * Pone el motor de envío al servicio de la app: lo dispara al abrir, al volver la red, al desactivar
 * «Trabajar offline» y al cerrar un partido; reprograma los reintentos cuando vence su espera y
 * mantiene al día los contadores que muestra la interfaz.
 */
export const createSyncController = ({ store, engine, getUserId }: SyncControllerOptions) => {
  let timer: ReturnType<typeof setTimeout> | null = null;
  let unsubscribe: (() => void) | null = null;

  const canSync = () =>
    selectIsOnline(useConnectivityStore.getState()) &&
    !selectIsSyncBlocked(useSyncStore.getState());

  const refresh = async (): Promise<number | null> => {
    const userId = getUserId();
    if (!userId) {
      useSyncStore.getState().setCounts({ pending: 0, needsAttention: 0 });
      return null;
    }
    const items = await listOutbox(store, userId);
    useSyncStore.getState().setCounts({
      pending: items.filter((i) => i.status !== 'requiere-atencion').length,
      needsAttention: items.filter((i) => i.status === 'requiere-atencion').length,
    });
    const waiting = items.filter((i) => i.status === 'pendiente' && i.nextAttemptAt > 0);
    return waiting.length ? Math.min(...waiting.map((i) => i.nextAttemptAt)) : null;
  };

  const run = async (force: boolean) => {
    const userId = getUserId();
    if (timer) clearTimeout(timer);
    timer = null;
    if (userId && canSync()) {
      useSyncStore.getState().setSyncing(true);
      try {
        await engine.run(userId, { force });
      } finally {
        useSyncStore.getState().setSyncing(false);
      }
    }
    const nextAttemptAt = await refresh();
    if (nextAttemptAt !== null && !timer) {
      timer = setTimeout(() => void run(false), Math.max(nextAttemptAt - Date.now(), 0));
    }
  };

  return {
    /** Empieza a vigilar los disparadores y hace un primer envío (apertura de la app). */
    start: () => {
      unsubscribe?.();
      const unsubscribeConnectivity = useConnectivityStore.subscribe((state, previous) => {
        if (selectIsOnline(state) && !selectIsOnline(previous)) void run(false);
      });
      const unsubscribeSync = useSyncStore.subscribe((state, previous) => {
        if (state.openMatches === 0 && previous.openMatches > 0) void run(false);
      });
      unsubscribe = () => {
        unsubscribeConnectivity();
        unsubscribeSync();
      };
      void run(false);
    },

    stop: () => {
      unsubscribe?.();
      unsubscribe = null;
      if (timer) clearTimeout(timer);
      timer = null;
    },

    /** Botón «Sincronizar»: ignora las esperas de reintento. */
    syncNow: () => run(true),

    /** Recalcula los contadores tras encolar, reintentar o descartar un pendiente. */
    refresh: () => refresh().then(() => undefined),
  };
};

export type SyncController = ReturnType<typeof createSyncController>;

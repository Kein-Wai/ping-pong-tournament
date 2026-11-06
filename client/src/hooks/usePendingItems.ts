import { useCallback, useEffect, useState } from 'react';
import { getAppLocalStore } from '../offline/appLocalStore';
import type { LocalStore } from '../offline/localStore';
import { getAppSync } from '../offline/appSync';
import { listOutbox, retryOutboxItem, type OutboxItem } from '../offline/outbox';
import { discardWithCleanup } from '../offline/outboxLabels';
import { useAuthStore } from '../store/authStore';
import { useSyncStore } from '../store/syncStore';

/** Pendientes del usuario con la sesión abierta, con las acciones de la lista (reintentar y descartar). */
export const usePendingItems = () => {
  const userId = useAuthStore((state) => state.user?.id ?? null);
  // Los contadores cambian cuando cambia la cola, así que sirven de señal para releerla.
  const pending = useSyncStore((state) => state.pending);
  const needsAttention = useSyncStore((state) => state.needsAttention);
  const [items, setItems] = useState<OutboxItem[]>([]);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const store = await getAppLocalStore();
      const next = store && userId ? await listOutbox(store, userId) : [];
      if (!cancelled) setItems(next);
    })();
    return () => {
      cancelled = true;
    };
  }, [userId, pending, needsAttention]);

  const retry = useCallback(
    async (id: string) => {
      const store = await getAppLocalStore();
      if (!store || !userId) return;
      await retryOutboxItem(store, userId, id);
      await getAppSync()?.syncNow();
    },
    [userId],
  );

  const discard = useCallback(
    async (item: OutboxItem) => {
      const store = await getAppLocalStore();
      if (!store || !userId) return;
      await discardWithCleanup({ store, userId }, item);
      await getAppSync()?.refresh();
    },
    [userId],
  );

  /** Ejecuta una acción propia del tipo (p. ej. «Guardar como partido nuevo») y recalcula la cola. */
  const runAction = useCallback(
    async (item: OutboxItem, run: (item: OutboxItem, context: { store: LocalStore; userId: string }) => Promise<void>) => {
      const store = await getAppLocalStore();
      if (!store || !userId) return;
      await run(item, { store, userId });
      await getAppSync()?.syncNow();
    },
    [userId],
  );

  return { items, retry, discard, runAction };
};

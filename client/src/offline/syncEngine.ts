import axios from 'axios';
import type { LocalStore } from './localStore';
import { listOutbox, OUTBOX_COLLECTION, updateOutboxItem, type OutboxItem } from './outbox';

/** Envía un pendiente al servidor. Debe lanzar el error de la petición si falla. */
export type OutboxHandler = (payload: unknown, item: OutboxItem) => Promise<void>;

export interface SyncResult {
  sent: number;
  needsAttention: number;
  /** Por qué la tanda no llegó al final: sin red, o con un partido abierto. */
  stopped: 'network' | 'blocked' | null;
}

export interface SyncEngineOptions {
  store: LocalStore;
  handlers: Record<string, OutboxHandler>;
  now?: () => number;
  /** `true` mientras no deba sincronizarse (p. ej. hay un partido abierto en pantalla). */
  isBlocked?: () => boolean;
}

const BASE_DELAY_MS = 30_000;
const MAX_DELAY_MS = 30 * 60_000;

/** Espera antes del reintento número `attempts`: se duplica con cada fallo hasta un tope. */
export const backoffDelay = (attempts: number): number =>
  Math.min(BASE_DELAY_MS * 2 ** (attempts - 1), MAX_DELAY_MS);

/** Rechazos que el servidor da por definitivos: reenviar lo mismo no los arreglaría. */
const REJECTION_STATUSES = new Set([400, 403, 409]);

const rejectionOf = (error: unknown): { reason: string } | null => {
  if (!axios.isAxiosError(error) || !error.response) return null;
  if (!REJECTION_STATUSES.has(error.response.status)) return null;
  const data = error.response.data as { error?: unknown } | undefined;
  return {
    reason: typeof data?.error === 'string' ? data.error : 'El servidor rechazó el envío.',
  };
};

/**
 * Motor de envío de la cola de pendientes. Procesa por orden de creación; un fallo de red (o de
 * servidor) corta la tanda y reprograma con espera creciente, mientras que un rechazo definitivo
 * deja ese pendiente en «requiere atención» y sigue con los demás.
 */
export const createSyncEngine = ({
  store,
  handlers,
  now = Date.now,
  isBlocked = () => false,
}: SyncEngineOptions) => {
  const running = new Map<string, Promise<SyncResult>>();

  const runBatch = async (userId: string, force: boolean): Promise<SyncResult> => {
    const result: SyncResult = { sent: 0, needsAttention: 0, stopped: null };

    // Un `enviando` que sobrevive aquí es de una tanda que se cortó con la app: vuelve a la cola.
    for (const item of await listOutbox(store, userId)) {
      if (item.status === 'enviando') await updateOutboxItem(store, userId, item.id, 'pendiente');
    }

    for (const item of await listOutbox(store, userId)) {
      if (item.status !== 'pendiente') continue;
      if (!force && item.nextAttemptAt > now()) continue;
      // Se vuelve a mirar por cada elemento: un partido puede abrirse a mitad de la tanda.
      if (isBlocked()) return { ...result, stopped: 'blocked' };

      const handler = handlers[item.kind];
      if (!handler) {
        await updateOutboxItem(store, userId, item.id, 'requiere-atencion', {
          reason: 'Este tipo de pendiente no se reconoce en esta versión de la app.',
        });
        result.needsAttention += 1;
        continue;
      }

      await updateOutboxItem(store, userId, item.id, 'enviando');
      try {
        await handler(item.payload, item);
        await store.apply(userId, [{ type: 'remove', collection: OUTBOX_COLLECTION, id: item.id }]);
        result.sent += 1;
      } catch (error) {
        const rejection = rejectionOf(error);
        if (rejection) {
          await updateOutboxItem(store, userId, item.id, 'requiere-atencion', rejection);
          result.needsAttention += 1;
          continue;
        }
        const attempts = item.attempts + 1;
        await updateOutboxItem(store, userId, item.id, 'pendiente', {
          attempts,
          nextAttemptAt: now() + backoffDelay(attempts),
        });
        return { ...result, stopped: 'network' };
      }
    }
    return result;
  };

  return {
    /**
     * Envía los pendientes del usuario. `force` ignora la espera de cada uno (envío manual).
     * Si ya hay una tanda en curso para ese usuario, devuelve la misma en vez de lanzar otra.
     */
    run: (userId: string, { force = false }: { force?: boolean } = {}): Promise<SyncResult> => {
      const current = running.get(userId);
      if (current) return current;
      const batch = runBatch(userId, force).finally(() => running.delete(userId));
      running.set(userId, batch);
      return batch;
    },
  };
};

export type SyncEngine = ReturnType<typeof createSyncEngine>;

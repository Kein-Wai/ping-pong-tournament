import type { LocalStore, StoreOperation } from './localStore';

export const OUTBOX_COLLECTION = 'outbox';

/** `enviando` solo dura lo que tarda una petición; si la app muere en mitad, el motor lo recupera. */
export type OutboxStatus = 'pendiente' | 'enviando' | 'requiere-atencion';

/** Lo que se guarda de cada pendiente. `payload` es opaco aquí: lo interpreta el manejador de su `kind`. */
export interface OutboxValue {
  kind: string;
  payload: unknown;
  createdAt: number;
  attempts: number;
  /** Hasta cuándo no se reintenta por sí solo (0 = ya). Un envío manual la ignora. */
  nextAttemptAt: number;
  /** Por qué necesita atención; `null` mientras no la necesite. */
  reason: string | null;
}

export interface OutboxItem extends OutboxValue {
  id: string;
  status: OutboxStatus;
}

export interface NewOutboxItem {
  id: string;
  kind: string;
  payload: unknown;
}

/**
 * Operación que encola un pendiente. Se devuelve como operación y no se ejecuta aquí para que quien
 * guarda un cambio local pueda encolarlo en la misma transacción (`LocalStore.apply`): o quedan los
 * dos o ninguno. Encolar otra vez el mismo `id` sustituye el pendiente y lo deja listo para enviarse.
 */
export const enqueueOperation = (item: NewOutboxItem, now: number): StoreOperation => ({
  type: 'put',
  collection: OUTBOX_COLLECTION,
  id: item.id,
  status: 'pendiente',
  value: {
    kind: item.kind,
    payload: item.payload,
    createdAt: now,
    attempts: 0,
    nextAttemptAt: 0,
    reason: null,
  } satisfies OutboxValue,
});

export const listOutbox = async (store: LocalStore, userId: string): Promise<OutboxItem[]> =>
  (await store.list<OutboxValue>(userId, OUTBOX_COLLECTION)).map((doc) => ({
    ...doc.value,
    id: doc.id,
    status: doc.status as OutboxStatus,
  }));

/** Cambia el estado de un pendiente conservando el resto de su contenido. */
export const updateOutboxItem = async (
  store: LocalStore,
  userId: string,
  id: string,
  status: OutboxStatus,
  changes: Partial<OutboxValue> = {},
): Promise<void> => {
  const current = await store.get<OutboxValue>(userId, OUTBOX_COLLECTION, id);
  if (!current) return;
  await store.apply(userId, [
    {
      type: 'put',
      collection: OUTBOX_COLLECTION,
      id,
      status,
      value: { ...current.value, ...changes },
    },
  ]);
};

/** Descarta un pendiente sin enviarlo. */
export const discardOutboxItem = (store: LocalStore, userId: string, id: string): Promise<void> =>
  store.apply(userId, [{ type: 'remove', collection: OUTBOX_COLLECTION, id }]);

/** Devuelve a la cola un pendiente que requería atención para que se reintente en el próximo envío. */
export const retryOutboxItem = (store: LocalStore, userId: string, id: string): Promise<void> =>
  updateOutboxItem(store, userId, id, 'pendiente', { reason: null, nextAttemptAt: 0 });

/** Descarta todos los pendientes del usuario (la acción explícita «Descartar pendientes»). */
export const discardAllOutbox = async (store: LocalStore, userId: string): Promise<void> => {
  const items = await listOutbox(store, userId);
  await store.apply(
    userId,
    items.map((item) => ({ type: 'remove', collection: OUTBOX_COLLECTION, id: item.id })),
  );
};

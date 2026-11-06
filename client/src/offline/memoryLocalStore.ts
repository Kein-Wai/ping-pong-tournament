import type { LocalStore, StoredDocument, StoreOperation } from './localStore';

interface Row {
  status: string | null;
  updatedAt: number;
  /** JSON, como en SQLite: así quien lee no comparte objetos con quien escribió. */
  body: string;
}

const keyOf = (userId: string, collection: string, id: string) =>
  JSON.stringify([userId, collection, id]);

/**
 * `LocalStore` en memoria: para los tests de todo lo que se apoya en el almacén sin tocar SQLite.
 * `now` fija el reloj de las escrituras.
 */
export const createMemoryLocalStore = (now: () => number = Date.now): LocalStore => {
  // Un Map conserva el orden de inserción y no lo cambia al reescribir una clave.
  let rows = new Map<string, Row & { userId: string; collection: string; id: string }>();

  const toDocument = <T>(row: Row & { id: string }): StoredDocument<T> => ({
    id: row.id,
    status: row.status,
    updatedAt: row.updatedAt,
    value: JSON.parse(row.body) as T,
  });

  return {
    get: async <T>(userId: string, collection: string, id: string) => {
      const row = rows.get(keyOf(userId, collection, id));
      return row ? toDocument<T>(row) : null;
    },

    list: async <T>(userId: string, collection: string, filter?: { status?: string }) =>
      [...rows.values()]
        .filter((row) => row.userId === userId && row.collection === collection)
        .filter((row) => filter?.status === undefined || row.status === filter.status)
        .map((row) => toDocument<T>(row)),

    apply: async (userId: string, operations: StoreOperation[]) => {
      // Se trabaja sobre una copia y solo se publica si todas las operaciones salen bien.
      const next = new Map(rows);
      const writtenAt = now();
      for (const op of operations) {
        const key = keyOf(userId, op.collection, op.id);
        if (op.type === 'remove') {
          next.delete(key);
          continue;
        }
        next.set(key, {
          userId,
          collection: op.collection,
          id: op.id,
          status: op.status ?? null,
          updatedAt: writtenAt,
          body: JSON.stringify(op.value),
        });
      }
      rows = next;
    },
  };
};

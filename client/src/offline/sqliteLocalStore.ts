import type { LocalStore, StoredDocument, StoreOperation } from './localStore';
import type { SqlDatabase, SqlStatement } from './sqlDatabase';

interface DocumentRow {
  id: string;
  status: string | null;
  updated_at: number;
  body: string;
}

const SELECT_COLUMNS = 'SELECT id, status, updated_at, body FROM documents';

const toDocument = <T>(row: DocumentRow): StoredDocument<T> => ({
  id: row.id,
  status: row.status,
  updatedAt: row.updated_at,
  value: JSON.parse(row.body) as T,
});

/**
 * `LocalStore` sobre SQLite. Espera una base con las migraciones ya aplicadas (`runMigrations`).
 * `now` fija el reloj de las escrituras.
 */
export const createSqliteLocalStore = (
  db: SqlDatabase,
  now: () => number = Date.now,
): LocalStore => ({
  get: async <T>(userId: string, collection: string, id: string) => {
    const rows = await db.query<DocumentRow>(
      `${SELECT_COLUMNS} WHERE user_id = ? AND collection = ? AND id = ?`,
      [userId, collection, id],
    );
    return rows.length > 0 ? toDocument<T>(rows[0]) : null;
  },

  list: async <T>(userId: string, collection: string, filter?: { status?: string }) => {
    const byStatus = filter?.status !== undefined;
    const rows = await db.query<DocumentRow>(
      `${SELECT_COLUMNS} WHERE user_id = ? AND collection = ?${byStatus ? ' AND status = ?' : ''} ORDER BY seq`,
      byStatus ? [userId, collection, filter.status as string] : [userId, collection],
    );
    return rows.map((row) => toDocument<T>(row));
  },

  apply: async (userId: string, operations: StoreOperation[]) => {
    const writtenAt = now();
    // Serializar antes de tocar la base: un valor que no se puede guardar no deja nada a medias.
    const statements: SqlStatement[] = operations.map((op) =>
      op.type === 'remove'
        ? {
            sql: 'DELETE FROM documents WHERE user_id = ? AND collection = ? AND id = ?',
            params: [userId, op.collection, op.id],
          }
        : {
            // Reescribir no cambia `seq`, así que el documento conserva su sitio en la lista.
            sql: `INSERT INTO documents (user_id, collection, id, status, body, updated_at)
                  VALUES (?, ?, ?, ?, ?, ?)
                  ON CONFLICT (user_id, collection, id) DO UPDATE SET
                    status = excluded.status,
                    body = excluded.body,
                    updated_at = excluded.updated_at`,
            params: [userId, op.collection, op.id, op.status ?? null, JSON.stringify(op.value), writtenAt],
          },
    );
    await db.execute(statements);
  },
});

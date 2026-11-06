import type { SqlDatabase, SqlStatement, SqlValue } from './sqlDatabase';

/** Lo que usamos de `SQLiteDBConnection` (plugin `@capacitor-community/sqlite`). */
export interface SqliteConnectionLike {
  executeSet(set: { statement: string; values: SqlValue[] }[], transaction: boolean): Promise<unknown>;
  query(statement: string, values?: SqlValue[]): Promise<{ values?: unknown[] }>;
}

/** Adapta una conexión abierta del plugin a `SqlDatabase`. */
export const createCapacitorSqlDatabase = (connection: SqliteConnectionLike): SqlDatabase => ({
  execute: async (statements: SqlStatement[]) => {
    if (statements.length === 0) return;
    // `true`: el plugin envuelve el conjunto en una transacción y lo deshace si algo falla.
    await connection.executeSet(
      statements.map(({ sql, params }) => ({ statement: sql, values: params ?? [] })),
      true,
    );
  },

  query: async <T>(sql: string, params?: SqlValue[]) => {
    const result = await connection.query(sql, params);
    return (result.values ?? []) as T[];
  },
});

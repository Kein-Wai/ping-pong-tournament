import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import initSqlJs from 'sql.js';
import type { SqlDatabase, SqlStatement, SqlValue } from '../offline/sqlDatabase';

const require = createRequire(import.meta.url);

let sqlJs: ReturnType<typeof initSqlJs> | null = null;

/** Carga el motor una sola vez: con jsdom no puede localizar su WASM solo, se le pasa leído. */
const loadEngine = () => {
  if (!sqlJs) {
    const bytes = readFileSync(require.resolve('sql.js/dist/sql-wasm.wasm'));
    sqlJs = initSqlJs({ wasmBinary: new Uint8Array(bytes).buffer });
  }
  return sqlJs;
};

/**
 * `SqlDatabase` sobre SQLite real (sql.js, en memoria) para los tests. Imita al plugin de
 * Capacitor: un `execute` es una transacción que se deshace entera si una sentencia falla.
 */
export const createSqlJsDatabase = async (): Promise<SqlDatabase> => {
  const SQL = await loadEngine();
  const db = new SQL.Database();

  return {
    execute: async (statements: SqlStatement[]) => {
      db.run('BEGIN');
      try {
        for (const { sql, params } of statements) db.run(sql, (params ?? []) as SqlValue[]);
        db.run('COMMIT');
      } catch (error) {
        db.run('ROLLBACK');
        throw error;
      }
    },

    query: async <T>(sql: string, params: SqlValue[] = []) => {
      const statement = db.prepare(sql);
      try {
        statement.bind(params);
        const rows: T[] = [];
        while (statement.step()) rows.push(statement.getAsObject() as T);
        return rows;
      } finally {
        statement.free();
      }
    },
  };
};

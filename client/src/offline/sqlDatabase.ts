export type SqlValue = string | number | null;

export interface SqlStatement {
  sql: string;
  params?: SqlValue[];
}

/**
 * Lo único que el almacén SQLite necesita de una base de datos. Lo implementan el plugin de
 * Capacitor (producción) y `sql.js` (tests, con SQLite real).
 */
export interface SqlDatabase {
  /** Ejecuta las sentencias en una transacción: se aplican todas o ninguna. */
  execute(statements: SqlStatement[]): Promise<void>;
  query<T>(sql: string, params?: SqlValue[]): Promise<T[]>;
}

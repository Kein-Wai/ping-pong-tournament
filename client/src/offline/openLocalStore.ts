import { CapacitorSQLite, SQLiteConnection } from '@capacitor-community/sqlite';
import { createCapacitorSqlDatabase } from './capacitorSqlDatabase';
import type { LocalStore } from './localStore';
import { runMigrations } from './migrations';
import { createSqliteLocalStore } from './sqliteLocalStore';

const DATABASE_NAME = 'tm_evolve_offline';

/**
 * Abre la base local del móvil, la lleva al esquema vigente y devuelve el almacén. Solo tiene
 * sentido en iOS y Android: quien la llame debe comprobar antes que la app es nativa. Quien
 * necesite un único almacén para toda la app debe guardar el resultado: cada llamada abre otra vez.
 */
export const openLocalStore = async (): Promise<LocalStore> => {
  const sqlite = new SQLiteConnection(CapacitorSQLite);

  // Tras recargar la vista web el plugin puede conservar la conexión: se reutiliza si es coherente.
  const consistent = (await sqlite.checkConnectionsConsistency()).result;
  const exists = (await sqlite.isConnection(DATABASE_NAME, false)).result;
  const connection =
    consistent && exists
      ? await sqlite.retrieveConnection(DATABASE_NAME, false)
      : await sqlite.createConnection(DATABASE_NAME, false, 'no-encryption', 1, false);

  if (!(await connection.isDBOpen()).result) await connection.open();

  const db = createCapacitorSqlDatabase(connection);
  await runMigrations(db);
  return createSqliteLocalStore(db);
};

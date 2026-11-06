import { createSqlJsDatabase } from '../test/sqlJsDatabase';
import { describeLocalStoreContract } from './localStoreContract';
import { runMigrations } from './migrations';
import { createSqliteLocalStore } from './sqliteLocalStore';

// El mismo contrato que pasa el adaptador en memoria, ahora con SQL real (sql.js).
describeLocalStoreContract('SQLite', async () => {
  const db = await createSqlJsDatabase();
  await runMigrations(db);
  let now = 0;
  return {
    store: createSqliteLocalStore(db, () => now),
    setNow: (ms) => {
      now = ms;
    },
  };
});

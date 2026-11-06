import type { SqlDatabase } from './sqlDatabase';

export interface Migration {
  version: number;
  statements: string[];
}

/**
 * Esquema de la base local, versión a versión. Una migración ya publicada no se edita: los móviles
 * que la aplicaron no la repetirían. Cualquier cambio posterior es una versión nueva.
 */
export const MIGRATIONS: Migration[] = [
  {
    version: 1,
    statements: [
      // `seq` fija el orden de creación; reescribir un documento (ON CONFLICT) no lo cambia.
      `CREATE TABLE documents (
        seq INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id TEXT NOT NULL,
        collection TEXT NOT NULL,
        id TEXT NOT NULL,
        status TEXT,
        body TEXT NOT NULL,
        updated_at INTEGER NOT NULL,
        UNIQUE (user_id, collection, id)
      )`,
      'CREATE INDEX documents_by_status ON documents (user_id, collection, status)',
    ],
  },
];

/**
 * Lleva la base al esquema más reciente aplicando solo las migraciones que le faltan. Cada una va
 * en su propia transacción junto al apunte de su versión, así que una que falla no deja nada a
 * medias. La versión se apunta en nuestra tabla y no en `PRAGMA user_version`, que gestiona el
 * plugin de Capacitor por su cuenta.
 */
export const runMigrations = async (
  db: SqlDatabase,
  migrations: Migration[] = MIGRATIONS,
): Promise<void> => {
  await db.execute([
    {
      sql: `CREATE TABLE IF NOT EXISTS schema_migrations (
        version INTEGER PRIMARY KEY,
        applied_at INTEGER NOT NULL
      )`,
    },
  ]);

  const applied = new Set(
    (await db.query<{ version: number }>('SELECT version FROM schema_migrations')).map(
      (row) => row.version,
    ),
  );

  const pending = migrations
    .filter((migration) => !applied.has(migration.version))
    .sort((a, b) => a.version - b.version);

  for (const migration of pending) {
    await db.execute([
      ...migration.statements.map((sql) => ({ sql })),
      {
        sql: 'INSERT INTO schema_migrations (version, applied_at) VALUES (?, ?)',
        params: [migration.version, Date.now()],
      },
    ]);
  }
};

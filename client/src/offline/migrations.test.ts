import { describe, it, expect } from 'vitest';
import { createSqlJsDatabase } from '../test/sqlJsDatabase';
import { MIGRATIONS, runMigrations, type Migration } from './migrations';

const tableNames = async (db: Awaited<ReturnType<typeof createSqlJsDatabase>>) =>
  (
    await db.query<{ name: string }>(
      "SELECT name FROM sqlite_master WHERE type = 'table' AND name NOT LIKE 'sqlite_%' ORDER BY name",
    )
  ).map((row) => row.name);

describe('runMigrations', () => {
  it('en una base vacía crea el esquema del almacén', async () => {
    const db = await createSqlJsDatabase();

    await runMigrations(db);

    expect(await tableNames(db)).toEqual(['documents', 'schema_migrations']);
  });

  it('ejecutarlas dos veces no falla ni repite nada', async () => {
    const db = await createSqlJsDatabase();

    await runMigrations(db);
    await runMigrations(db);

    const applied = await db.query<{ version: number }>('SELECT version FROM schema_migrations');
    expect(applied.map((row) => row.version)).toEqual(MIGRATIONS.map((m) => m.version));
  });

  it('aplica solo las migraciones nuevas y conserva los datos que ya había', async () => {
    const db = await createSqlJsDatabase();
    const v1: Migration = {
      version: 1,
      statements: ['CREATE TABLE notas (id TEXT PRIMARY KEY, texto TEXT NOT NULL)'],
    };
    const v2: Migration = { version: 2, statements: ['ALTER TABLE notas ADD COLUMN autor TEXT'] };
    await runMigrations(db, [v1]);
    await db.execute([{ sql: 'INSERT INTO notas (id, texto) VALUES (?, ?)', params: ['n1', 'hola'] }]);

    await runMigrations(db, [v1, v2]);

    expect(await db.query('SELECT id, texto, autor FROM notas')).toEqual([
      { id: 'n1', texto: 'hola', autor: null },
    ]);
  });

  it('si una migración falla no deja a medias ni su versión anotada', async () => {
    const db = await createSqlJsDatabase();
    const rota: Migration = {
      version: 1,
      statements: ['CREATE TABLE a (id TEXT)', 'INSERT INTO tabla_que_no_existe VALUES (1)'],
    };

    await expect(runMigrations(db, [rota])).rejects.toThrow();

    expect(await tableNames(db)).toEqual(['schema_migrations']);
    expect(await db.query('SELECT version FROM schema_migrations')).toEqual([]);
  });

  it('las versiones del esquema real son consecutivas desde 1', () => {
    expect(MIGRATIONS.map((m) => m.version)).toEqual(MIGRATIONS.map((_, i) => i + 1));
  });
});

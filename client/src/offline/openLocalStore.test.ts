import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createSqlJsDatabase } from '../test/sqlJsDatabase';
import { openLocalStore } from './openLocalStore';

// Plugin de Capacitor simulado: la conexión ejecuta SQL real sobre sql.js.
const plugin = vi.hoisted(() => ({
  consistent: true,
  connectionExists: false,
  dbOpen: false,
  createConnection: vi.fn(),
  retrieveConnection: vi.fn(),
  open: vi.fn(),
  newConnection: null as unknown,
}));

vi.mock('@capacitor-community/sqlite', () => ({
  CapacitorSQLite: {},
  SQLiteConnection: class {
    checkConnectionsConsistency = async () => ({ result: plugin.consistent });
    isConnection = async () => ({ result: plugin.connectionExists });
    createConnection = plugin.createConnection;
    retrieveConnection = plugin.retrieveConnection;
  },
}));

const buildConnection = async () => {
  const db = await createSqlJsDatabase();
  return {
    open: plugin.open,
    isDBOpen: async () => ({ result: plugin.dbOpen }),
    executeSet: (set: { statement: string; values: never[] }[]) =>
      db.execute(set.map((s) => ({ sql: s.statement, params: s.values }))),
    query: async (sql: string, values?: never[]) => ({ values: await db.query(sql, values) }),
  };
};

describe('openLocalStore', () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    plugin.consistent = true;
    plugin.connectionExists = false;
    plugin.dbOpen = false;
    const connection = await buildConnection();
    plugin.createConnection.mockResolvedValue(connection);
    plugin.retrieveConnection.mockResolvedValue(connection);
  });

  it('crea la conexión, la abre y devuelve un almacén que funciona', async () => {
    const store = await openLocalStore();

    expect(plugin.createConnection).toHaveBeenCalledWith(
      'tm_evolve_offline',
      false,
      'no-encryption',
      1,
      false,
    );
    expect(plugin.open).toHaveBeenCalledTimes(1);
    await store.apply('u1', [{ type: 'put', collection: 'c', id: 'a', value: { ok: true } }]);
    expect((await store.get('u1', 'c', 'a'))?.value).toEqual({ ok: true });
  });

  it('aplica las migraciones al abrir', async () => {
    const store = await openLocalStore();

    // Sin la tabla `documents` creada por la migración 1, esto fallaría.
    await expect(store.list('u1', 'c')).resolves.toEqual([]);
  });

  it('reutiliza la conexión que ya existe en vez de crear otra', async () => {
    plugin.connectionExists = true;

    await openLocalStore();

    expect(plugin.retrieveConnection).toHaveBeenCalledWith('tm_evolve_offline', false);
    expect(plugin.createConnection).not.toHaveBeenCalled();
  });

  it('si las conexiones son inconsistentes crea una nueva aunque exista', async () => {
    plugin.connectionExists = true;
    plugin.consistent = false;

    await openLocalStore();

    expect(plugin.createConnection).toHaveBeenCalledTimes(1);
    expect(plugin.retrieveConnection).not.toHaveBeenCalled();
  });

  it('no vuelve a abrir una base que ya está abierta', async () => {
    plugin.connectionExists = true;
    plugin.dbOpen = true;

    await openLocalStore();

    expect(plugin.open).not.toHaveBeenCalled();
  });
});

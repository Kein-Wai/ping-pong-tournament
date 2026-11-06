import { describe, it, expect, vi } from 'vitest';
import { createCapacitorSqlDatabase, type SqliteConnectionLike } from './capacitorSqlDatabase';

const fakeConnection = (): SqliteConnectionLike & {
  executeSet: ReturnType<typeof vi.fn>;
  query: ReturnType<typeof vi.fn>;
} => ({
  executeSet: vi.fn().mockResolvedValue({}),
  query: vi.fn().mockResolvedValue({ values: [] }),
});

describe('createCapacitorSqlDatabase', () => {
  it('execute manda las sentencias al plugin en una sola transacción', async () => {
    const connection = fakeConnection();
    const db = createCapacitorSqlDatabase(connection);

    await db.execute([
      { sql: 'INSERT INTO t (a, b) VALUES (?, ?)', params: ['x', 2] },
      { sql: 'DELETE FROM t WHERE a = ?', params: ['y'] },
    ]);

    expect(connection.executeSet).toHaveBeenCalledTimes(1);
    expect(connection.executeSet).toHaveBeenCalledWith(
      [
        { statement: 'INSERT INTO t (a, b) VALUES (?, ?)', values: ['x', 2] },
        { statement: 'DELETE FROM t WHERE a = ?', values: ['y'] },
      ],
      true,
    );
  });

  it('una sentencia sin parámetros se manda con la lista de valores vacía', async () => {
    const connection = fakeConnection();
    const db = createCapacitorSqlDatabase(connection);

    await db.execute([{ sql: 'CREATE TABLE t (a TEXT)' }]);

    expect(connection.executeSet).toHaveBeenCalledWith(
      [{ statement: 'CREATE TABLE t (a TEXT)', values: [] }],
      true,
    );
  });

  it('execute sin sentencias no llama al plugin', async () => {
    const connection = fakeConnection();

    await createCapacitorSqlDatabase(connection).execute([]);

    expect(connection.executeSet).not.toHaveBeenCalled();
  });

  it('si el plugin falla, el error llega a quien llamó', async () => {
    const connection = fakeConnection();
    connection.executeSet.mockRejectedValue(new Error('disco lleno'));

    await expect(
      createCapacitorSqlDatabase(connection).execute([{ sql: 'DELETE FROM t' }]),
    ).rejects.toThrow('disco lleno');
  });

  it('query devuelve las filas que da el plugin', async () => {
    const connection = fakeConnection();
    connection.query.mockResolvedValue({ values: [{ id: 'a' }, { id: 'b' }] });

    const rows = await createCapacitorSqlDatabase(connection).query('SELECT id FROM t WHERE x = ?', [1]);

    expect(connection.query).toHaveBeenCalledWith('SELECT id FROM t WHERE x = ?', [1]);
    expect(rows).toEqual([{ id: 'a' }, { id: 'b' }]);
  });

  it('query sin filas (el plugin omite `values`) da una lista vacía', async () => {
    const connection = fakeConnection();
    connection.query.mockResolvedValue({});

    expect(await createCapacitorSqlDatabase(connection).query('SELECT 1 WHERE 0')).toEqual([]);
  });
});

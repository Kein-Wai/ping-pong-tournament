import { vi, type Mock } from 'vitest';

/**
 * Prisma de pruebas para los tests de seguridad de las rutas.
 *
 * Cualquier `prisma.<modelo>.<metodo>` es un `vi.fn()` que devuelve `undefined`
 * hasta que el test lo configure, de modo que cada caso declara solo los datos
 * que su escenario necesita. Se mockea unicamente la base de datos (frontera
 * del sistema): los guardas de autenticacion y autorizacion son los reales.
 */
const WRITE_METHODS = new Set([
  'create',
  'createMany',
  'update',
  'updateMany',
  'upsert',
  'delete',
  'deleteMany',
]);

export type ModelMock = Record<string, Mock>;

export interface PrismaMock {
  /** El cliente simulado: lo que debe devolver `vi.mock('../db')`. */
  client: Record<string, ModelMock> & { $transaction: Mock };
  /** Llamadas de escritura realizadas, como `modelo.metodo`. */
  writes: () => string[];
  /** Vuelve a dejar todos los metodos sin configurar. */
  reset: () => void;
}

export const createPrismaMock = (): PrismaMock => {
  const models = new Map<string, Map<string, Mock>>();

  const modelMock = (model: string): ModelMock =>
    new Proxy({} as ModelMock, {
      get: (_target, method: string) => {
        const methods = models.get(model) ?? new Map<string, Mock>();
        models.set(model, methods);
        const existing = methods.get(method);
        if (existing) return existing;
        const created = vi.fn();
        methods.set(method, created);
        return created;
      },
    });

  const transaction = vi.fn();
  const client = new Proxy({} as PrismaMock['client'], {
    get: (_target, property: string) => {
      if (property === '$transaction') return transaction;
      return modelMock(property);
    },
  });
  transaction.mockImplementation(async (arg: unknown) =>
    typeof arg === 'function' ? (arg as (tx: unknown) => unknown)(client) : Promise.all(arg as []),
  );

  const writes = () =>
    [...models.entries()].flatMap(([model, methods]) =>
      [...methods.entries()]
        .filter(([method, fn]) => WRITE_METHODS.has(method) && fn.mock.calls.length > 0)
        .map(([method]) => `${model}.${method}`),
    );

  const reset = () => {
    models.clear();
    transaction.mockReset();
    transaction.mockImplementation(async (arg: unknown) =>
      typeof arg === 'function'
        ? (arg as (tx: unknown) => unknown)(client)
        : Promise.all(arg as []),
    );
  };

  return { client, writes, reset };
};

/** Instancia unica por archivo de test: la usan a la vez el vi.mock('../db') y los casos. */
export const prismaMock = createPrismaMock();

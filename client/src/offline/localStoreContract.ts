import { describe, it, expect } from 'vitest';
import type { LocalStore } from './localStore';

/** Lo que cada adaptador le da al contrato: un almacén vacío y el reloj con el que se creó. */
export interface ContractHarness {
  store: LocalStore;
  /** Fija la hora que verá la siguiente escritura. */
  setNow: (ms: number) => void;
}

/**
 * Tests de comportamiento que debe cumplir cualquier `LocalStore`. Se pasan tal cual contra el
 * adaptador en memoria y contra el de SQLite, para que ambos signifiquen lo mismo.
 */
export const describeLocalStoreContract = (
  name: string,
  createHarness: () => Promise<ContractHarness>,
) => {
  describe(`contrato de LocalStore: ${name}`, () => {
    it('un documento que no existe da null', async () => {
      const { store } = await createHarness();

      expect(await store.get('u1', 'rutinas', 'r1')).toBeNull();
    });

    it('guarda un documento y lo devuelve con su valor, sin estado y con la hora de escritura', async () => {
      const { store, setNow } = await createHarness();
      setNow(1000);

      await store.apply('u1', [
        { type: 'put', collection: 'rutinas', id: 'r1', value: { nombre: 'Mañana', tiempos: [1, 2] } },
      ]);

      expect(await store.get('u1', 'rutinas', 'r1')).toEqual({
        id: 'r1',
        status: null,
        updatedAt: 1000,
        value: { nombre: 'Mañana', tiempos: [1, 2] },
      });
    });

    it('guarda el estado y permite filtrar por él', async () => {
      const { store } = await createHarness();
      await store.apply('u1', [
        { type: 'put', collection: 'pendientes', id: 'a', value: 1, status: 'pendiente' },
        { type: 'put', collection: 'pendientes', id: 'b', value: 2, status: 'requiere-atencion' },
        { type: 'put', collection: 'pendientes', id: 'c', value: 3, status: 'pendiente' },
      ]);

      const pendientes = await store.list('u1', 'pendientes', { status: 'pendiente' });

      expect(pendientes.map((d) => d.id)).toEqual(['a', 'c']);
    });

    it('reescribir un documento cambia su valor y su hora pero no su posición en la lista', async () => {
      const { store, setNow } = await createHarness();
      setNow(1);
      await store.apply('u1', [
        { type: 'put', collection: 'c', id: 'primero', value: 'v1' },
        { type: 'put', collection: 'c', id: 'segundo', value: 'v1' },
      ]);
      setNow(2);

      await store.apply('u1', [
        { type: 'put', collection: 'c', id: 'primero', value: 'v2', status: 'editado' },
      ]);

      const docs = await store.list<string>('u1', 'c');
      expect(docs.map((d) => d.id)).toEqual(['primero', 'segundo']);
      expect(docs[0]).toMatchObject({ value: 'v2', status: 'editado', updatedAt: 2 });
    });

    it('lista por orden de creación', async () => {
      const { store } = await createHarness();
      await store.apply('u1', [{ type: 'put', collection: 'c', id: 'z', value: 0 }]);
      await store.apply('u1', [{ type: 'put', collection: 'c', id: 'a', value: 0 }]);
      await store.apply('u1', [{ type: 'put', collection: 'c', id: 'm', value: 0 }]);

      expect((await store.list('u1', 'c')).map((d) => d.id)).toEqual(['z', 'a', 'm']);
    });

    it('una colección vacía da una lista vacía', async () => {
      const { store } = await createHarness();

      expect(await store.list('u1', 'nada')).toEqual([]);
    });

    it('borra un documento y borrar uno que no existe no falla', async () => {
      const { store } = await createHarness();
      await store.apply('u1', [{ type: 'put', collection: 'c', id: 'a', value: 1 }]);

      await store.apply('u1', [
        { type: 'remove', collection: 'c', id: 'a' },
        { type: 'remove', collection: 'c', id: 'no-existe' },
      ]);

      expect(await store.get('u1', 'c', 'a')).toBeNull();
    });

    it('el mismo id en colecciones distintas son documentos distintos', async () => {
      const { store } = await createHarness();
      await store.apply('u1', [
        { type: 'put', collection: 'rutinas', id: 'x', value: 'rutina' },
        { type: 'put', collection: 'partidos', id: 'x', value: 'partido' },
      ]);

      expect((await store.get<string>('u1', 'rutinas', 'x'))?.value).toBe('rutina');
      expect((await store.get<string>('u1', 'partidos', 'x'))?.value).toBe('partido');
    });

    it('un usuario nunca ve ni borra los documentos de otro en el mismo móvil', async () => {
      const { store } = await createHarness();
      await store.apply('u1', [{ type: 'put', collection: 'c', id: 'a', value: 'de-u1' }]);
      await store.apply('u2', [{ type: 'put', collection: 'c', id: 'a', value: 'de-u2' }]);

      await store.apply('u2', [{ type: 'remove', collection: 'c', id: 'a' }]);

      expect((await store.get<string>('u1', 'c', 'a'))?.value).toBe('de-u1');
      expect(await store.get('u2', 'c', 'a')).toBeNull();
      expect(await store.list('u2', 'c')).toEqual([]);
    });

    it('apply aplica todas las operaciones o ninguna', async () => {
      const { store } = await createHarness();
      await store.apply('u1', [{ type: 'put', collection: 'c', id: 'a', value: 'original' }]);
      const circular: Record<string, unknown> = {};
      circular.yo = circular;

      await expect(
        store.apply('u1', [
          { type: 'put', collection: 'c', id: 'a', value: 'cambiado' },
          { type: 'put', collection: 'c', id: 'b', value: circular },
        ]),
      ).rejects.toThrow();

      expect((await store.get<string>('u1', 'c', 'a'))?.value).toBe('original');
      expect(await store.get('u1', 'c', 'b')).toBeNull();
    });

    it('conserva los valores nulos y los números tal cual', async () => {
      const { store } = await createHarness();
      await store.apply('u1', [
        { type: 'put', collection: 'c', id: 'n', value: null },
        { type: 'put', collection: 'c', id: 'cero', value: 0 },
      ]);

      expect((await store.get('u1', 'c', 'n'))?.value).toBeNull();
      expect((await store.get('u1', 'c', 'cero'))?.value).toBe(0);
    });
  });
};

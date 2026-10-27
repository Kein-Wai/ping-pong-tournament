import { describe, it, expect } from 'vitest';
import { getView, startSession } from './warmupEngine';
import {
  addExercise,
  getTotalSec,
  moveExercise,
  removeExercise,
  setRest,
  setDuration,
  toWarmupItems,
  MAX_ROUTINE_ITEMS,
  type RoutineEntry,
} from './warmupRoutine';

const entrada = (overrides: Partial<RoutineEntry> = {}): RoutineEntry => ({
  id: 'e1',
  exerciseKey: 'estiramientos',
  durationSec: 60,
  restSec: 10,
  ...overrides,
});

describe('Operaciones de la rutina de calentamiento (warmupRoutine)', () => {
  describe('addExercise', () => {
    it('Debería añadir al final el ejercicio con la duración y el descanso por defecto del catálogo', () => {
      const lista = addExercise([], 'derecha-derecha', 'a');

      expect(lista).toEqual([{ id: 'a', exerciseKey: 'derecha-derecha', durationSec: 60, restSec: 30 }]);
    });

    it('Debería permitir repetir el mismo ejercicio y respetar el orden de llegada', () => {
      const lista = addExercise(addExercise([], 'estiramientos', 'a'), 'estiramientos', 'b');

      expect(lista.map((e) => e.id)).toEqual(['a', 'b']);
      expect(lista.map((e) => e.restSec)).toEqual([10, 10]);
    });

    it('Debería no modificar la lista original', () => {
      const original = [entrada()];

      addExercise(original, 'movilidad', 'b');

      expect(original).toHaveLength(1);
    });

    it('Debería no añadir más al llegar al máximo de ejercicios por rutina', () => {
      const llena = Array.from({ length: MAX_ROUTINE_ITEMS }, (_, i) => entrada({ id: `e${i}` }));

      expect(MAX_ROUTINE_ITEMS).toBe(20);
      expect(addExercise(llena, 'movilidad', 'extra')).toBe(llena);
    });
  });

  describe('removeExercise', () => {
    it('Debería quitar solo la entrada indicada aunque haya otra del mismo ejercicio', () => {
      const lista = [entrada({ id: 'a' }), entrada({ id: 'b' }), entrada({ id: 'c', exerciseKey: 'movilidad' })];

      expect(removeExercise(lista, 'b').map((e) => e.id)).toEqual(['a', 'c']);
    });

    it('Debería ignorar un id que no existe y no modificar la original', () => {
      const lista = [entrada({ id: 'a' })];

      expect(removeExercise(lista, 'zzz')).toEqual(lista);
      expect(lista).toHaveLength(1);
    });
  });

  describe('moveExercise', () => {
    const lista = [entrada({ id: 'a' }), entrada({ id: 'b' }), entrada({ id: 'c' })];

    it('Debería subir una posición', () => {
      expect(moveExercise(lista, 'b', 'up').map((e) => e.id)).toEqual(['b', 'a', 'c']);
    });

    it('Debería bajar una posición', () => {
      expect(moveExercise(lista, 'b', 'down').map((e) => e.id)).toEqual(['a', 'c', 'b']);
    });

    it('Debería no mover el primero hacia arriba ni el último hacia abajo', () => {
      expect(moveExercise(lista, 'a', 'up').map((e) => e.id)).toEqual(['a', 'b', 'c']);
      expect(moveExercise(lista, 'c', 'down').map((e) => e.id)).toEqual(['a', 'b', 'c']);
    });

    it('Debería ignorar un id que no existe y no modificar la original', () => {
      expect(moveExercise(lista, 'zzz', 'up').map((e) => e.id)).toEqual(['a', 'b', 'c']);
      expect(lista.map((e) => e.id)).toEqual(['a', 'b', 'c']);
    });
  });

  describe('setDuration', () => {
    const lista = [entrada({ id: 'a' }), entrada({ id: 'b', durationSec: 45 })];

    it('Debería cambiar solo la duración de la entrada indicada', () => {
      expect(setDuration(lista, 'a', 120).map((e) => e.durationSec)).toEqual([120, 45]);
    });

    it.each([
      [5, 15],
      [10_000, 600],
      [59.6, 60],
    ])('Debería ajustar %s s a %s s (tope mínimo 15, máximo 600, enteros)', (pedido, esperado) => {
      expect(setDuration(lista, 'a', pedido)[0].durationSec).toBe(esperado);
    });

    it('Debería ignorar un valor que no es un número', () => {
      expect(setDuration(lista, 'a', Number.NaN)).toEqual(lista);
    });
  });

  describe('setRest', () => {
    const lista = [entrada({ id: 'a' }), entrada({ id: 'b', restSec: 20 })];

    it('Debería cambiar solo el descanso de la entrada indicada', () => {
      expect(setRest(lista, 'b', 45).map((e) => e.restSec)).toEqual([10, 45]);
    });

    it.each([
      [-5, 0],
      [9_999, 300],
      [12.4, 12],
    ])('Debería ajustar %s s a %s s (de 0 a 300, enteros)', (pedido, esperado) => {
      expect(setRest(lista, 'a', pedido)[0].restSec).toBe(esperado);
    });

    it('Debería ignorar un valor que no es un número', () => {
      expect(setRest(lista, 'a', Number.NaN)).toEqual(lista);
    });
  });

  describe('getTotalSec', () => {
    const rutina = [
      entrada({ id: 'a', durationSec: 60, restSec: 10 }),
      entrada({ id: 'b', durationSec: 90, restSec: 30 }),
    ];

    it('Debería sumar la cuenta atrás inicial, los descansos y las duraciones', () => {
      expect(getTotalSec(rutina)).toBe(195);
    });

    it('Debería ser 0 sin ejercicios', () => {
      expect(getTotalSec([])).toBe(0);
    });

    it('Debería coincidir con el tiempo total que enseña el motor al empezar la sesión', () => {
      const sesion = startSession(toWarmupItems(rutina), 0);

      expect(getView(sesion, 0).totalRemainingSec).toBe(getTotalSec(rutina));
    });
  });

  describe('toWarmupItems', () => {
    it('Debería pasar al formato del motor sin los id', () => {
      const lista = [entrada({ id: 'a', exerciseKey: 'movilidad', durationSec: 75, restSec: 5 })];

      expect(toWarmupItems(lista)).toEqual([{ exerciseKey: 'movilidad', durationSec: 75, restSec: 5 }]);
    });
  });
});

import { describe, it, expect } from 'vitest';
import { WARMUP_EXERCISES, WARMUP_EXERCISES_BY_KEY, WARMUP_EXERCISE_KEYS } from './warmupExercises';

// Lista escrita a mano a propósito: si cambia el catálogo, este test obliga a
// revisar también la validación de la API, que repite estas claves.
const CLAVES_ACORDADAS = [
  'estiramientos',
  'movilidad',
  'derecha-derecha',
  'reves-reves',
  'top-derecha',
  'top-reves',
  'sensibilidad',
  'saque-entrada',
  'drill-libre',
];

describe('Catálogo de ejercicios de calentamiento', () => {
  it('Debería contener exactamente los nueve ejercicios acordados', () => {
    expect([...WARMUP_EXERCISE_KEYS]).toEqual(CLAVES_ACORDADAS);
    expect(WARMUP_EXERCISES.map((exercise) => exercise.key)).toEqual(CLAVES_ACORDADAS);
  });

  it('Debería tener claves únicas', () => {
    expect(new Set(WARMUP_EXERCISES.map((exercise) => exercise.key)).size).toBe(WARMUP_EXERCISES.length);
  });

  it('Debería tener nombre y frase explicativa en todos los ejercicios', () => {
    WARMUP_EXERCISES.forEach((exercise) => {
      expect(exercise.name.trim()).not.toBe('');
      expect(exercise.description.trim()).not.toBe('');
    });
  });

  it('Debería usar 60 s de duración por defecto en todos', () => {
    WARMUP_EXERCISES.forEach((exercise) => expect(exercise.defaultDurationSec).toBe(60));
  });

  it('Debería dar 10 s de descanso a los ejercicios sin mesa y 30 s a los que la necesitan', () => {
    const sinMesa = WARMUP_EXERCISES.filter((exercise) => !exercise.needsTable);

    expect(sinMesa.map((exercise) => exercise.key)).toEqual(['estiramientos', 'movilidad']);
    sinMesa.forEach((exercise) => expect(exercise.defaultRestSec).toBe(10));
    WARMUP_EXERCISES.filter((exercise) => exercise.needsTable).forEach((exercise) =>
      expect(exercise.defaultRestSec).toBe(30),
    );
  });

  it('Debería poder buscar cada ejercicio por su clave', () => {
    CLAVES_ACORDADAS.forEach((key) => {
      expect(WARMUP_EXERCISES_BY_KEY[key as keyof typeof WARMUP_EXERCISES_BY_KEY].key).toBe(key);
    });
  });
});

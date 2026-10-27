import { describe, it, expect } from 'vitest';
import { warmupRoutineSchema } from './warmupRoutine';

const ejercicio = (overrides: Record<string, unknown> = {}) => ({
  exerciseKey: 'estiramientos',
  durationSec: 60,
  restSec: 10,
  ...overrides,
});

const rutina = (overrides: Record<string, unknown> = {}) => ({
  name: 'Torneo',
  items: [ejercicio()],
  ...overrides,
});

describe('warmupRoutineSchema', () => {
  it('Debería aceptar una rutina válida y devolverla tal cual', () => {
    const resultado = warmupRoutineSchema.safeParse(rutina());

    expect(resultado.success).toBe(true);
    expect(resultado.data).toEqual({ name: 'Torneo', items: [ejercicio()] });
  });

  it('Debería quitar los espacios sobrantes del nombre', () => {
    const resultado = warmupRoutineSchema.safeParse(rutina({ name: '  Antes de entrenar  ' }));

    expect(resultado.data?.name).toBe('Antes de entrenar');
  });

  it.each([
    ['vacío', ''],
    ['solo espacios', '   '],
    ['de 41 caracteres', 'a'.repeat(41)],
  ])('Debería rechazar un nombre %s', (_caso, name) => {
    expect(warmupRoutineSchema.safeParse(rutina({ name })).success).toBe(false);
  });

  it('Debería aceptar un nombre de exactamente 40 caracteres', () => {
    expect(warmupRoutineSchema.safeParse(rutina({ name: 'a'.repeat(40) })).success).toBe(true);
  });

  it('Debería exigir al menos un ejercicio', () => {
    expect(warmupRoutineSchema.safeParse(rutina({ items: [] })).success).toBe(false);
  });

  it('Debería aceptar 20 ejercicios y rechazar 21', () => {
    const conEjercicios = (cantidad: number) => rutina({ items: Array.from({ length: cantidad }, () => ejercicio()) });

    expect(warmupRoutineSchema.safeParse(conEjercicios(20)).success).toBe(true);
    expect(warmupRoutineSchema.safeParse(conEjercicios(21)).success).toBe(false);
  });

  // Lista escrita a mano a propósito: es la del catálogo del cliente
  // (client/src/constants/warmupExercises.ts). Si cambia allí, este test obliga a cambiarla aquí.
  it.each([
    'estiramientos',
    'movilidad',
    'derecha-derecha',
    'reves-reves',
    'top-derecha',
    'top-reves',
    'sensibilidad',
    'saque-entrada',
    'drill-libre',
  ])('Debería aceptar el ejercicio «%s» del catálogo', (exerciseKey) => {
    expect(warmupRoutineSchema.safeParse(rutina({ items: [ejercicio({ exerciseKey })] })).success).toBe(true);
  });

  it.each([15, 60, 600])('Debería aceptar una duración de %i s', (durationSec) => {
    expect(warmupRoutineSchema.safeParse(rutina({ items: [ejercicio({ durationSec })] })).success).toBe(true);
  });

  it.each([14, 601, 0, -5, 60.5, '60', null])('Debería rechazar una duración de %s', (durationSec) => {
    expect(warmupRoutineSchema.safeParse(rutina({ items: [ejercicio({ durationSec })] })).success).toBe(false);
  });

  it.each([0, 30, 300])('Debería aceptar un descanso de %i s', (restSec) => {
    expect(warmupRoutineSchema.safeParse(rutina({ items: [ejercicio({ restSec })] })).success).toBe(true);
  });

  it.each([-1, 301, 10.5, '10', null])('Debería rechazar un descanso de %s', (restSec) => {
    expect(warmupRoutineSchema.safeParse(rutina({ items: [ejercicio({ restSec })] })).success).toBe(false);
  });

  it('Debería descartar los campos que no forman parte de la rutina', () => {
    const resultado = warmupRoutineSchema.safeParse({
      ...rutina({ items: [ejercicio({ extra: 'x' })] }),
      id: 'otro-id',
      userId: 'otro-usuario',
    });

    expect(resultado.data).toEqual({ name: 'Torneo', items: [ejercicio()] });
  });

  it.each(['plancha', '', 'Estiramientos'])('Debería rechazar el ejercicio «%s», que no está en el catálogo', (exerciseKey) => {
    expect(warmupRoutineSchema.safeParse(rutina({ items: [ejercicio({ exerciseKey })] })).success).toBe(false);
  });
});

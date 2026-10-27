import { z } from 'zod';

/**
 * Catálogo de ejercicios de calentamiento. Es el mismo que el del cliente
 * (client/src/constants/warmupExercises.ts) y no hay paquete compartido entre
 * ambos: si se añade o renombra uno, hay que cambiar los dos.
 */
export const WARMUP_EXERCISE_KEYS = [
  'estiramientos',
  'movilidad',
  'derecha-derecha',
  'reves-reves',
  'top-derecha',
  'top-reves',
  'sensibilidad',
  'saque-entrada',
  'drill-libre',
] as const;

// Topes de tiempo y de tamaño: los mismos que aplica el constructor del cliente
// (client/src/utils/warmupRoutine.ts), que ajusta lo que escribe el jugador a estos límites.
export const MAX_WARMUP_ITEMS = 20;
export const MIN_DURATION_SEC = 15;
export const MAX_DURATION_SEC = 600;
export const MIN_REST_SEC = 0;
export const MAX_REST_SEC = 300;

const warmupItemSchema = z.object({
  exerciseKey: z.enum(WARMUP_EXERCISE_KEYS),
  durationSec: z.number().int().min(MIN_DURATION_SEC).max(MAX_DURATION_SEC),
  restSec: z.number().int().min(MIN_REST_SEC).max(MAX_REST_SEC),
});

export const warmupRoutineSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, 'El nombre de la rutina es obligatorio')
    .max(40, 'El nombre no puede pasar de 40 caracteres'),
  items: z
    .array(warmupItemSchema)
    .min(1, 'La rutina necesita al menos un ejercicio')
    .max(MAX_WARMUP_ITEMS, `Una rutina admite como máximo ${MAX_WARMUP_ITEMS} ejercicios`),
});

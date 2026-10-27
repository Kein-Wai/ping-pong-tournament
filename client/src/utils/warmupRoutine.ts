import { WARMUP_EXERCISES_BY_KEY, type WarmupExerciseKey } from '../constants/warmupExercises';
import { COUNTDOWN_SEC, type WarmupItem } from './warmupEngine';

/**
 * Operaciones sobre la lista de ejercicios que el jugador monta en el
 * constructor. Son puras: cada una devuelve una lista nueva y no toca la recibida.
 */

export const MAX_ROUTINE_ITEMS = 20;
/** Rutinas que puede tener guardadas un jugador; la API lo aplica también. */
export const MAX_SAVED_ROUTINES = 5;
export const MIN_DURATION_SEC = 15;
export const MAX_DURATION_SEC = 600;
export const MIN_REST_SEC = 0;
export const MAX_REST_SEC = 300;

/** Un ejercicio dentro de la rutina. El `id` distingue repeticiones del mismo ejercicio. */
export interface RoutineEntry {
  id: string;
  exerciseKey: WarmupExerciseKey;
  durationSec: number;
  restSec: number;
}

export function addExercise(entries: RoutineEntry[], exerciseKey: WarmupExerciseKey, id: string): RoutineEntry[] {
  if (entries.length >= MAX_ROUTINE_ITEMS) return entries;
  const { defaultDurationSec, defaultRestSec } = WARMUP_EXERCISES_BY_KEY[exerciseKey];
  return [...entries, { id, exerciseKey, durationSec: defaultDurationSec, restSec: defaultRestSec }];
}

export function removeExercise(entries: RoutineEntry[], id: string): RoutineEntry[] {
  return entries.filter((entry) => entry.id !== id);
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, Math.round(value)));
}

function updateEntry(entries: RoutineEntry[], id: string, changes: Partial<RoutineEntry>): RoutineEntry[] {
  return entries.map((entry) => (entry.id === id ? { ...entry, ...changes } : entry));
}

export function setDuration(entries: RoutineEntry[], id: string, seconds: number): RoutineEntry[] {
  if (!Number.isFinite(seconds)) return entries;
  return updateEntry(entries, id, { durationSec: clamp(seconds, MIN_DURATION_SEC, MAX_DURATION_SEC) });
}

export function setRest(entries: RoutineEntry[], id: string, seconds: number): RoutineEntry[] {
  if (!Number.isFinite(seconds)) return entries;
  return updateEntry(entries, id, { restSec: clamp(seconds, MIN_REST_SEC, MAX_REST_SEC) });
}

/** Duración total de la sesión: cuenta atrás inicial más descansos y ejercicios. 0 sin ejercicios. */
export function getTotalSec(entries: RoutineEntry[]): number {
  if (entries.length === 0) return 0;
  return entries.reduce((total, entry) => total + entry.restSec + entry.durationSec, COUNTDOWN_SEC);
}

/** Lista que entiende el motor de la sesión, sin los `id` que solo usa el constructor. */
export function toWarmupItems(entries: RoutineEntry[]): WarmupItem[] {
  return entries.map(({ exerciseKey, durationSec, restSec }) => ({ exerciseKey, durationSec, restSec }));
}

export function moveExercise(entries: RoutineEntry[], id: string, direction: 'up' | 'down'): RoutineEntry[] {
  const from = entries.findIndex((entry) => entry.id === id);
  const to = direction === 'up' ? from - 1 : from + 1;
  if (from === -1 || to < 0 || to >= entries.length) return entries;

  const moved = [...entries];
  [moved[from], moved[to]] = [moved[to], moved[from]];
  return moved;
}

/** Convierte una rutina guardada en entradas del constructor, cada una con su propio identificador. */
export function entriesFromItems(items: WarmupItem[], createId: () => string): RoutineEntry[] {
  return items.slice(0, MAX_ROUTINE_ITEMS).map((item) => ({ ...item, id: createId() }));
}

/** Compara dos listas de ejercicios por contenido y orden, para saber si hay cambios sin guardar. */
export function areSameItems(a: WarmupItem[], b: WarmupItem[]): boolean {
  return (
    a.length === b.length &&
    a.every(
      (item, index) =>
        item.exerciseKey === b[index].exerciseKey &&
        item.durationSec === b[index].durationSec &&
        item.restSec === b[index].restSec,
    )
  );
}

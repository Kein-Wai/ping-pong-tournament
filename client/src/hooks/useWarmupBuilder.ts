import { useMemo, useState } from 'react';
import type { WarmupExerciseKey } from '../constants/warmupExercises';
import type { WarmupItem } from '../utils/warmupEngine';
import {
  addExercise,
  entriesFromItems,
  getTotalSec,
  MAX_ROUTINE_ITEMS,
  moveExercise,
  removeExercise,
  setRest,
  setDuration,
  toWarmupItems,
  type RoutineEntry,
} from '../utils/warmupRoutine';

/** Estado del constructor de rutinas: la lista que monta el jugador antes de pulsar «Preparado». */
export function useWarmupBuilder() {
  const [entries, setEntries] = useState<RoutineEntry[]>([]);

  const items = useMemo(() => toWarmupItems(entries), [entries]);

  return {
    entries,
    items,
    totalSec: getTotalSec(entries),
    canAdd: entries.length < MAX_ROUTINE_ITEMS,
    add: (exerciseKey: WarmupExerciseKey) =>
      setEntries((current) => addExercise(current, exerciseKey, crypto.randomUUID())),
    /** Sustituye la rutina en construcción por una guardada. */
    load: (saved: WarmupItem[]) => setEntries(entriesFromItems(saved, () => crypto.randomUUID())),
    remove: (id: string) => setEntries((current) => removeExercise(current, id)),
    move: (id: string, direction: 'up' | 'down') => setEntries((current) => moveExercise(current, id, direction)),
    changeDuration: (id: string, seconds: number) => setEntries((current) => setDuration(current, id, seconds)),
    changeRest: (id: string, seconds: number) => setEntries((current) => setRest(current, id, seconds)),
  };
}

import { useEffect, useRef, useState } from 'react';
import { warmupRoutinesService } from '../api/services/warmupRoutines';
import type { SavedWarmupRoutine } from '../types/warmupRoutine';
import type { WarmupItem } from '../utils/warmupEngine';
import { MAX_SAVED_ROUTINES } from '../utils/warmupRoutine';

interface UseWarmupRoutinesOptions {
  /** Se llama cuando una rutina guardada pasa a ser la activa, para que la pantalla la cargue en el constructor. */
  onSelect: (routine: SavedWarmupRoutine) => void;
}

/** Rutinas de calentamiento que el jugador tiene guardadas y cuál está activa. */
export function useWarmupRoutines({ onSelect }: UseWarmupRoutinesOptions) {
  const [routines, setRoutines] = useState<SavedWarmupRoutine[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const onSelectRef = useRef(onSelect);
  useEffect(() => {
    onSelectRef.current = onSelect;
  });

  useEffect(() => {
    let cancelled = false;
    warmupRoutinesService
      .list()
      .then((saved) => {
        if (cancelled) return;
        setRoutines(saved);
        // La API las devuelve con la guardada o modificada más recientemente primero.
        if (saved.length > 0) {
          setSelectedId(saved[0].id);
          onSelectRef.current(saved[0]);
        }
      })
      .catch(() => {
        // El interceptor de api/axios ya notifica el error.
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const [isSaving, setIsSaving] = useState(false);

  const select = (id: string) => {
    const routine = routines.find((candidate) => candidate.id === id);
    if (!routine) return;
    setSelectedId(id);
    onSelectRef.current(routine);
  };

  /** Ejecuta una escritura marcando `isSaving`. Devuelve null si falla: el interceptor ya avisa del error. */
  const write = async <T,>(action: () => Promise<T>): Promise<T | null> => {
    setIsSaving(true);
    try {
      return await action();
    } catch {
      return null;
    } finally {
      setIsSaving(false);
    }
  };

  const saveAsNew = async (name: string, items: WarmupItem[]) => {
    const created = await write(() => warmupRoutinesService.create({ name, items }));
    if (created) {
      setRoutines((current) => [created, ...current]);
      setSelectedId(created.id);
    }
    return created;
  };

  const selected = routines.find((routine) => routine.id === selectedId) ?? null;

  /** Sustituye una rutina ya guardada y la sube al principio: es la modificada más recientemente. */
  const replaceAndRaise = (updated: SavedWarmupRoutine) =>
    setRoutines((current) => [updated, ...current.filter((routine) => routine.id !== updated.id)]);

  const update = async (name: string, items: WarmupItem[]) => {
    if (!selected) return null;
    const updated = await write(() => warmupRoutinesService.update(selected.id, { name, items }));
    if (updated) replaceAndRaise(updated);
    return updated;
  };

  /** Guarda los ejercicios del constructor sobre la rutina activa, conservando su nombre. */
  const save = (items: WarmupItem[]) => update(selected?.name ?? '', items);

  /** Cambia el nombre de la rutina activa. Conserva los ejercicios guardados: no guarda cambios pendientes. */
  const rename = (name: string) => update(name, selected?.items ?? []);

  const remove = async (): Promise<boolean> => {
    if (!selected) return false;
    const removedId = selected.id;
    const result = await write(async () => {
      await warmupRoutinesService.remove(removedId);
      return true;
    });
    if (!result) return false;
    setRoutines((current) => current.filter((routine) => routine.id !== removedId));
    setSelectedId(null);
    return true;
  };

  return {
    select,
    save,
    rename,
    remove,
    saveAsNew,
    isSaving,
    routines,
    selectedId,
    selected,
    isLoading,
    canCreate: routines.length < MAX_SAVED_ROUTINES,
  };
}

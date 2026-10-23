import { useCallback, useMemo, useState } from 'react';
import { useApi } from './useApi';
import { exercisesService, trainingsService } from '../api/services/trainings';
import type { Exercise, PlayerTraining, TrainingSession } from '../types/api';

/**
 * Logica de dominio del detalle de un plan de entrenamiento.
 *
 * Concentra lo que antes vivia dentro del componente de pagina: cargar el plan,
 * cargar el catalogo de ejercicios y las tres acciones sobre los ejercicios de
 * una sesion (anadir, clonar y quitar). Al vivir en un hook, se puede probar
 * sin renderizar nada.
 */

/** Sesion de entrenamiento con su lista de ejercicios. */
export interface PlanSession extends TrainingSession {
  exercises: NonNullable<TrainingSession['exercises']>;
}

/** Ejercicio a anadir a una sesion. */
export interface ExercisePayload {
  exerciseId: string;
  sets?: number;
  reps?: number;
  durationMinutes?: number;
}

/** Sesion disponible como origen de un clonado. */
export interface SourceSessionOption {
  value: string;
  label: string;
  count: number;
}

/** Opciones del hook. */
export interface UseTrainingPlanOptions {
  /** Si es false, no se carga nada. */
  enabled?: boolean;
}

/** Resultado del hook. */
export interface UseTrainingPlanResult {
  plan: PlayerTraining | undefined;
  sessions: PlanSession[];
  catalog: Exercise[];
  isLoading: boolean;
  isSubmitting: boolean;
  error: Error | undefined;
  /** Sesiones que tienen ejercicios, para el modal de clonado. */
  availableSourceSessions: SourceSessionOption[];
  /** Anade un ejercicio a una sesion. */
  addExercise: (sessionId: string, payload: ExercisePayload) => Promise<void>;
  /** Copia los ejercicios de una sesion a otra. */
  cloneSession: (targetSessionId: string, sourceSessionId: string) => Promise<void>;
  /** Quita un ejercicio de una sesion. */
  removeExercise: (sessionExerciseId: string) => Promise<void>;
  /** Recarga el plan. */
  refetch: () => Promise<void>;
}

/** Maximo de ejercicios por sesion que admite la API. */
export const MAX_EXERCISES_PER_SESSION = 6;

export const useTrainingPlan = (
  planId: string | undefined,
  options: UseTrainingPlanOptions = {},
): UseTrainingPlanResult => {
  const { enabled = true } = options;
  const hasPlan = Boolean(planId);

  const planQuery = useApi<PlayerTraining>(
    () => trainingsService.planById(planId as string),
    [planId],
    { enabled: enabled && hasPlan },
  );

  const catalogQuery = useApi<Exercise[]>(() => exercisesService.list(), [planId], { enabled });

  const [isSubmitting, setIsSubmitting] = useState(false);

  const sessions = useMemo<PlanSession[]>(
    () => (planQuery.data?.sessions ?? []) as PlanSession[],
    [planQuery.data],
  );

  const availableSourceSessions = useMemo<SourceSessionOption[]>(
    () =>
      sessions
        .map((session, index) => ({
          id: session.id,
          number: index + 1,
          count: session.exercises?.length || 0,
        }))
        .filter((session) => session.count > 0)
        .map((session) => ({
          value: session.id,
          label: `Sesión ${session.number} (${session.count} ejercicios)`,
          count: session.count,
        })),
    [sessions],
  );

  const runAction = useCallback(
    async (action: () => Promise<unknown>) => {
      setIsSubmitting(true);
      try {
        await action();
        await planQuery.refetch();
      } finally {
        setIsSubmitting(false);
      }
    },
    [planQuery],
  );

  const addExercise = useCallback(
    (sessionId: string, payload: ExercisePayload) =>
      runAction(() => trainingsService.addExercise(sessionId, payload)),
    [runAction],
  );

  const cloneSession = useCallback(
    (targetSessionId: string, sourceSessionId: string) =>
      runAction(() => trainingsService.cloneSession(targetSessionId, sourceSessionId)),
    [runAction],
  );

  const removeExercise = useCallback(
    (sessionExerciseId: string) =>
      runAction(() => trainingsService.deleteExercise(sessionExerciseId)),
    [runAction],
  );

  return {
    plan: planQuery.data,
    sessions,
    catalog: catalogQuery.data ?? [],
    isLoading: planQuery.isLoading || catalogQuery.isLoading,
    isSubmitting,
    error: planQuery.error ?? catalogQuery.error,
    availableSourceSessions,
    addExercise,
    cloneSession,
    removeExercise,
    refetch: planQuery.refetch,
  };
};

export default useTrainingPlan;

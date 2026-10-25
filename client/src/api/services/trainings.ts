import { http } from '../client';
import { ENDPOINTS } from '../endpoints';
import type { Exercise, PlayerTraining, SessionExercise, TrainingSession } from '../../types/api';
import type { ExerciseCategory } from '../../types/enums';

/**
 * Servicios de planes y sesiones de entrenamiento.
 *
 * Los payloads reflejan los esquemas Zod de la API (api/src/schemas/training.ts y
 * exercise.ts). deletePlan, deleteExercise y cloneSession responden solo
 * { success, message }: no devuelven datos.
 */

/** Datos para crear un plan de entrenamiento (createTrainingSchema): todos son obligatorios. */
export interface CreateTrainingPayload {
  playerId: string;
  strengths: string;
  weaknesses: string;
  objectives: string;
  sessionsPerWeek: number;
  weeks: number;
  startDate: string;
}

/** Ejercicio que se anade a una sesion (addExerciseToSessionSchema). */
export interface AddExercisePayload {
  exerciseId: string;
  sets?: number;
  reps?: number;
  durationMinutes?: number;
}

/** Cambios sobre un ejercicio de una sesion: lo que lee la ruta PUT es `completed` y `notes`. */
export interface UpdateSessionExercisePayload {
  completed?: boolean;
  notes?: string;
}

/** Datos para crear un ejercicio del catalogo (createExerciseSchema). */
export interface CreateExercisePayload {
  name: string;
  description: string;
  category: ExerciseCategory;
  objective?: string | null;
  code?: number;
}

export const trainingsService = {
  byPlayer: (playerId: string) =>
    http.get<PlayerTraining[]>(ENDPOINTS.TRAININGS.BY_PLAYER(playerId)),

  planById: (planId: string) => http.get<PlayerTraining>(ENDPOINTS.TRAININGS.PLAN_BY_ID(planId)),

  createPlan: (payload: CreateTrainingPayload) =>
    http.post<PlayerTraining>(ENDPOINTS.TRAININGS.BASE, payload),

  deletePlan: (planId: string) => http.delete<void>(ENDPOINTS.TRAININGS.PLAN_BY_ID(planId)),

  sessionDetails: (sessionId: string) =>
    http.get<TrainingSession>(ENDPOINTS.TRAININGS.SESSION_DETAILS(sessionId)),

  addExercise: (sessionId: string, payload: AddExercisePayload) =>
    http.post<SessionExercise>(ENDPOINTS.TRAININGS.SESSIONS(sessionId), payload),

  updateExercise: (sessionExerciseId: string, payload: UpdateSessionExercisePayload) =>
    http.put<SessionExercise>(ENDPOINTS.TRAININGS.UPDATE_EXERCISE(sessionExerciseId), payload),

  deleteExercise: (sessionExerciseId: string) =>
    http.delete<void>(ENDPOINTS.TRAININGS.DELETE_EXERCISE(sessionExerciseId)),

  cloneSession: (targetId: string, sourceId: string) =>
    http.post<void>(ENDPOINTS.TRAININGS.CLONE_SESSION(targetId, sourceId)),
};

export const exercisesService = {
  /** Catalogo de ejercicios, opcionalmente filtrado por categoria (?category=). */
  list: (category?: ExerciseCategory) =>
    http.get<Exercise[]>(ENDPOINTS.EXERCISES.BASE, category ? { params: { category } } : undefined),

  create: (payload: CreateExercisePayload) => http.post<Exercise>(ENDPOINTS.EXERCISES.BASE, payload),
};

export default trainingsService;

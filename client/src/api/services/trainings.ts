import { http } from '../client';
import { ENDPOINTS } from '../endpoints';
import type {
  Exercise,
  PlayerTraining,
  SessionExercise,
  TrainingSession,
} from '../../types/api';

/** Servicios de planes y sesiones de entrenamiento. */

/** Datos para crear un plan de entrenamiento. */
export interface CreateTrainingPayload {
  playerId: string;
  strengths?: string;
  weaknesses?: string;
  objectives?: string;
  sessionsPerWeek: number;
  weeks: number;
  startDate: string;
}

/** Datos para crear una sesion de entrenamiento. */
export interface CreateSessionPayload {
  playerTrainingId?: string;
  date: string;
  title?: string;
}

/** Ejercicio que se anade a una sesion. */
export interface AddExercisePayload {
  exerciseId: string;
  sets?: number;
  reps?: number;
  durationMinutes?: number;
  notes?: string;
}

export const trainingsService = {
  byPlayer: (playerId: string) =>
    http.get<PlayerTraining[]>(ENDPOINTS.TRAININGS.BY_PLAYER(playerId)),

  planById: (planId: string) => http.get<PlayerTraining>(ENDPOINTS.TRAININGS.DELETE_PLAN(planId)),

  createPlan: (payload: CreateTrainingPayload) =>
    http.post<PlayerTraining>(ENDPOINTS.TRAININGS.BASE, payload),

  deletePlan: (planId: string) => http.delete<void>(ENDPOINTS.TRAININGS.DELETE_PLAN(planId)),

  createSession: (payload: CreateSessionPayload) =>
    http.post<TrainingSession>(ENDPOINTS.TRAININGS.BASE, payload),

  sessionDetails: (sessionId: string) =>
    http.get<TrainingSession>(ENDPOINTS.TRAININGS.SESSION_DETAILS(sessionId)),

  upcoming: (playerId: string) =>
    http.get<TrainingSession[]>(ENDPOINTS.TRAININGS.UPCOMING(playerId)),

  addExercise: (sessionId: string, payload: AddExercisePayload) =>
    http.post<SessionExercise>(ENDPOINTS.TRAININGS.SESSIONS(sessionId), payload),

  updateExercise: (sessionExerciseId: string, payload: Partial<AddExercisePayload>) =>
    http.put<SessionExercise>(ENDPOINTS.TRAININGS.UPDATE_EXERCISE(sessionExerciseId), payload),

  deleteExercise: (sessionExerciseId: string) =>
    http.delete<void>(ENDPOINTS.TRAININGS.DELETE_EXERCISE(sessionExerciseId)),

  cloneSession: (targetId: string, sourceId: string) =>
    http.post<TrainingSession>(ENDPOINTS.TRAININGS.CLONE_SESSION(targetId, sourceId)),
};

export const exercisesService = {
  list: () => http.get<Exercise[]>(ENDPOINTS.EXERCISES.BASE),

  create: (payload: { name: string; description: string; objective?: string; category?: string }) =>
    http.post<Exercise>(ENDPOINTS.EXERCISES.BASE, payload),
};

export default trainingsService;

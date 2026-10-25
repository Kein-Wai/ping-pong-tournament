import { http } from '../client';
import { ENDPOINTS } from '../endpoints';
import type { GeneralTraining, GeneralTrainingSchedule } from '../../types/api';

/**
 * Servicios de entrenamientos generales de club.
 *
 * Los payloads reflejan los esquemas Zod de la API (api/src/schemas/generalTraining.ts).
 * El club sale siempre del token. create, deleteSchedule y bulkAttendance responden
 * solo { success, message }: no devuelven datos.
 */

/** Datos de un horario fijo (createScheduleSchema): horas en formato HH:mm, dias 0 (domingo) a 6. */
export interface SchedulePayload {
  name: string;
  startTime: string;
  endTime: string;
  daysOfWeek: number[];
}

/**
 * Datos para programar sesiones en un rango de fechas (createGeneralTrainingSchema).
 * Las habilidades sin marcar se interpretan como `false`.
 */
export interface CreateGeneralTrainingPayload {
  description?: string;
  startDate: string;
  endDate: string;
  scheduleId: string;
  skillsToTrain: Record<string, boolean>;
}

/** Jugadores presentes en una sesion (bulkAttendanceSchema): sustituye a la lista anterior. */
export interface BulkAttendancePayload {
  playerIds: string[];
}

export const generalTrainingsService = {
  list: () => http.get<GeneralTraining[]>(ENDPOINTS.GENERAL_TRAININGS.BASE),

  schedules: () => http.get<GeneralTrainingSchedule[]>(ENDPOINTS.GENERAL_TRAININGS.SCHEDULES),

  createSchedule: (payload: SchedulePayload) =>
    http.post<GeneralTrainingSchedule>(ENDPOINTS.GENERAL_TRAININGS.SCHEDULES, payload),

  updateSchedule: (id: string, payload: Partial<SchedulePayload>) =>
    http.put<GeneralTrainingSchedule>(ENDPOINTS.GENERAL_TRAININGS.SCHEDULE_BY_ID(id), payload),

  deleteSchedule: (id: string) =>
    http.delete<void>(ENDPOINTS.GENERAL_TRAININGS.SCHEDULE_BY_ID(id)),

  create: (payload: CreateGeneralTrainingPayload) =>
    http.post<void>(ENDPOINTS.GENERAL_TRAININGS.BASE, payload),

  bulkAttendance: (id: string, payload: BulkAttendancePayload) =>
    http.put<void>(ENDPOINTS.GENERAL_TRAININGS.BULK_ATTENDANCE(id), payload),
};

export default generalTrainingsService;

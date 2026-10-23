import { http } from '../client';
import { ENDPOINTS } from '../endpoints';
import type { GeneralTraining, GeneralTrainingSchedule } from '../../types/api';

/** Servicios de entrenamientos generales de club. */

export const generalTrainingsService = {
  list: () => http.get<GeneralTraining[]>(ENDPOINTS.GENERAL_TRAININGS.BASE),

  schedules: () => http.get<GeneralTrainingSchedule[]>(ENDPOINTS.GENERAL_TRAININGS.SCHEDULES),

  create: (payload: unknown) => http.post<GeneralTraining>(ENDPOINTS.GENERAL_TRAININGS.BASE, payload),

  bulkAttendance: (id: string, payload: unknown) =>
    http.post<void>(ENDPOINTS.GENERAL_TRAININGS.BULK_ATTENDANCE(id), payload),
};

export default generalTrainingsService;

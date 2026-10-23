import { http } from '../client';
import { ENDPOINTS } from '../endpoints';
import type { AppFeedback } from '../../types/api';

/** Servicios de feedback de la aplicacion. */

export const feedbackService = {
  list: () => http.get<AppFeedback[]>(ENDPOINTS.FEEDBACK.BASE),

  create: (payload: { type: string; content: string }) =>
    http.post<AppFeedback>(ENDPOINTS.FEEDBACK.BASE, payload),

  updateStatus: (id: string, status: string) =>
    http.put<AppFeedback>(ENDPOINTS.FEEDBACK.UPDATE_STATUS(id), { status }),
};

export default feedbackService;

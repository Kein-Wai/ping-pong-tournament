import { http } from '../client';
import { ENDPOINTS } from '../endpoints';
import type { SavedWarmupRoutine, WarmupRoutinePayload } from '../../types/warmupRoutine';

/**
 * Servicios de las rutinas de calentamiento guardadas (solo jugadores).
 *
 * `list` llega ordenada con la guardada o modificada más recientemente primero.
 * `remove` responde solo { success, message }: no devuelve datos.
 */
export const warmupRoutinesService = {
  list: () => http.get<SavedWarmupRoutine[]>(ENDPOINTS.WARMUP_ROUTINES.BASE),

  create: (payload: WarmupRoutinePayload) =>
    http.post<SavedWarmupRoutine>(ENDPOINTS.WARMUP_ROUTINES.BASE, payload),

  update: (id: string, payload: WarmupRoutinePayload) =>
    http.put<SavedWarmupRoutine>(ENDPOINTS.WARMUP_ROUTINES.BY_ID(id), payload),

  remove: (id: string) => http.delete<void>(ENDPOINTS.WARMUP_ROUTINES.BY_ID(id)),
};

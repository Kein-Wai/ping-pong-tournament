import { http } from '../client';
import { ENDPOINTS } from '../endpoints';
import type { ClubEvent } from '../../types/api';
import type { EventRegion } from '../../types/enums';

/**
 * Servicios de eventos de club.
 *
 * Los payloads reflejan los esquemas Zod de la API (api/src/schemas/event.ts). El
 * club sale siempre del token. remove y los recordatorios responden solo
 * { success, message }: no devuelven datos.
 */

/** Datos de un evento (createEventSchema). */
export interface EventPayload {
  name: string;
  date: string;
  endDate?: string | null;
  region?: EventRegion;
  location?: string | null;
  color?: string;
}

export const eventsService = {
  byClub: (clubId: string) => http.get<ClubEvent[]>(ENDPOINTS.EVENTS.BY_CLUB(clubId)),

  create: (payload: EventPayload) => http.post<ClubEvent>(ENDPOINTS.EVENTS.BASE, payload),

  update: (id: string, payload: Partial<EventPayload>) =>
    http.put<ClubEvent>(ENDPOINTS.EVENTS.UPDATE(id), payload),

  remove: (id: string) => http.delete<void>(ENDPOINTS.EVENTS.DELETE(id)),

  /** Activa los avisos de una semana y de un dia antes del evento para el usuario. */
  addReminder: (id: string) => http.post<void>(ENDPOINTS.EVENTS.REMINDERS(id)),

  /** Cancela los avisos del usuario para ese evento. */
  removeReminder: (id: string) => http.delete<void>(ENDPOINTS.EVENTS.REMINDERS(id)),
};

export default eventsService;

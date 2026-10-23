import { http } from '../client';
import { ENDPOINTS } from '../endpoints';
import type { ClubEvent } from '../../types/api';

/** Servicios de eventos de club. */

export const eventsService = {
  byClub: (clubId: string) => http.get<ClubEvent[]>(ENDPOINTS.EVENTS.BY_CLUB(clubId)),

  update: (id: string, payload: Partial<ClubEvent>) =>
    http.put<ClubEvent>(ENDPOINTS.EVENTS.UPDATE(id), payload),

  reminders: (id: string) => http.get<unknown[]>(ENDPOINTS.EVENTS.REMINDERS(id)),
};

export default eventsService;

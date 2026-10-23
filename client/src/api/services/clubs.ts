import { http } from '../client';
import { ENDPOINTS } from '../endpoints';
import type { Club, User } from '../../types/api';

/** Servicios de clubes y membresias. */

/** Datos para crear o actualizar un club. */
export interface ClubPayload {
  name: string;
  city?: string;
  address?: string;
  status?: string;
  logoUrl?: string;
  foundedAt?: string;
}

/** Datos para cambiar el estado de un miembro del club. */
export interface MemberStatusPayload {
  status: string;
}

export const clubsService = {
  list: () => http.get<Club[]>(ENDPOINTS.CLUBS.BASE),

  adminList: () => http.get<Club[]>(ENDPOINTS.CLUBS.ADMIN_ALL),

  byId: (id: string) => http.get<Club>(ENDPOINTS.CLUBS.BY_ID(id)),

  create: (payload: ClubPayload) => http.post<Club>(ENDPOINTS.CLUBS.BASE, payload),

  update: (id: string, payload: Partial<ClubPayload>) =>
    http.put<Club>(ENDPOINTS.CLUBS.UPDATE(id), payload),

  join: (clubId: string) => http.post<Club>(ENDPOINTS.CLUBS.JOIN(clubId)),

  members: (clubId: string) => http.get<User[]>(ENDPOINTS.CLUBS.MEMBERS(clubId)),

  updateMemberStatus: (clubId: string, userId: string, status: string) =>
    http.put<User>(ENDPOINTS.CLUBS.MEMBER_STATUS(clubId, userId), { status }),

  notifications: (id: string) => http.get<unknown[]>(ENDPOINTS.CLUBS.NOTIFICATIONS(id)),
};

export default clubsService;

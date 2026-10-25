import { http } from '../client';
import { ENDPOINTS } from '../endpoints';
import type {
  Club,
  ClubAdminData,
  ClubDetails,
  ClubListItem,
  ClubNotifications,
  SkillValues,
} from '../../types/api';
import type { ClubStatus, PlayerLevel } from '../../types/enums';

/**
 * Servicios de clubes y membresias.
 *
 * Los payloads reflejan los esquemas Zod de la API (api/src/schemas/club.ts).
 * join y updateMemberStatus responden solo { success, message }: no devuelven datos.
 */

/** Datos para crear un club (createClubSchema). */
export interface ClubPayload {
  name: string;
  city: string;
  address?: string | null;
  foundedAt?: string | null;
  logoUrl?: string | null;
}

/** Cambios sobre un club (updateClubSchema): el estado solo lo cambia el SuperAdmin. */
export interface UpdateClubPayload extends Partial<ClubPayload> {
  status?: ClubStatus;
}

/**
 * Resolucion de una solicitud de ingreso (updateMemberStatusSchema). Nivel, ELO
 * y habilidades solo se aplican al aprobar.
 */
export interface MemberStatusPayload {
  status: 'Aprobado' | 'Rechazado';
  level?: PlayerLevel;
  elo?: number;
  skills?: SkillValues;
}

export const clubsService = {
  list: () => http.get<ClubListItem[]>(ENDPOINTS.CLUBS.BASE),

  adminList: () => http.get<ClubAdminData[]>(ENDPOINTS.CLUBS.ADMIN_ALL),

  byId: (id: string) => http.get<ClubDetails>(ENDPOINTS.CLUBS.BY_ID(id)),

  create: (payload: ClubPayload) => http.post<Club>(ENDPOINTS.CLUBS.BASE, payload),

  update: (id: string, payload: UpdateClubPayload) =>
    http.put<Club>(ENDPOINTS.CLUBS.UPDATE(id), payload),

  join: (clubId: string) => http.post<void>(ENDPOINTS.CLUBS.JOIN(clubId)),

  updateMemberStatus: (clubId: string, userId: string, payload: MemberStatusPayload) =>
    http.put<void>(ENDPOINTS.CLUBS.MEMBER_STATUS(clubId, userId), payload),

  notifications: (id: string) => http.get<ClubNotifications>(ENDPOINTS.CLUBS.NOTIFICATIONS(id)),
};

export default clubsService;

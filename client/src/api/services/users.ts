import { http } from '../client';
import { ENDPOINTS } from '../endpoints';
import type { SkillValues, User } from '../../types/api';
import type { DominantHand, PlayerLevel, Playstyle, RubberType } from '../../types/enums';

/**
 * Servicios de usuarios y jugadores.
 *
 * Los payloads reflejan los esquemas Zod de la API (api/src/schemas/user.ts):
 * lo que no esta ahi, la API lo descarta.
 */

/** Datos para crear un jugador (createUserSchema). */
export interface CreateUserPayload {
  email: string;
  name: string;
  surname?: string | null;
  password?: string;
  elo?: number;
  clubId?: string | null;
  level?: PlayerLevel;
  dominantHand?: DominantHand | null;
  playstyle?: Playstyle | null;
  rubberForehand?: RubberType | null;
  rubberBackhand?: RubberType | null;
  skills?: SkillValues;
}

/**
 * Datos para crear un jugador invitado (createGuestSchema). El club sale del
 * token de quien lo crea, nunca del cuerpo.
 */
export interface CreateGuestPayload {
  name: string;
  surname?: string | null;
  level?: PlayerLevel;
  dominantHand?: DominantHand | null;
  playstyle?: Playstyle | null;
  rubberForehand?: RubberType | null;
  rubberBackhand?: RubberType | null;
  elo?: number;
  skills?: SkillValues;
}

/** Cambios sobre cualquier jugador, para administradores (updateUserSchema). */
export interface UpdateUserPayload extends Partial<CreateUserPayload> {
  nickname?: string | null;
  avatarUrl?: string | null;
  birthDate?: string | null;
  newPassword?: string | null;
  confirmPassword?: string | null;
}

/** Cambios sobre el perfil propio (updateProfileSchema). */
export interface UpdateProfilePayload {
  name?: string;
  surname?: string | null;
  nickname?: string | null;
  avatarUrl?: string | null;
  birthDate?: string | null;
  dominantHand?: DominantHand | null;
  playstyle?: Playstyle | null;
  rubberForehand?: RubberType | null;
  rubberBackhand?: RubberType | null;
  currentPassword?: string;
  newPassword?: string | null;
  confirmPassword?: string | null;
}

export const usersService = {
  /** `T` deja a cada pantalla tipar el jugador con la proyección que consume. */
  list: <T = User>() => http.get<T[]>(ENDPOINTS.USERS.BASE),

  byId: (id: string) => http.get<User>(ENDPOINTS.USERS.BY_ID(id)),

  me: () => http.get<User>(ENDPOINTS.USERS.ME),

  create: (payload: CreateUserPayload) => http.post<User>(ENDPOINTS.USERS.BASE, payload),

  createGuest: (payload: CreateGuestPayload) =>
    http.post<User>(ENDPOINTS.USERS.CREATE_GUEST, payload),

  update: (id: string, payload: UpdateUserPayload) =>
    http.put<User>(ENDPOINTS.USERS.BY_ID(id), payload),

  updateProfile: (payload: UpdateProfilePayload) => http.put<User>(ENDPOINTS.USERS.ME, payload),
};

export default usersService;

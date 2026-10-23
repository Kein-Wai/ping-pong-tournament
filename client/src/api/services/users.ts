import { http } from '../client';
import { ENDPOINTS } from '../endpoints';
import type { User } from '../../types/api';

/** Servicios de usuarios y jugadores. */

/** Datos para crear un jugador. */
export interface CreateUserPayload {
  email: string;
  password?: string;
  name: string;
  surname?: string;
  birthDate?: string;
  dominantHand?: string;
  playstyle?: string;
  clubId?: string;
  level?: string;
}

/** Datos para crear un jugador invitado. */
export interface CreateGuestPayload {
  name: string;
  email?: string;
  clubId?: string;
}

/** Datos del perfil propio. */
export interface UpdateProfilePayload {
  name?: string;
  surname?: string;
  secondSurname?: string;
  nickname?: string;
  birthDate?: string;
  dominantHand?: string;
  playstyle?: string;
  rubberForehand?: string;
  rubberBackhand?: string;
}

export const usersService = {
  list: () => http.get<User[]>(ENDPOINTS.USERS.BASE),

  byId: (id: string) => http.get<User>(ENDPOINTS.USERS.BY_ID(id)),

  me: () => http.get<User>(ENDPOINTS.USERS.ME),

  create: (payload: CreateUserPayload) => http.post<User>(ENDPOINTS.USERS.BASE, payload),

  createGuest: (payload: CreateGuestPayload) =>
    http.post<User>(ENDPOINTS.USERS.CREATE_GUEST, payload),

  update: (id: string, payload: Partial<CreateUserPayload>) =>
    http.put<User>(ENDPOINTS.USERS.BY_ID(id), payload),

  updateProfile: (payload: UpdateProfilePayload) =>
    http.put<User>(ENDPOINTS.USERS.ME, payload),

  resetPassword: (id: string) => http.put<User>(ENDPOINTS.USERS.BY_ID(id), { password: '' }),
};

export default usersService;

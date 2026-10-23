import { http } from '../client';
import { ENDPOINTS } from '../endpoints';
import type { User } from '../../types/api';

/**
 * Servicios de autenticacion.
 *
 * Cada funcion es una operacion del dominio: una llamada, un tipo de entrada y
 * un tipo de salida. Las paginas no conocen URLs ni el formato del sobre.
 */

/** Credenciales de inicio de sesion. */
export interface LoginPayload {
  email: string;
  password: string;
}

/** Token y usuario devueltos tras autenticarse. */
export interface AuthResult {
  token: string;
  user?: User;
}

/** Datos de registro de un nuevo jugador. */
export interface RegisterPayload {
  email: string;
  password: string;
  name: string;
  surname?: string;
  birthDate?: string;
  dominantHand?: string;
  playstyle?: string;
  clubId?: string;
}

export const authService = {
  login: (payload: LoginPayload) => http.post<AuthResult>(ENDPOINTS.AUTH.LOGIN, payload),

  register: (payload: RegisterPayload) => http.post<AuthResult>(ENDPOINTS.AUTH.REGISTER, payload),

  loginWithGoogle: (credential: string) =>
    http.post<AuthResult>(ENDPOINTS.AUTH.GOOGLE, { credential }),

  forgotPassword: (email: string) =>
    http.post<void>(ENDPOINTS.AUTH.FORGOT_PASSWORD, { email }),

  resetPassword: (token: string, password: string) =>
    http.post<void>(ENDPOINTS.AUTH.RESET_PASSWORD, { token, password }),
};

export default authService;

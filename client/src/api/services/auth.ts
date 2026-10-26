import { http } from '../client';
import { ENDPOINTS } from '../endpoints';

/**
 * Servicios de autenticacion.
 *
 * Cada funcion es una operacion del dominio: una llamada, un tipo de entrada y
 * un tipo de salida. Las paginas no conocen URLs ni el formato del sobre.
 *
 * Las rutas de /auth usan el sobre de siempre: login y Google devuelven la sesion
 * en `data` ({ token, refreshToken }); register, logout, forgot-password y
 * reset-password responden solo { success, message }, asi que no devuelven datos
 * (el mensaje lo muestra el interceptor de axios).
 */

/** Rol que puede elegirse al registrarse o entrar con Google. */
export type SelfServiceRole = 'Player' | 'AdminClub';

/** Credenciales de inicio de sesion. */
export interface LoginPayload {
  email: string;
  password: string;
}

/** Sesión devuelta tras autenticarse (login local y Google): token de acceso corto y refresh token. */
export interface AuthResult {
  token: string;
  refreshToken: string;
}

/** Datos de registro tal como los valida registerSchema en la API. */
export interface RegisterPayload {
  email: string;
  password: string;
  confirmPassword: string;
  name: string;
  surname?: string | null;
  /** La pantalla lo envia, pero la API lo descarta: no forma parte de registerSchema. */
  secondSurname?: string | null;
  role?: SelfServiceRole;
}

export const authService = {
  login: (payload: LoginPayload) => http.post<AuthResult>(ENDPOINTS.AUTH.LOGIN, payload),

  register: (payload: RegisterPayload) =>
    http.post<void>(ENDPOINTS.AUTH.REGISTER, payload),

  loginWithGoogle: (credential: string, role: SelfServiceRole = 'Player') =>
    http.post<AuthResult>(ENDPOINTS.AUTH.GOOGLE, { credential, role }),

  /** Revoca el refresh token en el servidor: sin esto el logout solo borraría la copia local. */
  logout: (refreshToken: string) =>
    http.post<void>(ENDPOINTS.AUTH.LOGOUT, { refreshToken }),

  forgotPassword: (email: string) =>
    http.post<void>(ENDPOINTS.AUTH.FORGOT_PASSWORD, { email }),

  resetPassword: (token: string, newPassword: string, confirmPassword: string) =>
    http.post<void>(ENDPOINTS.AUTH.RESET_PASSWORD, {
      token,
      newPassword,
      confirmPassword,
    }),
};

export default authService;

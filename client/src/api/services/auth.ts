import { http } from '../client';
import { ENDPOINTS } from '../endpoints';

/**
 * Servicios de autenticacion.
 *
 * Cada funcion es una operacion del dominio: una llamada, un tipo de entrada y
 * un tipo de salida. Las paginas no conocen URLs ni el formato del sobre.
 *
 * Las rutas de /auth responden FUERA del sobre { success, data }: devuelven
 * { message, token } (login y google) o solo { message } (register,
 * forgot-password y reset-password). El adaptador http las deja pasar tal cual
 * porque no traen la clave `success`.
 */

/** Rol que puede elegirse al registrarse o entrar con Google. */
export type SelfServiceRole = 'Player' | 'AdminClub';

/** Credenciales de inicio de sesion. */
export interface LoginPayload {
  email: string;
  password: string;
}

/** Respuesta de la API que solo trae un mensaje. */
export interface MessageResult {
  message: string;
}

/** Token devuelto tras autenticarse (login local y Google). */
export interface AuthResult extends MessageResult {
  token: string;
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
    http.post<MessageResult>(ENDPOINTS.AUTH.REGISTER, payload),

  loginWithGoogle: (credential: string, role: SelfServiceRole = 'Player') =>
    http.post<AuthResult>(ENDPOINTS.AUTH.GOOGLE, { credential, role }),

  forgotPassword: (email: string) =>
    http.post<MessageResult>(ENDPOINTS.AUTH.FORGOT_PASSWORD, { email }),

  resetPassword: (token: string, newPassword: string, confirmPassword: string) =>
    http.post<MessageResult>(ENDPOINTS.AUTH.RESET_PASSWORD, {
      token,
      newPassword,
      confirmPassword,
    }),
};

export default authService;

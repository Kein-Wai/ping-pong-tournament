import axios from 'axios';
import { ENDPOINTS } from './endpoints';

export const ACCESS_TOKEN_KEY = 'pingpong_token';
export const REFRESH_TOKEN_KEY = 'pingpong_refresh_token';

// Quien mantiene el estado de sesión lo registra main.tsx: importar el store aquí cerraba el ciclo
// axios → session → authStore → servicios → client → axios.
let onTokenRefreshed: ((token: string) => void) | null = null;

export const setTokenRefreshedHandler = (handler: ((token: string) => void) | null) => {
  onTokenRefreshed = handler;
};

interface RefreshedSession {
  token: string;
  refreshToken: string;
}

// Todas las peticiones que reciben un 401 a la vez comparten una sola renovación: el refresh
// token rota en cada uso, así que un segundo canje con el mismo valor revocaría la sesión.
let inFlight: Promise<string | null> | null = null;

const renew = async (): Promise<string | null> => {
  const refreshToken = localStorage.getItem(REFRESH_TOKEN_KEY);
  if (!refreshToken) return null;

  try {
    // axios a pelo: pasar por `api` dispararía de nuevo el interceptor de 401.
    const response = await axios.post<{ data: RefreshedSession }>(
      `${import.meta.env.VITE_API_URL}${ENDPOINTS.AUTH.REFRESH}`,
      { refreshToken },
    );
    const { token, refreshToken: rotated } = response.data.data;
    localStorage.setItem(ACCESS_TOKEN_KEY, token);
    localStorage.setItem(REFRESH_TOKEN_KEY, rotated);
    onTokenRefreshed?.(token);
    return token;
  } catch (error) {
    // Solo una respuesta del servidor invalida la sesión: sin red se conserva para reintentar luego.
    if (axios.isAxiosError(error) && error.response) {
      localStorage.removeItem(REFRESH_TOKEN_KEY);
      return null;
    }
    throw error;
  }
};

/**
 * Renueva la sesión con el refresh token guardado. Devuelve el token de acceso
 * nuevo, `null` si la sesión ya no es recuperable (hay que volver al login) y
 * lanza si no se pudo llegar al servidor.
 */
export const refreshSession = (): Promise<string | null> => {
  inFlight ??= renew().finally(() => {
    inFlight = null;
  });
  return inFlight;
};

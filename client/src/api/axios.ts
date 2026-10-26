import axios, { type InternalAxiosRequestConfig } from 'axios';
import { notifications } from '@mantine/notifications';
import { extractErrorMessage, NETWORK_ERROR_MESSAGE } from './errors';
import { errorNotifier } from './notify';
import { ENDPOINTS } from './endpoints';
import { ACCESS_TOKEN_KEY, refreshSession } from './session';

// Estas rutas devuelven 401 por motivos propios (credenciales, sesión ya inválida): renovar no aplica.
const AUTH_URLS = [
  ENDPOINTS.AUTH.LOGIN,
  ENDPOINTS.AUTH.GOOGLE,
  ENDPOINTS.AUTH.REFRESH,
  ENDPOINTS.AUTH.LOGOUT,
];

type RetriableConfig = InternalAxiosRequestConfig & { _retried?: boolean };

// Quien cierra la sesión lo registra main.tsx: importar el store aquí cerraba el ciclo
// axios → authStore → servicios → client → axios.
let onUnauthorized: (() => void) | null = null;

export const setUnauthorizedHandler = (handler: (() => void) | null) => {
  onUnauthorized = handler;
};

export const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL,
  timeout: 10000,
});

api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem(ACCESS_TOKEN_KEY);
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error),
);

api.interceptors.response.use(
  (response) => {
    const { method } = response.config;

    // Si la operación modifica datos (POST, PUT, DELETE) y es exitosa
    if (method && ['post', 'put', 'delete'].includes(method.toLowerCase())) {
      notifications.show({
        title: 'Operación exitosa',
        message: response.data?.message || 'La acción se ha procesado correctamente.',
        color: 'green',
      });
    }
    return response;
  },
  async (error) => {
    if (error.response) {
      const { status, data, config } = error.response;

      if (status === 401) {
        if (AUTH_URLS.some((url) => config.url?.includes(url))) {
          return Promise.reject(error);
        }

        // El token de acceso dura una hora: antes de dar la sesión por caducada se intenta renovarla.
        if (!(config as RetriableConfig)._retried) {
          try {
            const token = await refreshSession();
            if (token) {
              const retry: RetriableConfig = { ...config, _retried: true };
              retry.headers = { ...config.headers, Authorization: `Bearer ${token}` } as never;
              return api.request(retry);
            }
          } catch {
            // Sin red no se sabe si la sesión sigue viva: se deja fallar la petición sin cerrarla.
            return Promise.reject(error);
          }
        }

        console.warn('Sesión caducada. Redirigiendo al Login...');

        onUnauthorized?.();

        window.location.href = '/login';
        return Promise.reject(error);
      }

      // Extraer el mensaje usando la funcion tolerante a ambos formatos de Zod
      const errorMessage = extractErrorMessage(data, 'Ocurrió un error inesperado.');
      const dedupeKey = `Error (${status}): ${errorMessage}`;

      if (errorNotifier(dedupeKey)) {
        notifications.show({
          title: `Error (${status})`,
          message: errorMessage,
          color: 'red',
        });
      }
    } else {
      notifications.show({
        title: 'Error de red',
        message: NETWORK_ERROR_MESSAGE,
        color: 'red',
      });
    }
    return Promise.reject(error);
  },
);

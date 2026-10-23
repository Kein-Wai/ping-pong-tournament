import axios from 'axios';
import { notifications } from '@mantine/notifications';
import { useAuthStore } from '../store/authStore';
import { extractErrorMessage, NETWORK_ERROR_MESSAGE } from './errors';
import { errorNotifier } from './notify';

export const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL,
  timeout: 10000,
});

api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('pingpong_token');
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
  (error) => {
    if (error.response) {
      const { status, data, config } = error.response;

      if (status === 401) {
        if (config.url?.includes('/auth/login') || config.url?.includes('/auth/google')) {
          return Promise.reject(error);
        }

        console.warn('Sesión caducada. Redirigiendo al Login...');

        useAuthStore.getState().logout();

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

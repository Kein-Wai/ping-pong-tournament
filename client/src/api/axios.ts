import axios from 'axios';
import { notifications } from '@mantine/notifications';

export const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL,
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
        localStorage.removeItem('pingpong_token');
        localStorage.removeItem('pingpong_user');
        window.location.href = '/login';
        return Promise.reject(error);
      }

      // Procesar errores solo para mutaciones (POST, PUT, DELETE) o errores Zod de validación
      if (config.method && ['post', 'put', 'delete'].includes(config.method.toLowerCase())) {
        let errorMessage = data?.error || 'Ocurrió un error inesperado.';

        // Si el backend expone los detalles de validación de Zod
        if (data?.details && Array.isArray(data.details)) {
          errorMessage = data.details
            .map((d: any) => `${d.path.join('.')}: ${d.message}`)
            .join(' | ');
        } else if (typeof data?.error === 'object') {
          errorMessage = JSON.stringify(data.error);
        }

        notifications.show({
          title: `Error (${status})`,
          message: errorMessage,
          color: 'red',
        });
      }
    } else {
      notifications.show({
        title: 'Error de red',
        message: 'No se pudo conectar con el servidor.',
        color: 'red',
      });
    }
    return Promise.reject(error);
  },
);

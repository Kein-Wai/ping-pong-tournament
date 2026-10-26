import type { AxiosRequestConfig } from 'axios';
import { api } from './axios';
import type { ApiEnvelope } from '../types/api';

/**
 * Adaptador HTTP del cliente.
 *
 * La API responde siempre con el sobre { success, data, error, details }. Este
 * modulo es el UNICO sitio que conoce esa forma: la desenvuelve y devuelve
 * `data` directamente. Asi las paginas no tienen que escribir
 * `response.data.data` en las 110 llamadas, y cambiar el contrato de la API
 * no obliga a tocar 30 ficheros.
 *
 * El interceptor de axios sigue siendo el responsable de notificar al usuario
 * (toast verde en mutaciones correctas, rojo en errores), asi que este
 * adaptador no duplica esa responsabilidad.
 */

/** Extrae `data` del sobre de la API. */
const unwrap = <T>(body: ApiEnvelope<T> | T): T => {
  if (body && typeof body === 'object' && 'success' in (body as object)) {
    return (body as ApiEnvelope<T>).data as T;
  }

  // Algunos endpoints (204, redirecciones) no devuelven sobre.
  return body as T;
};

export const http = {
  get: async <T>(url: string, config?: AxiosRequestConfig): Promise<T> => {
    const response = await api.get<ApiEnvelope<T> | T>(url, config);
    return unwrap(response.data);
  },

  post: async <T>(
    url: string,
    data?: unknown,
    config?: AxiosRequestConfig,
  ): Promise<T> => {
    const response = await api.post<ApiEnvelope<T> | T>(url, data, config);
    return unwrap(response.data);
  },

  put: async <T>(
    url: string,
    data?: unknown,
    config?: AxiosRequestConfig,
  ): Promise<T> => {
    const response = await api.put<ApiEnvelope<T> | T>(url, data, config);
    return unwrap(response.data);
  },

  patch: async <T>(
    url: string,
    data?: unknown,
    config?: AxiosRequestConfig,
  ): Promise<T> => {
    const response = await api.patch<ApiEnvelope<T> | T>(url, data, config);
    return unwrap(response.data);
  },

  delete: async <T>(url: string, config?: AxiosRequestConfig): Promise<T> => {
    const response = await api.delete<ApiEnvelope<T> | T>(url, config);
    return unwrap(response.data);
  },
};

export default http;

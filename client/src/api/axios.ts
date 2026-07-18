import axios from 'axios';

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
  (error) => {
    return Promise.reject(error);
  },
);

api.interceptors.response.use(
  (response) => {
    return response;
  },
  (error) => {
    // Si el servidor nos dice que el token es inválido o caducó (Error 401)
    if (error.response && error.response.status === 401) {
      console.warn('Sesión caducada. Redirigiendo al Login...');
      localStorage.removeItem('token'); // Borramos el token falso/caducado
      window.location.href = '/login'; // Expulsamos al usuario a la fuerza
    }
    return Promise.reject(error);
  },
);

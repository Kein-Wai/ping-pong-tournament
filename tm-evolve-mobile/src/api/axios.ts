// src/api/axios.ts
import axios from "axios";
import AsyncStorage from "@react-native-async-storage/async-storage";

// Expo inyecta automáticamente las variables que empiezan por EXPO_PUBLIC_
const API_URL = process.env.EXPO_PUBLIC_API_URL;

export const api = axios.create({
  baseURL: API_URL,
  headers: {
    "Content-Type": "application/json",
  },
});

// Interceptor para inyectar el token en cada petición (si existe)
api.interceptors.request.use(
  async (config) => {
    const token = await AsyncStorage.getItem("pingpong_token");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error),
);

// El token de acceso dura una hora: ante un 401 se renueva con el refresh token y se repite la petición.
const REFRESH_TOKEN_KEY = "pingpong_refresh_token";
const AUTH_URLS = ["/auth/login", "/auth/google", "/auth/refresh", "/auth/logout"];

// Las peticiones que reciben un 401 a la vez comparten una sola renovación: el refresh token rota en
// cada uso y un segundo canje con el mismo valor revocaría la sesión.
let inFlight: Promise<string | null> | null = null;

const renew = async (): Promise<string | null> => {
  const refreshToken = await AsyncStorage.getItem(REFRESH_TOKEN_KEY);
  if (!refreshToken) return null;

  try {
    // axios a pelo: pasar por `api` dispararía de nuevo este interceptor.
    const response = await axios.post(`${API_URL}/auth/refresh`, { refreshToken });
    await AsyncStorage.setItem("pingpong_token", response.data.token);
    await AsyncStorage.setItem(REFRESH_TOKEN_KEY, response.data.refreshToken);
    return response.data.token;
  } catch (error) {
    // Solo una respuesta del servidor invalida la sesión: sin red se conserva para reintentar luego.
    if (axios.isAxiosError(error) && error.response) {
      await AsyncStorage.removeItem(REFRESH_TOKEN_KEY);
      return null;
    }
    throw error;
  }
};

const refreshSession = (): Promise<string | null> => {
  inFlight ??= renew().finally(() => {
    inFlight = null;
  });
  return inFlight;
};

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const config = error.response?.config;
    if (
      error.response?.status !== 401 ||
      !config ||
      config._retried ||
      AUTH_URLS.some((url) => config.url?.includes(url))
    ) {
      return Promise.reject(error);
    }

    try {
      const token = await refreshSession();
      if (!token) return Promise.reject(error);
      config._retried = true;
      config.headers.Authorization = `Bearer ${token}`;
      return api.request(config);
    } catch {
      return Promise.reject(error);
    }
  },
);

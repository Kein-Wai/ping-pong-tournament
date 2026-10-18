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

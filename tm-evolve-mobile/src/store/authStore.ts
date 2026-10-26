// src/store/authStore.ts
import { create } from "zustand";
import { api } from "../api/axios";
import AsyncStorage from "@react-native-async-storage/async-storage";

export interface User {
  id: string;
  email: string;
  name: string;
  surname?: string;
  role: string;
  clubId?: string | null;
  dominantHand?: string | null;
  playstyle?: string | null;
  rubberForehand?: string | null;
  rubberBackhand?: string | null;
  avatarUrl?: string | null;
  level?: string | null;

  // Añadimos Stats y Skills como opcionales
  stats?: any[] | any;
  skills?: any[] | any;
}

interface AuthState {
  token: string | null;
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (token: string, refreshToken: string) => Promise<void>;
  logout: () => Promise<void>;
  fetchProfile: () => Promise<void>;
  initAuth: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  token: null,
  user: null,
  isAuthenticated: false,
  isLoading: true,

  login: async (token: string, refreshToken: string) => {
    await AsyncStorage.setItem("pingpong_token", token);
    await AsyncStorage.setItem("pingpong_refresh_token", refreshToken);
    set({ token, isAuthenticated: true });
    await get().fetchProfile();
  },

  logout: async () => {
    const refreshToken = await AsyncStorage.getItem("pingpong_refresh_token");
    await AsyncStorage.removeItem("pingpong_token");
    await AsyncStorage.removeItem("pingpong_refresh_token");
    // Revocar en el servidor es best-effort: la sesión local se cierra aunque no haya red.
    if (refreshToken) api.post("/auth/logout", { refreshToken }).catch(() => undefined);
    set({ token: null, user: null, isAuthenticated: false });
  },

  fetchProfile: async () => {
    try {
      const response = await api.get("/users/me");
      const fullUser = response.data.data;

      set({
        user: { ...fullUser, role: fullUser.userType?.name || "Player" },
        isAuthenticated: true,
      });
    } catch (error) {
      console.error("Error obteniendo perfil:", error);
      await get().logout();
    }
  },

  initAuth: async () => {
    try {
      const storedToken = await AsyncStorage.getItem("pingpong_token");
      if (storedToken) {
        set({ token: storedToken, isAuthenticated: true });
        await get().fetchProfile();
      }
    } catch (e) {
      console.error("Error inicializando auth", e);
    } finally {
      set({ isLoading: false });
    }
  },
}));

import { create } from 'zustand';
import { api } from '../api/axios'; // Ajusta el import según tu estructura
import { ENDPOINTS } from '../api/endpoints'; // Ajusta el import

// Interfaz completa del usuario en el cliente
export interface User {
  id: string;
  email: string;
  name: string;
  surname?: string;
  nickname?: string;
  avatarUrl?: string;
  role: string;
  clubId?: string | null;
  clubStatus?: string | null;
  dominantHand?: string | null;
  playstyle?: string | null;
  rubberForehand?: string | null;
  rubberBackhand?: string | null;
  birthDate?: string | null;
  forcePasswordChange?: boolean;
}

interface AuthState {
  token: string | null;
  user: User | null;
  isAuthenticated: boolean;
  login: (token: string, userData?: User) => void;
  logout: () => void;
  updateUserFields: (fields: Partial<User>) => void;
  fetchProfile: () => Promise<void>; // 👈 NUEVA FUNCIÓN
}

export const useAuthStore = create<AuthState>((set, get) => ({
  token: localStorage.getItem('pingpong_token') || null,
  user: null, // Ya no leemos el usuario estático de localStorage
  isAuthenticated: !!localStorage.getItem('pingpong_token'),

  login: (token, userData) => {
    localStorage.setItem('pingpong_token', token);
    set({ token, isAuthenticated: true });
    // Si pasamos userData (ej: desde un registro), lo guardamos. Si no, confiaremos en fetchProfile
    if (userData) set({ user: userData });
  },

  logout: () => {
    localStorage.removeItem('pingpong_token');
    set({ token: null, user: null, isAuthenticated: false });
  },

  updateUserFields: (fields) =>
    set((state) => ({
      user: state.user ? { ...state.user, ...fields } : null,
    })),

  // Función mágica que llama al backend para traer el perfil fresco
  fetchProfile: async () => {
    const token = get().token;
    if (!token) return;

    try {
      const response = await api.get(ENDPOINTS.USERS.ME);
      const fullUser = response.data.data;

      // Mapeamos el rol desde la relación para que el frontend no se rompa
      const userToStore: User = {
        ...fullUser,
        role: fullUser.userType?.name || 'Player',
      };

      set({ user: userToStore, isAuthenticated: true });
    } catch (error) {
      console.error('Error fetching profile, clearing auth...', error);
      get().logout();
    }
  },
}));

import { create } from 'zustand';
import { usersService } from '../api/services/users';
import { authService } from '../api/services/auth';
import { ACCESS_TOKEN_KEY, REFRESH_TOKEN_KEY } from '../api/session';

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
  /** Cómo inicia sesión el usuario: solo las cuentas `LOCAL` pueden cambiar la contraseña. */
  authProvider?: string;
}

interface AuthState {
  token: string | null;
  user: User | null;
  isAuthenticated: boolean;
  login: (token: string, userData?: User, refreshToken?: string) => void;
  logout: () => void;
  updateUserFields: (fields: Partial<User>) => void;
  fetchProfile: () => Promise<void>; // 👈 NUEVA FUNCIÓN
}

export const useAuthStore = create<AuthState>((set, get) => ({
  token: localStorage.getItem(ACCESS_TOKEN_KEY) || null,
  user: null, // Ya no leemos el usuario estático de localStorage
  isAuthenticated: !!localStorage.getItem(ACCESS_TOKEN_KEY),

  login: (token, userData, refreshToken) => {
    localStorage.setItem(ACCESS_TOKEN_KEY, token);
    if (refreshToken) localStorage.setItem(REFRESH_TOKEN_KEY, refreshToken);
    set({ token, isAuthenticated: true });
    // Si pasamos userData (ej: desde un registro), lo guardamos. Si no, confiaremos en fetchProfile
    if (userData) set({ user: userData });
  },

  logout: () => {
    const refreshToken = localStorage.getItem(REFRESH_TOKEN_KEY);
    localStorage.removeItem(ACCESS_TOKEN_KEY);
    localStorage.removeItem(REFRESH_TOKEN_KEY);
    // Revocar en el servidor es best-effort: la sesión local se cierra aunque no haya red.
    if (refreshToken) authService.logout(refreshToken).catch(() => undefined);
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
      // El perfil llega con la relación userType, que el tipo de dominio no declara.
      const fullUser = (await usersService.me()) as unknown as User & {
        userType?: { name?: string };
      };

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

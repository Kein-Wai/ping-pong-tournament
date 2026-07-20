import { create } from 'zustand';

export interface User {
  id: string;
  email: string;
  name: string;
  surname: string;
  nickname: string;
  role: string;
  clubId: string | null;
  clubStatus: 'Registrado' | 'Pendiente' | 'Aprobado' | 'Rechazado' | null;
}

interface AuthState {
  token: string | null;
  user: User | null;
  isAuthenticated: boolean;
  login: (token: string, user: User) => void;
  updateUserFields: (fields: Partial<Pick<User, 'clubId' | 'clubStatus'>>) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  token: localStorage.getItem('pingpong_token'),
  user: JSON.parse(localStorage.getItem('pingpong_user') || 'null'),
  isAuthenticated: !!localStorage.getItem('pingpong_token'),

  login: (token, user) => {
    localStorage.setItem('pingpong_token', token);
    localStorage.setItem('pingpong_user', JSON.stringify(user));
    set({ token, user, isAuthenticated: true });
  },

  updateUserFields: (fields) => {
    set((state) => {
      if (!state.user) return state;
      const updatedUser = { ...state.user, ...fields };
      localStorage.setItem('pingpong_user', JSON.stringify(updatedUser));
      return { user: updatedUser };
    });
  },

  logout: () => {
    localStorage.removeItem('pingpong_token');
    localStorage.removeItem('pingpong_user');
    set({ token: null, user: null, isAuthenticated: false });
  },
}));

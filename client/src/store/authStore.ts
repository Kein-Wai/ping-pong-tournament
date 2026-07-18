import { create } from 'zustand';

interface User {
  id: string;
  email: string;
  name: string;
  role: string;
}

interface AuthState {
  token: string | null;
  user: User | null;
  isAuthenticated: boolean;
  login: (token: string, user: User) => void;
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

  logout: () => {
    localStorage.removeItem('pingpong_token');
    localStorage.removeItem('pingpong_user');
    set({ token: null, user: null, isAuthenticated: false });
  },
}));

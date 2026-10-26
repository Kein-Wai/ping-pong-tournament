import { describe, it, expect, vi, beforeEach } from 'vitest';
import { api } from '../api/axios';
import { ENDPOINTS } from '../api/endpoints';
import { useAuthStore } from './authStore';

// Se mockea el `api` de bajo nivel (la frontera del sistema) y no los servicios,
// para que estos tests sigan valiendo cuando el acceso a datos migre a servicios.
vi.mock('../api/axios', () => ({
  api: {
    get: vi.fn(),
    post: vi.fn(),
  },
}));

const envelope = <T,>(data: T) => ({ data: { success: true, data } });

const USER = { id: 'u1', email: 'ana@test.com', name: 'Ana', clubId: 'club-1' };

const signedIn = () => useAuthStore.setState({ token: 'tok', user: null, isAuthenticated: true });

describe('useAuthStore', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    useAuthStore.setState({ token: null, user: null, isAuthenticated: false });
  });

  describe('login / logout', () => {
    it('login guarda el token en localStorage y marca la sesión', () => {
      useAuthStore.getState().login('tok-1');

      expect(localStorage.getItem('pingpong_token')).toBe('tok-1');
      expect(useAuthStore.getState()).toMatchObject({
        token: 'tok-1',
        isAuthenticated: true,
        user: null,
      });
    });

    it('login guarda también el refresh token cuando llega', () => {
      useAuthStore.getState().login('tok-1', undefined, 'refresh-1');

      expect(localStorage.getItem('pingpong_refresh_token')).toBe('refresh-1');
    });

    it('login con datos de usuario los guarda', () => {
      useAuthStore.getState().login('tok-1', { ...USER, role: 'Player' });

      expect(useAuthStore.getState().user?.name).toBe('Ana');
    });

    it('logout revoca el refresh token en el servidor y borra la copia local', () => {
      vi.mocked(api.post).mockResolvedValue({ data: { message: 'Sesión cerrada' } });
      useAuthStore.getState().login('tok-1', { ...USER, role: 'Player' }, 'refresh-1');

      useAuthStore.getState().logout();

      expect(api.post).toHaveBeenCalledWith(
        ENDPOINTS.AUTH.LOGOUT,
        { refreshToken: 'refresh-1' },
        undefined,
      );
      expect(localStorage.getItem('pingpong_refresh_token')).toBeNull();
    });

    it('logout cierra la sesión local aunque la revocación falle', async () => {
      vi.mocked(api.post).mockRejectedValue(new Error('Network Error'));
      useAuthStore.getState().login('tok-1', { ...USER, role: 'Player' }, 'refresh-1');

      useAuthStore.getState().logout();
      await Promise.resolve();

      expect(useAuthStore.getState().isAuthenticated).toBe(false);
    });

    it('logout sin refresh token no llama a la API', () => {
      useAuthStore.getState().login('tok-1');

      useAuthStore.getState().logout();

      expect(api.post).not.toHaveBeenCalled();
    });

    it('logout borra el token y la sesión', () => {
      useAuthStore.getState().login('tok-1', { ...USER, role: 'Player' });

      useAuthStore.getState().logout();

      expect(localStorage.getItem('pingpong_token')).toBeNull();
      expect(useAuthStore.getState()).toMatchObject({
        token: null,
        user: null,
        isAuthenticated: false,
      });
    });
  });

  describe('updateUserFields', () => {
    it('mezcla los campos con el usuario actual', () => {
      useAuthStore.getState().login('tok-1', { ...USER, role: 'Player' });

      useAuthStore.getState().updateUserFields({ clubId: 'club-2' });

      expect(useAuthStore.getState().user).toMatchObject({ name: 'Ana', clubId: 'club-2' });
    });

    it('sin usuario no hace nada', () => {
      useAuthStore.getState().updateUserFields({ clubId: 'club-2' });

      expect(useAuthStore.getState().user).toBeNull();
    });
  });

  describe('fetchProfile', () => {
    it('sin token no llama a la API', async () => {
      await useAuthStore.getState().fetchProfile();

      expect(api.get).not.toHaveBeenCalled();
    });

    it('pide el perfil propio y guarda el usuario con el rol de su tipo', async () => {
      signedIn();
      vi.mocked(api.get).mockResolvedValue(
        envelope({ ...USER, userType: { name: 'AdminClub' } }) as never,
      );

      await useAuthStore.getState().fetchProfile();

      expect(api.get).toHaveBeenCalledWith(ENDPOINTS.USERS.ME, undefined);
      expect(useAuthStore.getState().user).toMatchObject({ id: 'u1', role: 'AdminClub' });
      expect(useAuthStore.getState().isAuthenticated).toBe(true);
    });

    it('sin tipo de usuario el rol por defecto es Player', async () => {
      signedIn();
      vi.mocked(api.get).mockResolvedValue(envelope(USER) as never);

      await useAuthStore.getState().fetchProfile();

      expect(useAuthStore.getState().user?.role).toBe('Player');
    });

    it('si la petición falla, cierra la sesión', async () => {
      vi.spyOn(console, 'error').mockImplementation(() => undefined);
      signedIn();
      localStorage.setItem('pingpong_token', 'tok');
      vi.mocked(api.get).mockRejectedValue(new Error('401'));

      await useAuthStore.getState().fetchProfile();

      expect(useAuthStore.getState()).toMatchObject({
        token: null,
        user: null,
        isAuthenticated: false,
      });
      expect(localStorage.getItem('pingpong_token')).toBeNull();
    });
  });
});

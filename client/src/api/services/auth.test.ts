import { describe, it, expect, vi, beforeEach } from 'vitest';
import { api } from '../axios';
import { ENDPOINTS } from '../endpoints';
import { authService } from './auth';

// Se mockea el `api` de bajo nivel (la frontera del sistema): el servicio y el
// adaptador http se prueban de verdad. Los contratos salen de api/src/routes/auth.ts
// y api/src/schemas/user.ts.
vi.mock('../axios', () => ({
  api: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    patch: vi.fn(),
    delete: vi.fn(),
  },
}));

const mockedApi = vi.mocked(api);

describe('authService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('login', () => {
    it('envía las credenciales por POST y devuelve la sesión que viene en data', async () => {
      mockedApi.post.mockResolvedValue({
        data: { success: true, message: 'Login local exitoso', data: { token: 'jwt-1', refreshToken: 'r-1' } },
      });

      const result = await authService.login({ email: 'ana@test.com', password: 'Abcdef1@' });

      expect(mockedApi.post).toHaveBeenCalledWith(
        ENDPOINTS.AUTH.LOGIN,
        { email: 'ana@test.com', password: 'Abcdef1@' },
        undefined,
      );
      expect(result).toEqual({ token: 'jwt-1', refreshToken: 'r-1' });
    });

    it('propaga el error de credenciales incorrectas', async () => {
      mockedApi.post.mockRejectedValue(new Error('401'));

      await expect(authService.login({ email: 'a@a.com', password: 'x' })).rejects.toThrow('401');
    });
  });

  describe('logout', () => {
    it('envía el refresh token a revocar por POST', async () => {
      mockedApi.post.mockResolvedValue({ data: { success: true, message: 'Sesión cerrada' } });

      const result = await authService.logout('refresh-1');

      expect(mockedApi.post).toHaveBeenCalledWith(
        ENDPOINTS.AUTH.LOGOUT,
        { refreshToken: 'refresh-1' },
        undefined,
      );
      expect(result).toBeUndefined();
    });
  });

  describe('register', () => {
    it('envía el registro tal cual lo manda la pantalla y no devuelve datos', async () => {
      mockedApi.post.mockResolvedValue({ data: { success: true, message: 'Jugador registrado con éxito' } });
      const payload = {
        email: 'ana@test.com',
        password: 'Abcdef1@',
        confirmPassword: 'Abcdef1@',
        name: 'Ana',
        surname: 'Gil',
        secondSurname: null,
        role: 'AdminClub' as const,
      };

      const result = await authService.register(payload);

      expect(mockedApi.post).toHaveBeenCalledWith(ENDPOINTS.AUTH.REGISTER, payload, undefined);
      expect(result).toBeUndefined();
    });
  });

  describe('loginWithGoogle', () => {
    it('envía la credencial y el rol elegido', async () => {
      mockedApi.post.mockResolvedValue({
        data: { success: true, data: { token: 'jwt-2', refreshToken: 'r-2' } },
      });

      const result = await authService.loginWithGoogle('google-token', 'AdminClub');

      expect(mockedApi.post).toHaveBeenCalledWith(
        ENDPOINTS.AUTH.GOOGLE,
        { credential: 'google-token', role: 'AdminClub' },
        undefined,
      );
      expect(result.token).toBe('jwt-2');
    });

    it('usa el rol Player cuando no se indica', async () => {
      mockedApi.post.mockResolvedValue({ data: { success: true, data: { token: 'jwt-3' } } });

      await authService.loginWithGoogle('google-token');

      expect(mockedApi.post).toHaveBeenCalledWith(
        ENDPOINTS.AUTH.GOOGLE,
        { credential: 'google-token', role: 'Player' },
        undefined,
      );
    });
  });

  describe('forgotPassword', () => {
    it('solicita la recuperación con el email y devuelve el mensaje genérico', async () => {
      mockedApi.post.mockResolvedValue({
        data: { success: true, message: 'Si el correo existe, se han enviado las instrucciones.' },
      });

      const result = await authService.forgotPassword('ana@test.com');

      expect(mockedApi.post).toHaveBeenCalledWith(
        ENDPOINTS.AUTH.FORGOT_PASSWORD,
        { email: 'ana@test.com' },
        undefined,
      );
      expect(result).toBeUndefined();
    });
  });

  describe('resetPassword', () => {
    it('envía el token, la contraseña nueva y su confirmación', async () => {
      mockedApi.post.mockResolvedValue({
        data: { success: true, message: 'Contraseña actualizada con éxito.' },
      });

      const result = await authService.resetPassword('tok-1', 'Abcdef1@', 'Abcdef1@');

      expect(mockedApi.post).toHaveBeenCalledWith(
        ENDPOINTS.AUTH.RESET_PASSWORD,
        { token: 'tok-1', newPassword: 'Abcdef1@', confirmPassword: 'Abcdef1@' },
        undefined,
      );
      expect(result).toBeUndefined();
    });
  });
});

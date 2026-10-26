import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { notifications } from '@mantine/notifications';
import { api, setUnauthorizedHandler } from './axios';
import { resetErrorNotifier } from './notify';
import { refreshSession } from './session';

vi.mock('@mantine/notifications', () => ({
  notifications: { show: vi.fn() },
}));

/**
 * El interceptor decide que se le muestra al usuario cuando una mutacion
 * falla. Estos tests comprueban que nunca se rompe y que el mensaje de
 * validacion de Zod llega intacto.
 */
vi.mock('./session', () => ({ refreshSession: vi.fn().mockResolvedValue(null) }));

describe('Interceptor de errores (client/src/api/axios.ts)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resetErrorNotifier();
  });

  /** Dispara el interceptor de error y absorbe el rechazo que devuelve. */
  const rejectWith = async (status: number, data: unknown, method = 'post') => {
    const error = {
      isAxiosError: true,
      response: { status, data, config: { method, url: '/users' } },
    };
    const handler = api.interceptors.response.handlers?.[0]?.rejected;
    if (!handler) throw new Error('El interceptor de respuesta no tiene manejador de error.');
    await Promise.resolve(handler(error as never)).catch(() => undefined);
  };

  it('muestra el mensaje de error que devuelve la API', async () => {
    await rejectWith(400, { success: false, error: 'Datos inválidos' });

    expect(notifications.show).toHaveBeenCalledWith(
      expect.objectContaining({ color: 'red', message: 'Datos inválidos' }),
    );
  });

  it('muestra el detalle de validacion de Zod sin romperse', async () => {
    await rejectWith(400, {
      success: false,
      error: 'Datos invalidos',
      details: { formErrors: [], fieldErrors: { email: ['Invalid email address'] } },
    });

    expect(notifications.show).toHaveBeenCalledWith(
      expect.objectContaining({ message: 'email: Invalid email address' }),
    );
  });

  it('no revienta con un cuerpo de error inesperado', async () => {
    await rejectWith(500, { success: false });

    expect(notifications.show).toHaveBeenCalledWith(
      expect.objectContaining({ message: 'Ocurrió un error inesperado.' }),
    );
  });

  it('notifica tambien los errores de una peticion GET', async () => {
    await rejectWith(500, { success: false, error: 'Error al cargar' }, 'get');

    expect(notifications.show).toHaveBeenCalledWith(
      expect.objectContaining({ color: 'red', message: 'Error al cargar' }),
    );
  });

  it('no repite el toast cuando varias peticiones fallan con el mismo motivo', async () => {
    await rejectWith(500, { success: false, error: 'Error al cargar' }, 'get');
    await rejectWith(500, { success: false, error: 'Error al cargar' }, 'get');

    const calls = vi
      .mocked(notifications.show)
      .mock.calls.filter(([payload]) => payload?.message === 'Error al cargar');

    expect(calls).toHaveLength(1);
  });

  it('propaga el error original tras notificar', async () => {
    const error = {
      isAxiosError: true,
      response: { status: 400, data: { error: 'x' }, config: { method: 'post', url: '/users' } },
    };
    // @ts-expect-error -- se simula el error de axios
    await expect(api.interceptors.response.handlers[0].rejected(error)).rejects.toBe(error);
  });

  describe('sesión caducada (401)', () => {
    const onUnauthorized = vi.fn();

    beforeEach(() => {
      setUnauthorizedHandler(onUnauthorized);
      vi.stubGlobal('location', { href: '/torneos' });
      vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    });

    afterEach(() => {
      setUnauthorizedHandler(null);
      vi.unstubAllGlobals();
      vi.restoreAllMocks();
    });

    const rejectUnauthorized = async (url: string) => {
      const error = {
        isAxiosError: true,
        response: { status: 401, data: {}, config: { method: 'get', url } },
      };
      // @ts-expect-error -- se simula el error de axios
      await expect(api.interceptors.response.handlers[0].rejected(error)).rejects.toBe(error);
    };

    it('avisa al manejador registrado, redirige al login y no muestra toast', async () => {
      await rejectUnauthorized('/users/me');

      expect(onUnauthorized).toHaveBeenCalledTimes(1);
      expect(window.location.href).toBe('/login');
      expect(notifications.show).not.toHaveBeenCalled();
    });

    it('redirige al login aunque no haya manejador registrado', async () => {
      setUnauthorizedHandler(null);

      await rejectUnauthorized('/users/me');

      expect(window.location.href).toBe('/login');
    });

    describe('renovación de la sesión', () => {
      const unauthorized = (config: Record<string, unknown> = {}) => ({
        isAxiosError: true,
        response: { status: 401, data: {}, config: { method: 'get', url: '/users/me', ...config } },
      });
      const handle = (error: unknown) =>
        // @ts-expect-error -- se simula el error de axios
        api.interceptors.response.handlers[0].rejected(error);

      it('renueva el token y repite la petición original con el token nuevo', async () => {
        vi.mocked(refreshSession).mockResolvedValueOnce('acceso-nuevo');
        const retried = { data: { ok: true } };
        const request = vi.spyOn(api, 'request').mockResolvedValue(retried);

        const result = await handle(unauthorized({ headers: {} }));

        expect(result).toBe(retried);
        expect(request).toHaveBeenCalledWith(
          expect.objectContaining({
            url: '/users/me',
            headers: expect.objectContaining({ Authorization: 'Bearer acceso-nuevo' }),
          }),
        );
        expect(onUnauthorized).not.toHaveBeenCalled();
        expect(window.location.href).toBe('/torneos');
      });

      it('no entra en bucle: una petición ya repetida que vuelve a dar 401 cierra la sesión', async () => {
        const error = unauthorized({ _retried: true });

        await expect(handle(error)).rejects.toBe(error);

        expect(refreshSession).not.toHaveBeenCalled();
        expect(onUnauthorized).toHaveBeenCalledTimes(1);
      });

      it('si la sesión no se puede renovar, cierra la sesión y redirige', async () => {
        vi.mocked(refreshSession).mockResolvedValueOnce(null);
        const error = unauthorized();

        await expect(handle(error)).rejects.toBe(error);

        expect(onUnauthorized).toHaveBeenCalledTimes(1);
        expect(window.location.href).toBe('/login');
      });

      it('sin red al renovar rechaza el error sin cerrar la sesión', async () => {
        vi.mocked(refreshSession).mockRejectedValueOnce(new Error('Network Error'));
        const error = unauthorized();

        await expect(handle(error)).rejects.toBe(error);

        expect(onUnauthorized).not.toHaveBeenCalled();
        expect(window.location.href).toBe('/torneos');
      });
    });

    it.each(['/auth/login', '/auth/google', '/auth/refresh', '/auth/logout'])(
      'un 401 de %s no cierra la sesión ni redirige',
      async (url) => {
        await rejectUnauthorized(url);

        expect(onUnauthorized).not.toHaveBeenCalled();
        expect(window.location.href).toBe('/torneos');
      },
    );
  });
});

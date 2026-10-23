import { describe, it, expect, vi, beforeEach } from 'vitest';
import { notifications } from '@mantine/notifications';
import { api } from './axios';
import { resetErrorNotifier } from './notify';

vi.mock('@mantine/notifications', () => ({
  notifications: { show: vi.fn() },
}));

/**
 * El interceptor decide que se le muestra al usuario cuando una mutacion
 * falla. Estos tests comprueban que nunca se rompe y que el mensaje de
 * validacion de Zod llega intacto.
 */
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
});

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { notifications } from '@mantine/notifications';
import { api } from '../api/axios';
import { ENDPOINTS } from '../api/endpoints';
import type { PlayerListItem } from '../types/players';
import { useJugadorResetCuenta } from './useJugadorResetCuenta';

// Se mockea el `api` de bajo nivel (la frontera del sistema) y no los servicios,
// para que estos tests sigan valiendo cuando el acceso a datos cambie de capa.
vi.mock('../api/axios', () => ({
  api: {
    put: vi.fn(),
    post: vi.fn(),
  },
}));

const envelope = <T,>(data: T) => ({ data: { success: true, data } });

const LUIS: PlayerListItem = {
  id: 'p1',
  email: 'luis@test.com',
  name: 'Luis',
  clubStatus: 'Aprobado',
};
const GUS: PlayerListItem = { ...LUIS, id: 'p5', email: 'gus@guest.pingpong', name: 'Gus' };

describe('useJugadorResetCuenta', () => {
  const refetch = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(api.put).mockResolvedValue(envelope({}) as never);
    vi.mocked(api.post).mockResolvedValue(envelope({}) as never);
    vi.spyOn(notifications, 'show').mockImplementation(() => 'id');
  });

  it('empieza cerrado, sin jugador ni correo', () => {
    const { result } = renderHook(() => useJugadorResetCuenta({ refetch }));

    expect(result.current.resetAccountModal).toEqual({ opened: false, player: null });
    expect(result.current.recoveryEmail).toBe('');
  });

  it('abrir con un jugador de correo real propone ese correo', () => {
    const { result } = renderHook(() => useJugadorResetCuenta({ refetch }));

    act(() => result.current.handleOpenResetAccount(LUIS));

    expect(result.current.resetAccountModal).toEqual({ opened: true, player: LUIS });
    expect(result.current.recoveryEmail).toBe('luis@test.com');
  });

  it('abrir con un invitado sin correo real deja el correo vacío', () => {
    const { result } = renderHook(() => useJugadorResetCuenta({ refetch }));

    act(() => result.current.handleOpenResetAccount(GUS));

    expect(result.current.recoveryEmail).toBe('');
  });

  it('con el correo sin cambiar solo envía el enlace, avisa y recarga', async () => {
    const { result } = renderHook(() => useJugadorResetCuenta({ refetch }));
    act(() => result.current.handleOpenResetAccount(LUIS));

    await act(async () => {
      await result.current.handleSendResetEmail();
    });

    expect(api.put).not.toHaveBeenCalled();
    expect(api.post).toHaveBeenCalledWith(
      ENDPOINTS.AUTH.FORGOT_PASSWORD,
      { email: 'luis@test.com' },
      undefined,
    );
    expect(notifications.show).toHaveBeenCalledWith(
      expect.objectContaining({
        title: 'Correo Enviado',
        message: 'Se ha enviado el enlace de recuperación a luis@test.com.',
        color: 'green',
      }),
    );
    expect(result.current.resetAccountModal).toEqual({ opened: false, player: null });
    expect(refetch).toHaveBeenCalledTimes(1);
  });

  it('con un correo nuevo lo guarda en la cuenta antes de enviar el enlace', async () => {
    const { result } = renderHook(() => useJugadorResetCuenta({ refetch }));
    act(() => result.current.handleOpenResetAccount(GUS));
    act(() => result.current.setRecoveryEmail('gus@real.com'));

    await act(async () => {
      await result.current.handleSendResetEmail();
    });

    expect(api.put).toHaveBeenCalledWith(
      ENDPOINTS.USERS.BY_ID('p5'),
      { email: 'gus@real.com' },
      undefined,
    );
    expect(api.post).toHaveBeenCalledWith(
      ENDPOINTS.AUTH.FORGOT_PASSWORD,
      { email: 'gus@real.com' },
      undefined,
    );
  });

  it('sin correo no envía nada', async () => {
    const { result } = renderHook(() => useJugadorResetCuenta({ refetch }));
    act(() => result.current.handleOpenResetAccount(GUS));

    await act(async () => {
      await result.current.handleSendResetEmail();
    });

    expect(api.put).not.toHaveBeenCalled();
    expect(api.post).not.toHaveBeenCalled();
  });

  it('si el envío falla deja el modal abierto, no avisa ni recarga y deja de enviar', async () => {
    vi.mocked(api.post).mockRejectedValue(new Error('rechazado'));
    const { result } = renderHook(() => useJugadorResetCuenta({ refetch }));
    act(() => result.current.handleOpenResetAccount(LUIS));

    await act(async () => {
      await result.current.handleSendResetEmail();
    });

    expect(result.current.resetAccountModal.opened).toBe(true);
    expect(result.current.sendingReset).toBe(false);
    expect(notifications.show).not.toHaveBeenCalled();
    expect(refetch).not.toHaveBeenCalled();
  });

  it('cerrar vacía el jugador', () => {
    const { result } = renderHook(() => useJugadorResetCuenta({ refetch }));
    act(() => result.current.handleOpenResetAccount(LUIS));

    act(() => result.current.closeResetAccount());

    expect(result.current.resetAccountModal).toEqual({ opened: false, player: null });
  });
});

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { api } from '../api/axios';
import { ENDPOINTS } from '../api/endpoints';
import type { PlayerListItem } from '../types/players';
import { useJugadorElo } from './useJugadorElo';

// Se mockea el `api` de bajo nivel (la frontera del sistema) y no los servicios,
// para que estos tests sigan valiendo cuando el acceso a datos cambie de capa.
vi.mock('../api/axios', () => ({
  api: {
    put: vi.fn(),
  },
}));

const envelope = <T,>(data: T) => ({ data: { success: true, data } });

const LUIS: PlayerListItem = {
  id: 'p1',
  email: 'luis@test.com',
  name: 'Luis',
  clubStatus: 'Aprobado',
  stats: { elo: 1200, matchWon: 3, matchLost: 1, setWon: 9, setLost: 4 },
};
const MARTA: PlayerListItem = { ...LUIS, id: 'p2', name: 'Marta', stats: undefined };

describe('useJugadorElo', () => {
  const refetch = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(api.put).mockResolvedValue(envelope({}) as never);
  });

  it('empieza cerrado y sin jugador', () => {
    const { result } = renderHook(() => useJugadorElo({ refetch }));

    expect(result.current.editEloModal).toEqual({ opened: false, player: null });
  });

  it('abrir el modal propone el ELO actual del jugador', () => {
    const { result } = renderHook(() => useJugadorElo({ refetch }));

    act(() => result.current.openEditElo(LUIS));

    expect(result.current.editEloModal).toEqual({ opened: true, player: LUIS });
    expect(result.current.newElo).toBe(1200);
  });

  it('un jugador sin estadísticas propone 500', () => {
    const { result } = renderHook(() => useJugadorElo({ refetch }));

    act(() => result.current.openEditElo(MARTA));

    expect(result.current.newElo).toBe(500);
  });

  it('guardar envía el ELO como número, cierra el modal y recarga', async () => {
    const { result } = renderHook(() => useJugadorElo({ refetch }));
    act(() => result.current.openEditElo(LUIS));
    act(() => result.current.setNewElo('1300'));

    await act(async () => {
      await result.current.handleUpdateElo();
    });

    expect(api.put).toHaveBeenCalledWith(ENDPOINTS.USERS.BY_ID('p1'), { elo: 1300 }, undefined);
    expect(result.current.editEloModal).toEqual({ opened: false, player: null });
    expect(refetch).toHaveBeenCalledTimes(1);
  });

  it('sin jugador elegido no envía nada', async () => {
    const { result } = renderHook(() => useJugadorElo({ refetch }));

    await act(async () => {
      await result.current.handleUpdateElo();
    });

    expect(api.put).not.toHaveBeenCalled();
    expect(refetch).not.toHaveBeenCalled();
  });

  it('si el guardado falla deja el modal abierto y no recarga', async () => {
    vi.mocked(api.put).mockRejectedValue(new Error('rechazado'));
    const { result } = renderHook(() => useJugadorElo({ refetch }));
    act(() => result.current.openEditElo(LUIS));

    await act(async () => {
      await result.current.handleUpdateElo();
    });

    expect(result.current.editEloModal.opened).toBe(true);
    expect(refetch).not.toHaveBeenCalled();
  });

  it('cerrar vacía el jugador', () => {
    const { result } = renderHook(() => useJugadorElo({ refetch }));
    act(() => result.current.openEditElo(LUIS));

    act(() => result.current.closeEditElo());

    expect(result.current.editEloModal).toEqual({ opened: false, player: null });
  });
});

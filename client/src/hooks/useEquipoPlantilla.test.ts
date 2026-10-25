import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { api } from '../api/axios';
import { ENDPOINTS } from '../api/endpoints';
import type { ClubTeam } from '../types/api';
import { useEquipoPlantilla } from './useEquipoPlantilla';

// Se mockea el `api` de bajo nivel (la frontera del sistema).
vi.mock('../api/axios', () => ({
  api: {
    put: vi.fn(),
  },
}));

const TEAM = {
  id: 't1',
  name: 'Equipo A',
  players: [{ id: 'p1' }, { id: 'p2' }],
  matches: [],
} as unknown as ClubTeam;

const setup = () => {
  const refetch = vi.fn();
  const hook = renderHook(() => useEquipoPlantilla({ id: 't1', team: TEAM, refetch }));
  return { ...hook, refetch };
};

describe('useEquipoPlantilla', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(api.put).mockResolvedValue({ data: { success: true } } as never);
  });

  it('arranca con el modal cerrado y nadie marcado', () => {
    const { result } = setup();

    expect(result.current.rosterModalOpen).toBe(false);
    expect(result.current.checkedPlayers).toEqual([]);
    expect(result.current.saving).toBe(false);
  });

  it('handleOpenRoster marca a la plantilla actual y abre el modal', () => {
    const { result } = setup();

    act(() => {
      result.current.handleOpenRoster();
    });

    expect(result.current.rosterModalOpen).toBe(true);
    expect(result.current.checkedPlayers).toEqual(['p1', 'p2']);
  });

  it('handleSaveRoster envía los marcados, cierra el modal y recarga', async () => {
    const { result, refetch } = setup();
    act(() => {
      result.current.handleOpenRoster();
    });
    act(() => {
      result.current.setCheckedPlayers((prev) => prev.filter((id) => id !== 'p1'));
    });

    await act(async () => {
      await result.current.handleSaveRoster();
    });

    expect(api.put).toHaveBeenCalledWith(
      ENDPOINTS.TEAMS.UPDATE_PLAYERS('t1'),
      { playerIds: ['p2'] },
      undefined,
    );
    expect(result.current.rosterModalOpen).toBe(false);
    expect(result.current.saving).toBe(false);
    expect(refetch).toHaveBeenCalledTimes(1);
  });

  it('si el guardado falla el modal sigue abierto y no recarga', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
    vi.mocked(api.put).mockRejectedValue(new Error('400'));
    const { result, refetch } = setup();
    act(() => {
      result.current.handleOpenRoster();
    });

    await act(async () => {
      await result.current.handleSaveRoster();
    });

    expect(result.current.rosterModalOpen).toBe(true);
    expect(result.current.saving).toBe(false);
    expect(refetch).not.toHaveBeenCalled();
  });
});

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { api } from '../api/axios';
import { ENDPOINTS } from '../api/endpoints';
import { PROFILE_SKILL_KEYS } from '../constants/skills';
import type { PlayerProfile } from '../types/playerProfile';
import { useJugadorConsolidacion } from './useJugadorConsolidacion';

// Se mockea el `api` de bajo nivel (la frontera del sistema).
vi.mock('../api/axios', () => ({
  api: {
    put: vi.fn(),
  },
}));

const SKILLS = Object.fromEntries(PROFILE_SKILL_KEYS.map((s, i) => [s.key, 70 - i * 5]));
const NO_PENDING = Object.fromEntries(PROFILE_SKILL_KEYS.map((s) => [s.key, null]));

const PLAYER = {
  id: 'p1',
  name: 'Luis',
  skills: SKILLS,
  pendingSkills: { ...NO_PENDING, derechaPlano: 1.5, corte: 0.256 },
} as unknown as PlayerProfile;

const setup = (player: PlayerProfile | null = PLAYER) => {
  const refetch = vi.fn().mockResolvedValue(undefined);
  const hook = renderHook(() => useJugadorConsolidacion({ id: 'p1', player, refetch }));
  return { ...hook, refetch };
};

describe('useJugadorConsolidacion', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(api.put).mockResolvedValue({ data: { success: true } } as never);
  });

  it('arranca cerrado y sin mejoras aprobadas', () => {
    const { result } = setup();

    expect(result.current.consolidateModalOpened).toBe(false);
    expect(result.current.consolidating).toBe(false);
    expect(result.current.approvedGains).toEqual({});
  });

  it('handleOpenConsolidate propone las mejoras pendientes (0 donde no hay) y abre el modal', () => {
    const { result } = setup();

    act(() => {
      result.current.handleOpenConsolidate();
    });

    expect(result.current.consolidateModalOpened).toBe(true);
    expect(result.current.approvedGains).toMatchObject({ derechaPlano: 1.5, corte: 0.256, revesPlano: 0 });
    expect(Object.keys(result.current.approvedGains)).toHaveLength(12);
  });

  it('handleExecuteConsolidate suma las mejoras a la base con dos decimales, cierra y recarga', async () => {
    const { result, refetch } = setup();
    act(() => {
      result.current.handleOpenConsolidate();
    });
    act(() => {
      result.current.setApprovedGains({ ...result.current.approvedGains, servicio: 2 });
    });

    await act(async () => {
      await result.current.handleExecuteConsolidate();
    });

    expect(api.put).toHaveBeenCalledWith(
      ENDPOINTS.SKILLS.CONSOLIDATE('p1'),
      { ...SKILLS, derechaPlano: 71.5, corte: 50.26, servicio: 37 },
      undefined,
    );
    expect(result.current.consolidateModalOpened).toBe(false);
    expect(result.current.consolidating).toBe(false);
    expect(refetch).toHaveBeenCalledTimes(1);
  });

  it('si las habilidades llegan como lista usa el primer elemento', async () => {
    const { result } = setup({ ...PLAYER, skills: [SKILLS] } as unknown as PlayerProfile);
    act(() => {
      result.current.handleOpenConsolidate();
    });

    await act(async () => {
      await result.current.handleExecuteConsolidate();
    });

    expect(vi.mocked(api.put).mock.calls[0][1]).toMatchObject({ derechaPlano: 71.5 });
  });

  it('sin jugador no hace nada', async () => {
    const { result } = setup(null);

    await act(async () => {
      await result.current.handleExecuteConsolidate();
    });

    expect(api.put).not.toHaveBeenCalled();
  });

  it('si el guardado falla el modal sigue abierto y no recarga', async () => {
    vi.mocked(api.put).mockRejectedValue(new Error('500'));
    const { result, refetch } = setup();
    act(() => {
      result.current.handleOpenConsolidate();
    });

    await act(async () => {
      await result.current.handleExecuteConsolidate();
    });

    expect(result.current.consolidateModalOpened).toBe(true);
    expect(result.current.consolidating).toBe(false);
    expect(refetch).not.toHaveBeenCalled();
  });
});

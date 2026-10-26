import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { api } from '../api/axios';
import { ENDPOINTS } from '../api/endpoints';
import { useEquipoNuevoPartido } from './useEquipoNuevoPartido';

// Se mockea el `api` de bajo nivel (la frontera del sistema).
vi.mock('../api/axios', () => ({
  api: {
    post: vi.fn(),
  },
}));

const NOW = '2026-10-15T12:00:00.000Z';

const setup = () => {
  const refetch = vi.fn();
  const hook = renderHook(() => useEquipoNuevoPartido({ id: 't1', refetch }));
  return { ...hook, refetch };
};

describe('useEquipoNuevoPartido', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // La fecha por defecto es «ahora»: se congela solo Date.
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date(NOW));
    vi.mocked(api.post).mockResolvedValue({ data: { success: true } } as never);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('arranca con el modal cerrado, jugando en casa y con la fecha de hoy', () => {
    const { result } = setup();

    expect(result.current.matchModalOpen).toBe(false);
    expect(result.current.rivalName).toBe('');
    expect(result.current.matchDate?.toISOString()).toBe(NOW);
    expect(result.current.isHome).toBe(true);
    expect(result.current.location).toBe('');
    expect(result.current.saving).toBe(false);
  });

  it('handleSaveMatch envía el partido, cierra el modal y recarga', async () => {
    const { result, refetch } = setup();
    act(() => {
      result.current.setMatchModalOpen(true);
      result.current.setRivalName('CTM Visitante');
      result.current.setIsHome(false);
      result.current.setLocation('Pabellón Sur');
    });

    await act(async () => {
      await result.current.handleSaveMatch();
    });

    expect(api.post).toHaveBeenCalledWith(
      ENDPOINTS.TEAMS.MATCHES('t1'),
      { rivalName: 'CTM Visitante', date: NOW, isHome: false, location: 'Pabellón Sur' },
      undefined,
    );
    expect(result.current.matchModalOpen).toBe(false);
    expect(result.current.saving).toBe(false);
    expect(refetch).toHaveBeenCalledTimes(1);
  });

  it('sin fecha no guarda', async () => {
    const { result } = setup();
    act(() => {
      result.current.setMatchDate(null);
    });

    await act(async () => {
      await result.current.handleSaveMatch();
    });

    expect(api.post).not.toHaveBeenCalled();
  });

  it('si el guardado falla el modal sigue abierto y no recarga', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
    vi.mocked(api.post).mockRejectedValue(new Error('400'));
    const { result, refetch } = setup();
    act(() => {
      result.current.setMatchModalOpen(true);
    });

    await act(async () => {
      await result.current.handleSaveMatch();
    });

    expect(result.current.matchModalOpen).toBe(true);
    expect(result.current.saving).toBe(false);
    expect(refetch).not.toHaveBeenCalled();
  });
});

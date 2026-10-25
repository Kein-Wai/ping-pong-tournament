import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { api } from '../api/axios';
import type { Tournament } from '../types/tournament';
import { useTorneoFormato } from './useTorneoFormato';

vi.mock('../api/axios', () => ({
  api: {
    put: vi.fn(),
  },
}));

const mockTournament = (overrides: Partial<Tournament> = {}): Tournament =>
  ({
    id: 't1',
    name: 'Torneo Test',
    dateStart: '2025-01-01',
    numPlayers: 8,
    rounds: 'GruposKnockout',
    numGroup: 4,
    numGroupPlayers: 4,
    playersKnockout: 2,
    setsToWinGroup: 2,
    setsToWinKnockout: 3,
    ...overrides,
  } as Tournament);

describe('useTorneoFormato', () => {
  const onFormatSaved = vi.fn();
  const id = 't1';

  beforeEach(() => {
    vi.clearAllMocks();
    onFormatSaved.mockResolvedValue(undefined);
    // El adaptador http lee `response.data`: el mock debe devolver una respuesta.
    vi.mocked(api.put).mockResolvedValue({ data: { success: true } } as never);
  });

  it('inicializa valores por defecto', () => {
    const { result } = renderHook(() =>
      useTorneoFormato({ id, tournament: null, onFormatSaved }),
    );

    expect(result.current.editFormatOpened).toBe(false);
    expect(result.current.numGroup).toBe(4);
    expect(result.current.numGroupPlayers).toBe(4);
    expect(result.current.playersKnockout).toBe(2);
    expect(result.current.setsToWinGroup).toBe(2);
    expect(result.current.setsToWinKnockout).toBe(3);
  });

  it('openEditFormat inicializa desde tournament y abre modal', () => {
    const tournament = mockTournament({
      numGroup: 8,
      numGroupPlayers: 2,
      playersKnockout: 4,
      setsToWinGroup: 3,
      setsToWinKnockout: 5,
    });

    const { result } = renderHook(() =>
      useTorneoFormato({ id, tournament, onFormatSaved }),
    );

    act(() => {
      result.current.openEditFormat();
    });

    expect(result.current.numGroup).toBe(8);
    expect(result.current.numGroupPlayers).toBe(2);
    expect(result.current.playersKnockout).toBe(4);
    expect(result.current.setsToWinGroup).toBe(3);
    expect(result.current.setsToWinKnockout).toBe(5);
    expect(result.current.editFormatOpened).toBe(true);
  });

  it('saveFormat envia payload con numGroup cuando rounds !== Knockout', async () => {
    const tournament = mockTournament({ rounds: 'GruposKnockout' });

    const { result } = renderHook(() =>
      useTorneoFormato({ id, tournament, onFormatSaved }),
    );

    act(() => {
      result.current.setNumGroup(6);
      result.current.setNumGroupPlayers(3);
      result.current.setPlayersKnockout(2);
      result.current.setSetsToWinGroup(2);
      result.current.setSetsToWinKnockout(3);
    });

    await act(async () => {
      await result.current.saveFormat();
    });

    expect(api.put).toHaveBeenCalledWith('/tournaments/t1', {
      setsToWinGroup: 2,
      setsToWinKnockout: 3,
      numGroup: 6,
      numGroupPlayers: 3,
      playersKnockout: 2,
    }, undefined);
    expect(result.current.editFormatOpened).toBe(false);
    expect(onFormatSaved).toHaveBeenCalled();
  });

  it('saveFormat omite campos de grupos cuando rounds === Knockout', async () => {
    const tournament = mockTournament({ rounds: 'Knockout' });

    const { result } = renderHook(() =>
      useTorneoFormato({ id, tournament, onFormatSaved }),
    );

    await act(async () => {
      await result.current.saveFormat();
    });

    const callArgs = vi.mocked(api.put).mock.calls[0];
    expect(callArgs[0]).toBe('/tournaments/t1');
    expect(callArgs[1]).toEqual({
      setsToWinGroup: 2,
      setsToWinKnockout: 3,
    });
    expect(callArgs[2]).toBeUndefined();
  });

  it('saveFormat captura errores sin lanzar', async () => {
    vi.mocked(api.put).mockRejectedValueOnce(new Error('Network error'));

    const { result } = renderHook(() =>
      useTorneoFormato({ id, tournament: mockTournament(), onFormatSaved }),
    );

    await expect(result.current.saveFormat()).resolves.not.toThrow();
    expect(result.current.editFormatOpened).toBe(false);
  });
});

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { api } from '../api/axios';
import { openAppConfirmModal } from '../utils/modals';
import { useTorneoPartido } from './useTorneoPartido';
import type { AxiosResponse } from 'axios';
import type { Tournament, GroupMatch } from '../types/tournament';

vi.mock('../api/axios', () => ({
  api: { put: vi.fn() },
}));

vi.mock('../utils/modals', () => ({
  openAppConfirmModal: vi.fn(),
}));

const mockTournament = (overrides: Partial<Tournament> = {}): Tournament =>
  ({
    id: 't1',
    name: 'Torneo Test',
    dateStart: '2025-01-01',
    numPlayers: 8,
    rounds: 'GruposKnockout',
    setsToWinKnockout: 3,
    setsToWinGroup: 2,
    ...overrides,
  } as Tournament);

const mockMatch = {
  id: 'm1',
  status: 'Completado',
  isKnockout: true,
  setsToWin: 3,
  playerOne: { id: 'p1', name: 'A', surname: 'A1' },
  playerTwo: { id: 'p2', name: 'B', surname: 'B1' },
  playerOneId: 'p1',
  playerTwoId: 'p2',
  setOnePlayerOne: 1,
  setOnePlayerTwo: 0,
  setTwoPlayerOne: 1,
  setTwoPlayerTwo: 0,
  setThreePlayerOne: 0,
  setThreePlayerTwo: 0,
  setFourPlayerOne: null,
  setFourPlayerTwo: null,
  setFivePlayerOne: null,
  setFivePlayerTwo: null,
  setSixPlayerOne: null,
  setSixPlayerTwo: null,
  setSevenPlayerOne: null,
  setSevenPlayerTwo: null,
};

const groupMatchesSinCompletar = [{ status: 'Programado' }] as GroupMatch[];
const groupMatchesUltimoPendiente = [
  { status: 'Completado' },
  { status: 'Programado' },
] as GroupMatch[];

describe('useTorneoPartido', () => {
  const onMatchSaved = vi.fn();
  const id = 't1';

  beforeEach(() => {
    vi.clearAllMocks();
    onMatchSaved.mockResolvedValue(undefined);
    vi.mocked(api.put).mockResolvedValue({ data: { success: true } } as unknown as AxiosResponse);
  });

  it('executeSaveMatch hace api.put con payload correcto y refetch', async () => {
    const { result } = renderHook(() =>
      useTorneoPartido({
        id,
        tournament: mockTournament(),
        isAdmin: true,
        groupMatches: groupMatchesSinCompletar,
        onMatchSaved,
      }),
    );

    act(() => {
      result.current.openEditMatchModal(mockMatch, true);
    });

    await act(async () => {
      await result.current.executeSaveMatch();
    });

    expect(api.put).toHaveBeenCalledWith(`/matches/${mockMatch.id}`, {
      status: 'Completado',
      setsToWin: 3,
      playerOneId: 'p1',
      playerTwoId: 'p2',
      setOnePlayerOne: 1,
      setOnePlayerTwo: 0,
      setTwoPlayerOne: 1,
      setTwoPlayerTwo: 0,
      setThreePlayerOne: 0,
      setThreePlayerTwo: 0,
      setFourPlayerOne: 0,
      setFourPlayerTwo: 0,
      setFivePlayerOne: 0,
      setFivePlayerTwo: 0,
      setSixPlayerOne: 0,
      setSixPlayerTwo: 0,
      setSevenPlayerOne: 0,
      setSevenPlayerTwo: 0,
    }, undefined);

    expect(result.current.editMatch).toBeNull();
    expect(result.current.submittingMatch).toBe(false);
    expect(onMatchSaved).toHaveBeenCalled();
  });

  it('handleSaveMatch abre confirmacion para knockout completado', () => {
    const { result } = renderHook(() =>
      useTorneoPartido({
        id,
        tournament: mockTournament(),
        isAdmin: true,
        groupMatches: groupMatchesSinCompletar,
        onMatchSaved,
      }),
    );

    act(() => {
      result.current.openEditMatchModal(mockMatch, true);
    });

    act(() => {
      result.current.handleSaveMatch();
    });

    expect(openAppConfirmModal).toHaveBeenCalledTimes(1);
    expect(openAppConfirmModal).toHaveBeenCalledWith(
      expect.objectContaining({
        title: 'Confirmar Resultado Definitivo',
        confirmLabel: 'Sí, Guardar y Avanzar Jugador',
        onConfirm: expect.any(Function),
      }),
    );
  });

  it('handleSaveMatch abre confirmacion para ultimo partido de grupos', () => {
    const { result } = renderHook(() =>
      useTorneoPartido({
        id,
        tournament: mockTournament(),
        isAdmin: true,
        groupMatches: groupMatchesUltimoPendiente,
        onMatchSaved,
      }),
    );

    act(() => {
      result.current.openEditMatchModal(mockMatch, false);
    });

    act(() => {
      result.current.handleSaveMatch();
    });

    expect(openAppConfirmModal).toHaveBeenCalledWith(
      expect.objectContaining({
        title: 'Último partido de la Fase de Grupos',
        confirmLabel: 'Completar y Generar Cuadro',
      }),
    );
  });

  it('handleSaveMatch ejecuta directamente sin confirmacion para partido no completado', () => {
    const { result } = renderHook(() =>
      useTorneoPartido({
        id,
        tournament: mockTournament(),
        isAdmin: true,
        groupMatches: groupMatchesSinCompletar,
        onMatchSaved,
      }),
    );

    act(() => {
      result.current.openEditMatchModal({ ...mockMatch, status: 'Programado' }, true);
    });

    act(() => {
      result.current.handleSaveMatch();
    });

    expect(openAppConfirmModal).not.toHaveBeenCalled();
  });

  it('executeSaveMatch captura errores sin lanzar', async () => {
    vi.mocked(api.put).mockRejectedValueOnce(new Error('Network error'));

    const { result } = renderHook(() =>
      useTorneoPartido({
        id,
        tournament: mockTournament(),
        isAdmin: true,
        groupMatches: groupMatchesSinCompletar,
        onMatchSaved,
      }),
    );

    act(() => {
      result.current.openEditMatchModal(mockMatch, true);
    });

    await expect(
      act(async () => {
        await result.current.executeSaveMatch();
      }),
    ).resolves.not.toThrow();

    expect(result.current.submittingMatch).toBe(false);
  });
});

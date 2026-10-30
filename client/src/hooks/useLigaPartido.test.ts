import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { api } from '../api/axios';
import { openAppConfirmModal } from '../utils/modals';
import { useLigaPartido } from './useLigaPartido';
import type { LeagueDetail, LeagueMatch } from '../types/league';

vi.mock('../api/axios', () => ({ api: { put: vi.fn() } }));
vi.mock('../utils/modals', () => ({ openAppConfirmModal: vi.fn() }));

const league = (overrides: Partial<LeagueDetail> = {}): LeagueDetail =>
  ({ id: 'l1', status: 'Iniciado', setsToWin: 3, participants: [], ...overrides }) as LeagueDetail;

const match = (overrides: Record<string, unknown> = {}): LeagueMatch =>
  ({
    id: 'm1',
    leagueId: 'l1',
    round: 1,
    walkover: false,
    status: 'Programado',
    playerOneId: 'p1',
    playerTwoId: 'p2',
    playerOne: { id: 'p1', name: 'Ana', surname: 'Ruiz' },
    playerTwo: { id: 'p2', name: 'Luis', surname: null },
    setOnePlayerOne: 11,
    setOnePlayerTwo: 5,
    ...overrides,
  }) as LeagueMatch;

const setup = (options: { isAdmin?: boolean; league?: LeagueDetail; matches?: LeagueMatch[] } = {}) => {
  const onMatchSaved = vi.fn().mockResolvedValue(undefined);
  const view = renderHook(() =>
    useLigaPartido({
      league: options.league ?? league(),
      matches: options.matches ?? [match(), match({ id: 'm2' })],
      isAdmin: options.isAdmin ?? true,
      onMatchSaved,
    }),
  );
  return { ...view, onMatchSaved };
};

describe('useLigaPartido', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(api.put).mockResolvedValue({ data: { success: true, data: {} } } as never);
  });

  describe('openEditMatchModal', () => {
    it('prepara el partido con los nombres, los sets de la liga y el marcador actual', () => {
      const { result } = setup();

      act(() => result.current.openEditMatchModal(match()));

      expect(result.current.editMatch).toMatchObject({
        id: 'm1',
        playerOneName: 'Ana Ruiz',
        playerTwoName: 'Luis',
        playerOneId: 'p1',
        playerTwoId: 'p2',
        setsToWin: 3,
        status: 'Programado',
        isKnockout: false,
        set1P1: 11,
        set1P2: 5,
        set2P1: 0,
      });
    });

    it('un jugador (no administrador) no puede editar', () => {
      const { result } = setup({ isAdmin: false });

      act(() => result.current.openEditMatchModal(match()));

      expect(result.current.editMatch).toBeNull();
    });

    it.each(['Programado', 'Completado', 'Cancelado'] as const)(
      'no se edita nada si la liga está %s',
      (status) => {
        const { result } = setup({ league: league({ status }) });

        act(() => result.current.openEditMatchModal(match()));

        expect(result.current.editMatch).toBeNull();
      },
    );

    it('un partido W.O. no se edita', () => {
      const { result } = setup();

      act(() => result.current.openEditMatchModal(match({ walkover: true, status: 'Completado' })));

      expect(result.current.editMatch).toBeNull();
    });

    it('un partido cancelado no se edita', () => {
      const { result } = setup();

      act(() => result.current.openEditMatchModal(match({ status: 'Cancelado' })));

      expect(result.current.editMatch).toBeNull();
    });
  });

  describe('guardar', () => {
    it('envía el marcador a la API, cierra el modal y recarga la liga', async () => {
      const { result, onMatchSaved } = setup();
      act(() => result.current.openEditMatchModal(match()));

      await act(async () => {
        await result.current.executeSaveMatch();
      });

      expect(api.put).toHaveBeenCalledWith(
        '/matches/m1',
        expect.objectContaining({
          setsToWin: 3,
          playerOneId: 'p1',
          playerTwoId: 'p2',
          setOnePlayerOne: 11,
          setOnePlayerTwo: 5,
        }),
        undefined,
      );
      expect(result.current.editMatch).toBeNull();
      expect(onMatchSaved).toHaveBeenCalled();
      expect(result.current.submittingMatch).toBe(false);
    });

    it('si la API falla, conserva el partido en edición y no recarga', async () => {
      vi.mocked(api.put).mockRejectedValue(new Error('fallo'));
      const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
      const { result, onMatchSaved } = setup();
      act(() => result.current.openEditMatchModal(match()));

      await act(async () => {
        await result.current.executeSaveMatch();
      });

      expect(result.current.editMatch).not.toBeNull();
      expect(onMatchSaved).not.toHaveBeenCalled();
      expect(result.current.submittingMatch).toBe(false);
      consoleError.mockRestore();
    });

    it('guarda directamente un resultado que no cierra la liga', () => {
      const { result } = setup();
      act(() => result.current.openEditMatchModal(match({ status: 'Completado' })));

      act(() => result.current.handleSaveMatch());

      expect(openAppConfirmModal).not.toHaveBeenCalled();
      expect(api.put).toHaveBeenCalled();
    });

    it('no pide confirmación al corregir un partido ya completado si queda otro por jugar', () => {
      const { result } = setup({
        matches: [match({ status: 'Completado' }), match({ id: 'm2', status: 'Programado' })],
      });
      act(() => result.current.openEditMatchModal(match({ status: 'Completado' })));

      act(() => result.current.handleSaveMatch());

      expect(openAppConfirmModal).not.toHaveBeenCalled();
    });

    it('pide confirmación al completar el último partido pendiente, porque cierra la liga', () => {
      const { result } = setup({ matches: [match(), match({ id: 'm2', status: 'Completado' })] });
      act(() => result.current.openEditMatchModal(match({ status: 'Completado' })));

      act(() => result.current.handleSaveMatch());

      expect(openAppConfirmModal).toHaveBeenCalledWith(
        expect.objectContaining({ title: 'Último partido de la liga' }),
      );
      expect(api.put).not.toHaveBeenCalled();
    });
  });
});

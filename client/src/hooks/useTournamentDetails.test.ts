import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';

vi.mock('../api/services/tournaments', () => ({
  tournamentsService: {
    byId: vi.fn(),
    participants: vi.fn(),
    groupClassifications: vi.fn(),
    groupMatches: vi.fn(),
    bracket: vi.fn(),
    classifications: vi.fn(),
    register: vi.fn(),
    registerBulk: vi.fn(),
    update: vi.fn(),
    generateGroups: vi.fn(),
    swapPlayers: vi.fn(),
    remove: vi.fn(),
  },
}));
vi.mock('../api/services/matches', () => ({
  matchesService: { update: vi.fn() },
}));
vi.mock('../api/services/users', () => ({
  usersService: { list: vi.fn() },
}));
vi.mock('canvas-confetti', () => ({ default: vi.fn() }));

import { tournamentsService } from '../api/services/tournaments';
import { matchesService } from '../api/services/matches';
import confetti from 'canvas-confetti';
import { useTournamentDetails } from './useTournamentDetails';
import type {
  Tournament,
  TournamentClas,
  TournamentGroupClas,
  GroupMatch,
  KnockoutRound,
  TournamentParticipant,
  MatchToEdit,
} from '../types/tournament';

const mockTournament = (over: Partial<Tournament> = {}): Tournament =>
  ({
    id: 't1',
    name: 'Torneo Test',
    status: 'Programado',
    rounds: 'GruposKnockout',
    typeKnockout: 'LlaveA',
    numPlayers: 16,
    numGroup: 4,
    numGroupPlayers: 4,
    playersKnockout: 2,
    setsToWinGroup: 2,
    setsToWinKnockout: 3,
    ...over,
  }) as Tournament;

const mockLazyData = () => {
  vi.mocked(tournamentsService.byId).mockResolvedValue(mockTournament({ status: 'Programado' }));
  vi.mocked(tournamentsService.groupClassifications).mockResolvedValue([] as TournamentGroupClas[]);
  vi.mocked(tournamentsService.groupMatches).mockResolvedValue([] as GroupMatch[]);
  vi.mocked(tournamentsService.bracket).mockResolvedValue([] as KnockoutRound[]);
  vi.mocked(tournamentsService.classifications).mockResolvedValue([] as TournamentClas[]);
  vi.mocked(tournamentsService.participants).mockResolvedValue([]);
};

const waitForLoaded = async (result: { current: { tournament: unknown | null } }) => {
  await waitFor(() => expect(result.current.tournament).not.toBeNull());
};

describe('useTournamentDetails', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useRealTimers();
  });

  describe('fetchTournamentInfo — KNOCKOUT_STAGES tab sync', () => {
    it('navega a bracketA cuando el torneo pasa a fase de eliminatorias', async () => {
      vi.mocked(tournamentsService.byId).mockResolvedValue(mockTournament({ status: 'Grupos' }));

      const { result } = renderHook(() => useTournamentDetails('t1'));

      expect(result.current.activeTab).toBe('info');
      await waitForLoaded(result);

      vi.mocked(tournamentsService.byId).mockResolvedValue(
        mockTournament({ status: 'Cuartos' }),
      );

      await act(async () => {
        await result.current.reload();
      });

      expect(result.current.activeTab).toBe('bracketA');
    });

    it('no cambia a bracketA si ya esta en bracketB', async () => {
      vi.mocked(tournamentsService.byId).mockResolvedValue(mockTournament({ status: 'Grupos' }));

      const { result } = renderHook(() => useTournamentDetails('t1'));
      await waitForLoaded(result);

      await act(async () => {
        result.current.setActiveTab('bracketB');
      });

      vi.mocked(tournamentsService.byId).mockResolvedValue(
        mockTournament({ status: 'Cuartos' }),
      );

      await act(async () => {
        await result.current.reload();
      });

      expect(result.current.activeTab).toBe('bracketB');
    });

    it('navega a resultados cuando el torneo se completa', async () => {
      vi.mocked(tournamentsService.byId).mockResolvedValue(mockTournament({ status: 'Grupos' }));

      const { result } = renderHook(() => useTournamentDetails('t1'));
      await waitForLoaded(result);

      vi.mocked(tournamentsService.byId).mockResolvedValue(
        mockTournament({ status: 'Completado' }),
      );

      await act(async () => {
        await result.current.reload();
      });

      expect(result.current.activeTab).toBe('resultados');
    });

    it('dispara confetti al pasar a Completado', async () => {
      vi.mocked(tournamentsService.byId).mockResolvedValue(mockTournament({ status: 'Grupos' }));
      const { result } = renderHook(() => useTournamentDetails('t1'));
      await waitForLoaded(result);

      vi.mocked(tournamentsService.byId).mockResolvedValue(
        mockTournament({ status: 'Completado' }),
      );

      // celebrate() usa setInterval; hacemos el callback síncrono para test
      const setIntervalSpy = vi
        .spyOn(globalThis, 'setInterval')
        .mockImplementation((cb: TimerHandler) => {
          if (typeof cb === 'function') cb();
          return 999 as unknown as number;
        });

      await act(async () => {
        await result.current.reload();
      });

      expect(confetti).toHaveBeenCalled();
      setIntervalSpy.mockRestore();
    });
  });

  describe('lazy loading per tab', () => {
    beforeEach(() => mockLazyData());

    it('carga clasificaciones al entrar en resultados', async () => {
      vi.mocked(tournamentsService.classifications).mockResolvedValue([
        { id: 'r1', position: 1, player: { id: 'p1', name: 'A', surname: '' } },
      ] as TournamentClas[]);

      const { result } = renderHook(() => useTournamentDetails('t1'));
      await waitForLoaded(result);

      await act(async () => {
        result.current.setActiveTab('resultados');
      });
      await waitFor(() => expect(result.current.results).not.toBeNull());

      expect(tournamentsService.classifications).toHaveBeenCalledWith('t1');
      expect(result.current.results).toHaveLength(1);
    });

    it('carga grupos y partidos al entrar en grupos', async () => {
      vi.mocked(tournamentsService.groupClassifications).mockResolvedValue([
        { tournamentGroup: { group: 1 }, player: { id: 'p1', name: 'A', surname: '' } },
      ] as TournamentGroupClas[]);

      const { result } = renderHook(() => useTournamentDetails('t1'));
      await waitForLoaded(result);

      await act(async () => {
        result.current.setActiveTab('grupos');
      });
      await waitFor(() => expect(result.current.groupsClas).not.toBeNull());

      expect(tournamentsService.groupClassifications).toHaveBeenCalledWith('t1');
      expect(tournamentsService.groupMatches).toHaveBeenCalledWith('t1');
      expect(result.current.selectedGroup).toBe('1');
    });

    it('carga bracket A al entrar en bracketA', async () => {
      const { result } = renderHook(() => useTournamentDetails('t1'));
      await waitForLoaded(result);

      await act(async () => {
        result.current.setActiveTab('bracketA');
      });
      await waitFor(() => expect(result.current.bracketA).not.toBeNull());

      expect(tournamentsService.bracket).toHaveBeenCalledWith('t1', 'A');
    });
  });

  describe('derived state', () => {
    beforeEach(() => mockLazyData());

    it('confirmedPlayersCount cuenta jugadores Confirmado', async () => {
      vi.mocked(tournamentsService.participants).mockResolvedValue([
        { id: 'p1', player: { id: 'p1', name: 'A', surname: '' }, status: 'Confirmado' },
        { id: 'p2', player: { id: 'p2', name: 'B', surname: '' }, status: 'Confirmado' },
        { id: 'p3', player: { id: 'p3', name: 'C', surname: '' }, status: 'Pendiente' },
      ] as TournamentParticipant[]);

      const { result } = renderHook(() => useTournamentDetails('t1'));
      await waitForLoaded(result);

      expect(result.current.confirmedPlayersCount).toBe(2);
    });

    it('groupOptions deriva grupos unicos desde groupClas', async () => {
      vi.mocked(tournamentsService.groupClassifications).mockResolvedValue([
        { tournamentGroup: { group: 3 }, player: { id: 'p1', name: 'A', surname: '' } },
        { tournamentGroup: { group: 1 }, player: { id: 'p2', name: 'B', surname: '' } },
        { tournamentGroup: { group: 3 }, player: { id: 'p3', name: 'C', surname: '' } },
      ] as TournamentGroupClas[]);

      const { result } = renderHook(() => useTournamentDetails('t1'));
      await waitForLoaded(result);

      await act(async () => {
        result.current.setActiveTab('grupos');
      });
      await waitFor(() => expect(result.current.groupsClas).not.toBeNull());

      expect(result.current.groupOptions).toEqual([
        { value: '1', label: 'Grupo 1' },
        { value: '3', label: 'Grupo 3' },
      ]);
    });
  });

  describe('mutations', () => {
    beforeEach(() => mockLazyData());

    it('saveMatch llama matchesService.update', async () => {
      const { result } = renderHook(() => useTournamentDetails('t1'));
      await waitForLoaded(result);

      await act(async () => {
        await result.current.saveMatch({
          id: 'm1',
          playerOneId: 'p1',
          playerTwoId: 'p2',
          setsToWin: 2,
          status: 'Completado',
          isKnockout: false,
          set1P1: 1, set1P2: 0,
          set2P1: 1, set2P2: 0,
          set3P1: 0, set3P2: 0,
          set4P1: 0, set4P2: 0,
          set5P1: 0, set5P2: 0,
          set6P1: 0, set6P2: 0,
          set7P1: 0, set7P2: 0,
        } as MatchToEdit);
      });

      expect(matchesService.update).toHaveBeenCalledWith('m1', expect.objectContaining({
        status: 'Completado',
        setsToWin: 2,
      }));
    });

    it('swapPlayers llama al servicio con los IDs correctos', async () => {
      const { result } = renderHook(() => useTournamentDetails('t1'));
      await waitForLoaded(result);

      await act(async () => {
        await result.current.swapPlayers('p1', 'p2');
      });

      expect(tournamentsService.swapPlayers).toHaveBeenCalledWith('t1', {
        playerAId: 'p1',
        playerBId: 'p2',
      });
    });
  });

  describe('autoSelectGroup', () => {
    const groupsClas = [{ tournamentGroup: { group: 3 } }] as unknown as TournamentGroupClas[];

    it('selecciona el primer grupo al cargar la pestana de grupos por defecto', async () => {
      mockLazyData();
      vi.mocked(tournamentsService.groupClassifications).mockResolvedValue(groupsClas);

      const { result } = renderHook(() => useTournamentDetails('t1'));
      await waitForLoaded(result);

      await act(async () => {
        result.current.setActiveTab('grupos');
      });

      await waitFor(() => expect(result.current.selectedGroup).toBe('3'));
    });

    it('no selecciona ningun grupo si autoSelectGroup es false', async () => {
      mockLazyData();
      vi.mocked(tournamentsService.groupClassifications).mockResolvedValue(groupsClas);

      const { result } = renderHook(() => useTournamentDetails('t1', { autoSelectGroup: false }));
      await waitForLoaded(result);

      await act(async () => {
        result.current.setActiveTab('grupos');
      });

      await waitFor(() => expect(result.current.groupsClas).toEqual(groupsClas));
      expect(result.current.selectedGroup).toBeNull();
    });
  });

  describe('piezas de recarga expuestas', () => {
    it('reloadTournament recarga el torneo sin volver a pedir los participantes', async () => {
      mockLazyData();
      const { result } = renderHook(() => useTournamentDetails('t1'));
      await waitForLoaded(result);
      vi.mocked(tournamentsService.byId).mockClear();
      vi.mocked(tournamentsService.participants).mockClear();

      await act(async () => {
        await result.current.reloadTournament();
      });

      expect(tournamentsService.byId).toHaveBeenCalledWith('t1');
      expect(tournamentsService.participants).not.toHaveBeenCalled();
    });

    it('reloadActiveTab vuelve a pedir el cuadro A cuando esa es la pestana activa', async () => {
      mockLazyData();
      const { result } = renderHook(() => useTournamentDetails('t1'));
      await waitForLoaded(result);

      await act(async () => {
        result.current.setActiveTab('bracketA');
      });
      await waitFor(() => expect(result.current.bracketA).not.toBeNull());
      vi.mocked(tournamentsService.bracket).mockClear();

      await act(async () => {
        await result.current.reloadActiveTab();
      });

      expect(tournamentsService.bracket).toHaveBeenCalledWith('t1', 'A');
    });

    it('reloadActiveTab no pide nada en la pestana de informacion', async () => {
      mockLazyData();
      const { result } = renderHook(() => useTournamentDetails('t1'));
      await waitForLoaded(result);
      vi.mocked(tournamentsService.bracket).mockClear();
      vi.mocked(tournamentsService.groupMatches).mockClear();

      await act(async () => {
        await result.current.reloadActiveTab();
      });

      expect(tournamentsService.bracket).not.toHaveBeenCalled();
      expect(tournamentsService.groupMatches).not.toHaveBeenCalled();
    });

    it('setParticipants sustituye la lista de participantes', async () => {
      mockLazyData();
      const { result } = renderHook(() => useTournamentDetails('t1'));
      await waitForLoaded(result);
      const nuevos = [{ id: 'x1', status: 'Confirmado' }] as unknown as TournamentParticipant[];

      await act(async () => {
        result.current.setParticipants(nuevos);
      });

      expect(result.current.participants).toEqual(nuevos);
      expect(result.current.confirmedPlayersCount).toBe(1);
    });
  });
});

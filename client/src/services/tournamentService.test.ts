import { describe, it, expect, vi, beforeEach } from 'vitest';
import { TournamentService, createTournamentService } from './tournamentService';

// Mock de los servicios de API
vi.mock('../api/services/tournaments', () => ({
  tournamentsService: {
    byId: vi.fn(),
    participants: vi.fn(),
    bracket: vi.fn(),
    groupClassifications: vi.fn(),
    groupMatches: vi.fn(),
    classifications: vi.fn(),
    register: vi.fn(),
    registerBulk: vi.fn(),
    updateParticipantStatus: vi.fn(),
    generateGroups: vi.fn(),
    update: vi.fn(),
    remove: vi.fn(),
    swapPlayers: vi.fn(),
  },
}));

vi.mock('../api/services/matches', () => ({
  matchesService: {
    update: vi.fn(),
  },
}));

vi.mock('../api/services/users', () => ({
  usersService: {
    list: vi.fn(),
  },
}));

import { tournamentsService } from '../api/services/tournaments';
import { matchesService } from '../api/services/matches';
import { usersService } from '../api/services/users';

describe('TournamentService', () => {
  let service: ReturnType<typeof createTournamentService>;

  beforeEach(() => {
    vi.clearAllMocks();
    service = createTournamentService('tournament-123');
  });

  it('deberia crear una instancia con tournamentId', () => {
    const svc = createTournamentService('test-id');
    expect(svc).toBeInstanceOf(TournamentService);
  });

  it('deberia lanzar error si tournamentId no esta definido', async () => {
    const svc = createTournamentService(null);
    await expect(svc.fetchTournament()).rejects.toThrow('Tournament ID not set');
  });

  describe('fetchTournament', () => {
    it('deberia llamar a tournamentsService.byId', async () => {
      const mockTournament = { id: 'tournament-123', name: 'Test Tournament' };
      vi.mocked(tournamentsService.byId).mockResolvedValue(mockTournament as any);

      const result = await service.fetchTournament();

      expect(tournamentsService.byId).toHaveBeenCalledWith('tournament-123');
      expect(result).toEqual(mockTournament);
    });
  });

  describe('fetchParticipants', () => {
    it('deberia llamar a tournamentsService.participants', async () => {
      const mockParticipants = [{ id: 'p1', name: 'Player 1' }];
      vi.mocked(tournamentsService.participants).mockResolvedValue(mockParticipants as any);

      const result = await service.fetchParticipants();

      expect(tournamentsService.participants).toHaveBeenCalledWith('tournament-123');
      expect(result).toEqual(mockParticipants);
    });
  });

  describe('fetchBrackets', () => {
    it('deberia llamar a bracket A y B en paralelo', async () => {
      const mockBracketA = [{ id: 'round-1' }];
      const mockBracketB = [{ id: 'round-2' }];
      vi.mocked(tournamentsService.bracket)
        .mockResolvedValueOnce(mockBracketA as any)
        .mockResolvedValueOnce(mockBracketB as any);

      const result = await service.fetchBrackets();

      expect(tournamentsService.bracket).toHaveBeenCalledTimes(2);
      expect(tournamentsService.bracket).toHaveBeenCalledWith('tournament-123', 'A');
      expect(tournamentsService.bracket).toHaveBeenCalledWith('tournament-123', 'B');
      expect(result).toEqual({ bracketA: mockBracketA, bracketB: mockBracketB });
    });
  });

  describe('fetchLazyData', () => {
    it('deberia cargar todos los datos en paralelo', async () => {
      const mockData = {
        groupsClas: [{ id: 'gc1' }],
        groupMatches: [{ id: 'gm1' }],
        bracketA: [{ id: 'ba1' }],
        bracketB: [{ id: 'bb1' }],
        results: [{ id: 'r1' }],
      };
      vi.mocked(tournamentsService.groupClassifications).mockResolvedValue(mockData.groupsClas as any);
      vi.mocked(tournamentsService.groupMatches).mockResolvedValue(mockData.groupMatches as any);
      vi.mocked(tournamentsService.bracket)
        .mockResolvedValueOnce(mockData.bracketA as any)
        .mockResolvedValueOnce(mockData.bracketB as any);
      vi.mocked(tournamentsService.classifications).mockResolvedValue(mockData.results as any);

      const result = await service.fetchLazyData();

      expect(result).toEqual(mockData);
    });
  });

  describe('registerSelf', () => {
    it('deberia llamar a tournamentsService.register con playerId', async () => {
      vi.mocked(tournamentsService.register).mockResolvedValue(undefined as any);

      await service.registerSelf('player-123');

      expect(tournamentsService.register).toHaveBeenCalledWith('tournament-123', { playerId: 'player-123' });
    });
  });

  describe('updateParticipantStatus', () => {
    it('deberia llamar a tournamentsService.updateParticipantStatus', async () => {
      vi.mocked(tournamentsService.updateParticipantStatus).mockResolvedValue(undefined as any);

      await service.updateParticipantStatus('player-123', 'Confirmado');

      expect(tournamentsService.updateParticipantStatus).toHaveBeenCalledWith('tournament-123', 'player-123', 'Confirmado');
    });
  });

  describe('generateGroups', () => {
    it('deberia llamar a tournamentsService.generateGroups', async () => {
      vi.mocked(tournamentsService.generateGroups).mockResolvedValue(undefined);

      await service.generateGroups();

      expect(tournamentsService.generateGroups).toHaveBeenCalledWith('tournament-123');
    });
  });

  describe('saveFormat', () => {
    it('deberia llamar a tournamentsService.update con formato numerico', async () => {
      vi.mocked(tournamentsService.update).mockResolvedValue({} as any);

      const format = {
        numGroup: '4',
        numGroupPlayers: '4',
        playersKnockout: '8',
        setsToWinGroup: '2',
        setsToWinKnockout: '3',
      };

      await service.saveFormat(format);

      expect(tournamentsService.update).toHaveBeenCalledWith('tournament-123', {
        numGroup: 4,
        numGroupPlayers: 4,
        playersKnockout: 8,
        setsToWinGroup: 2,
        setsToWinKnockout: 3,
      });
    });
  });

  describe('saveMatch', () => {
    it('deberia mapear MatchToEdit a MatchResultPayload y llamar a matchesService.update', async () => {
      vi.mocked(matchesService.update).mockResolvedValue({} as any);

      const match = {
        id: 'match-1',
        setsToWin: 3,
        playerOneId: 'p1',
        playerTwoId: 'p2',
        set1P1: 11,
        set1P2: 9,
        set2P1: 11,
        set2P2: 7,
        set3P1: 0,
        set3P2: 0,
        set4P1: 0,
        set4P2: 0,
        set5P1: 0,
        set5P2: 0,
        set6P1: 0,
        set6P2: 0,
        set7P1: 0,
        set7P2: 0,
        status: 'Completado',
      } as any;

      await service.saveMatch(match);

      expect(matchesService.update).toHaveBeenCalledWith('match-1', expect.objectContaining({
        setsToWin: 3,
        playerOneId: 'p1',
        playerTwoId: 'p2',
        setOnePlayerOne: 11,
        setOnePlayerTwo: 9,
        setTwoPlayerOne: 11,
        setTwoPlayerTwo: 7,
        status: 'Completado',
      }));
    });
  });

  describe('bulkEnroll', () => {
    it('deberia llamar a tournamentsService.registerBulk', async () => {
      vi.mocked(tournamentsService.registerBulk).mockResolvedValue(undefined as any);

      await service.bulkEnroll(['p1', 'p2', 'p3']);

      expect(tournamentsService.registerBulk).toHaveBeenCalledWith('tournament-123', { playerIds: ['p1', 'p2', 'p3'] });
    });
  });

  describe('swapPlayers', () => {
    it('deberia llamar a tournamentsService.swapPlayers con groupId vacio', async () => {
      vi.mocked(tournamentsService.swapPlayers).mockResolvedValue(undefined);

      await service.swapPlayers('p1', 'p2');

      expect(tournamentsService.swapPlayers).toHaveBeenCalledWith('tournament-123', {
        groupId: '',
        playerOneId: 'p1',
        playerTwoId: 'p2',
      });
    });
  });

  describe('removeTournament', () => {
    it('deberia llamar a tournamentsService.remove', async () => {
      vi.mocked(tournamentsService.remove).mockResolvedValue(undefined);

      await service.removeTournament();

      expect(tournamentsService.remove).toHaveBeenCalledWith('tournament-123');
    });
  });

  describe('loadClubPlayers', () => {
    it('deberia llamar a usersService.list', async () => {
      const mockUsers = [{ id: 'u1', name: 'User 1' }];
      vi.mocked(usersService.list).mockResolvedValue(mockUsers as any);

      const result = await service.loadClubPlayers();

      expect(usersService.list).toHaveBeenCalled();
      expect(result).toEqual(mockUsers);
    });
  });

  describe('createTournamentService factory', () => {
    it('deberia crear una nueva instancia', () => {
      const svc = createTournamentService('test-id');
      expect(svc).toBeInstanceOf(TournamentService);
    });
  });
});

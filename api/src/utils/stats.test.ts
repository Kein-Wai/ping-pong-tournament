import { vi, describe, it, expect, beforeEach } from 'vitest';
import { updateMatchStats } from '../../src/utils/stats';
import { MatchStatus } from '@prisma/client';

describe('Utility: updateMatchStats', () => {
  const mockPrisma = {
    stats: {
      findFirst: vi.fn(),
      update: vi.fn(),
      create: vi.fn(),
    },
  } as any;

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('Debería ignorar el partido y salir rápido si el estado NO es "Completado"', async () => {
    const openMatch = {
      status: MatchStatus.Abierto,
      playerOneId: 'player-1',
      playerTwoId: 'player-2',
    };

    await updateMatchStats(mockPrisma, openMatch);

    expect(mockPrisma.stats.findFirst).not.toHaveBeenCalled();
    expect(mockPrisma.stats.create).not.toHaveBeenCalled();
    expect(mockPrisma.stats.update).not.toHaveBeenCalled();
  });

  it('Debería CREAR nuevas filas de estadísticas si es el primer partido de los jugadores', async () => {
    mockPrisma.stats.findFirst.mockResolvedValue(null);

    const matchPayload = {
      status: MatchStatus.Completado,
      playerOneId: 'uuid-player-1',
      playerTwoId: 'uuid-player-2',
      setOnePlayerOne: 11,
      setOnePlayerTwo: 5,
      setTwoPlayerOne: 11,
      setTwoPlayerTwo: 9,
    };

    await updateMatchStats(mockPrisma, matchPayload);

    expect(mockPrisma.stats.findFirst).toHaveBeenCalledTimes(2);

    expect(mockPrisma.stats.create).toHaveBeenCalledTimes(2);

    expect(mockPrisma.stats.create).toHaveBeenCalledWith({
      data: {
        userId: 'uuid-player-1',
        elo: 509,
        matchWon: 1,
        matchLost: 0,
        setWon: 2,
        setLost: 0,
        pointWon: 22,
        pointLost: 14,
        tournamentWon: 0,
        tournamentLost: 0,
      },
    });

    expect(mockPrisma.stats.create).toHaveBeenCalledWith({
      data: {
        userId: 'uuid-player-2',
        matchWon: 0,
        matchLost: 1,
        setWon: 0,
        setLost: 2,
        pointWon: 14,
        pointLost: 22,
        elo: 491,
        tournamentWon: 0,
        tournamentLost: 0,
      },
    });
  });

  it('Debería INCREMENTAR las estadísticas si los jugadores ya tenían partidos guardados', async () => {
    mockPrisma.stats.findFirst
      .mockResolvedValueOnce({ id: 'stats-id-p1', userId: 'uuid-p1', elo: 500 })
      .mockResolvedValueOnce({ id: 'stats-id-p2', userId: 'uuid-p2', elo: 500 });

    const matchPayload = {
      status: MatchStatus.Completado,
      playerOneId: 'uuid-p1',
      playerTwoId: 'uuid-p2',
      setOnePlayerOne: 11,
      setOnePlayerTwo: 8,
      setTwoPlayerOne: 9,
      setTwoPlayerTwo: 11,
      setThreePlayerOne: 11,
      setThreePlayerTwo: 13,
    };

    await updateMatchStats(mockPrisma, matchPayload);

    expect(mockPrisma.stats.create).not.toHaveBeenCalled();
    expect(mockPrisma.stats.update).toHaveBeenCalledTimes(2);

    expect(mockPrisma.stats.update).toHaveBeenCalledWith({
      where: { id: 'stats-id-p1' },
      data: {
        elo: { increment: -12 },
        matchWon: { increment: 0 },
        matchLost: { increment: 1 },
        setWon: { increment: 1 },
        setLost: { increment: 2 },
        pointWon: { increment: 31 },
        pointLost: { increment: 32 },
      },
    });

    expect(mockPrisma.stats.update).toHaveBeenCalledWith({
      where: { id: 'stats-id-p2' },
      data: {
        elo: { increment: 12 },
        matchWon: { increment: 1 },
        matchLost: { increment: 0 },
        setWon: { increment: 2 },
        setLost: { increment: 1 },
        pointWon: { increment: 32 },
        pointLost: { increment: 31 },
      },
    });
  });
});

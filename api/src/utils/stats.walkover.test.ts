import { vi, describe, it, expect, beforeEach } from 'vitest';
import { handleMatchStatsUpdate } from './stats';
import { MatchStatus, PrismaClient } from '@prisma/client';

describe('handleMatchStatsUpdate: W.O.', () => {
  const mockPrisma = {
    season: { findFirst: vi.fn().mockResolvedValue({ id: 'season-1', isCurrent: true }) },
    stats: { findFirst: vi.fn(), update: vi.fn(), create: vi.fn() },
    playerSkills: { findUnique: vi.fn(), findFirst: vi.fn().mockResolvedValue({ fortalezaMental: 50, experiencia: 50 }) },
    playerSkillUpdate: { createMany: vi.fn(), deleteMany: vi.fn(), create: vi.fn() },
  };

  const walkover = (overrides: Record<string, unknown> = {}) => ({
    id: 'match-1',
    status: MatchStatus.Completado,
    seasonId: 'season-1',
    playerOneId: 'p1',
    playerTwoId: 'p2',
    setOnePlayerOne: 11,
    setOnePlayerTwo: 0,
    setTwoPlayerOne: 11,
    setTwoPlayerTwo: 0,
    ...overrides,
  });

  beforeEach(() => {
    vi.clearAllMocks();
    mockPrisma.stats.findFirst.mockResolvedValue(null);
  });

  it('cuenta victoria y sets pero no suma puntos a favor ni en contra', async () => {
    await handleMatchStatsUpdate(mockPrisma as unknown as PrismaClient, null, walkover({ walkover: true }));

    const winner = mockPrisma.stats.create.mock.calls.find((c) => c[0].data.userId === 'p1')?.[0].data;
    expect(winner).toMatchObject({ matchWon: 1, setWon: 2, pointWon: 0, pointLost: 0 });
  });

  it('un partido normal con el mismo marcador sí suma sus puntos', async () => {
    await handleMatchStatsUpdate(mockPrisma as unknown as PrismaClient, null, walkover());

    const winner = mockPrisma.stats.create.mock.calls.find((c) => c[0].data.userId === 'p1')?.[0].data;
    expect(winner).toMatchObject({ pointWon: 22 });
  });

  it('al revertir un W.O. tampoco resta puntos', async () => {
    mockPrisma.stats.findFirst.mockResolvedValue({ elo: 1000 });
    const previous = walkover({ walkover: true });

    await handleMatchStatsUpdate(mockPrisma as unknown as PrismaClient, previous, { ...previous, status: MatchStatus.Programado });

    const updates = mockPrisma.stats.update.mock.calls.map((c) => c[0].data);
    updates.forEach((data) => {
      expect(data.pointWon).toEqual({ decrement: 0 });
      expect(data.pointLost).toEqual({ decrement: 0 });
    });
  });
});

import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { Prisma } from '@prisma/client';
import { completeManualMatch } from './manual-match-completion';

vi.mock('./season', () => ({
  resolveCurrentSeason: vi.fn().mockResolvedValue({ id: 'season-1' }),
}));
vi.mock('./stats', () => ({
  getPlayerCurrentSkills: vi.fn().mockResolvedValue({ fortalezaMental: 10, experiencia: 30 }),
}));

const makeTx = (updatedCount: number) => ({
  manualMatch: { updateMany: vi.fn().mockResolvedValue({ count: updatedCount }) },
  stats: { upsert: vi.fn() },
  playerSkillUpdate: { create: vi.fn() },
});

const asTx = (tx: ReturnType<typeof makeTx>) => tx as unknown as Prisma.TransactionClient;

const RESULT = {
  mySets: 3,
  opponentSets: 1,
  setScores: [
    { myScore: 11, oppScore: 5 },
    { myScore: 8, oppScore: 11 },
  ],
};

describe('completeManualMatch', () => {
  beforeEach(() => vi.clearAllMocks());

  it('marca el partido como completado solo si aún no lo estaba, y sube su versión', async () => {
    const tx = makeTx(1);

    await completeManualMatch(asTx(tx), { matchId: 'm1', userId: 'u1', result: RESULT });

    expect(tx.manualMatch.updateMany).toHaveBeenCalledWith({
      where: { id: 'm1', status: { not: 'Completado' } },
      data: expect.objectContaining({
        status: 'Completado',
        mySets: 3,
        opponentSets: 1,
        version: { increment: 1 },
      }),
    });
  });

  it('suma las estadísticas del dueño con los puntos de todos los sets', async () => {
    const tx = makeTx(1);

    await completeManualMatch(asTx(tx), { matchId: 'm1', userId: 'u1', result: RESULT });

    expect(tx.stats.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { userId_seasonId: { userId: 'u1', seasonId: 'season-1' } },
        update: expect.objectContaining({
          manualMatchWon: { increment: 1 },
          manualMatchLost: { increment: 0 },
          manualPointWon: { increment: 19 },
          manualPointLost: { increment: 16 },
        }),
      }),
    );
    expect(tx.playerSkillUpdate.create).toHaveBeenCalledOnce();
  });

  it('si ya estaba completado no vuelve a sumar nada y lo indica', async () => {
    const tx = makeTx(0);

    const completed = await completeManualMatch(asTx(tx), {
      matchId: 'm1',
      userId: 'u1',
      result: RESULT,
    });

    expect(completed).toBe(false);
    expect(tx.stats.upsert).not.toHaveBeenCalled();
    expect(tx.playerSkillUpdate.create).not.toHaveBeenCalled();
  });

  it('una derrota suma la derrota', async () => {
    const tx = makeTx(1);

    await completeManualMatch(asTx(tx), {
      matchId: 'm1',
      userId: 'u1',
      result: { mySets: 0, opponentSets: 3, setScores: null },
    });

    expect(tx.stats.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        update: expect.objectContaining({
          manualMatchWon: { increment: 0 },
          manualMatchLost: { increment: 1 },
        }),
      }),
    );
  });
});

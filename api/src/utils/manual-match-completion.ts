import { MatchStatus, type Prisma } from '@prisma/client';
import { resolveCurrentSeason } from './season';
import { calculateSkillGrowth } from './skills';
import { getPlayerCurrentSkills } from './stats';

export interface MatchResult {
  mySets: number;
  opponentSets: number;
  lightNotes?: string | null;
  setScores?: { myScore: number; oppScore: number }[] | null;
}

/**
 * Pasa un partido a Completado y suma sus estadísticas y la subida de habilidades al dueño, una
 * sola vez. La actualización está condicionada a que el partido aún no estuviera completado: si
 * ya lo estaba (reintento, doble toque) no cuenta nada y devuelve `false`, de modo que repetir la
 * petición nunca duplica estadísticas. Debe llamarse dentro de una transacción.
 */
export const completeManualMatch = async (
  tx: Prisma.TransactionClient,
  { matchId, userId, result }: { matchId: string; userId: string; result: MatchResult },
): Promise<boolean> => {
  const { count } = await tx.manualMatch.updateMany({
    where: { id: matchId, status: { not: MatchStatus.Completado } },
    data: {
      status: MatchStatus.Completado,
      mySets: result.mySets,
      opponentSets: result.opponentSets,
      lightNotes: result.lightNotes,
      setScores: result.setScores ? result.setScores : undefined,
      version: { increment: 1 },
    },
  });
  if (count === 0) return false;

  const currentSeason = await resolveCurrentSeason(tx);
  const myTotalPoints = (result.setScores ?? []).reduce((sum, s) => sum + s.myScore, 0);
  const oppTotalPoints = (result.setScores ?? []).reduce((sum, s) => sum + s.oppScore, 0);
  const isWin = result.mySets > result.opponentSets;

  await tx.stats.upsert({
    where: { userId_seasonId: { userId, seasonId: currentSeason.id } },
    create: {
      userId,
      seasonId: currentSeason.id,
      manualMatchWon: isWin ? 1 : 0,
      manualMatchLost: isWin ? 0 : 1,
      manualSetWon: result.mySets,
      manualSetLost: result.opponentSets,
      manualPointWon: myTotalPoints,
      manualPointLost: oppTotalPoints,
    },
    update: {
      manualMatchWon: { increment: isWin ? 1 : 0 },
      manualMatchLost: { increment: isWin ? 0 : 1 },
      manualSetWon: { increment: result.mySets },
      manualSetLost: { increment: result.opponentSets },
      manualPointWon: { increment: myTotalPoints },
      manualPointLost: { increment: oppTotalPoints },
    },
  });

  const userSkills = await getPlayerCurrentSkills(tx, userId);
  await tx.playerSkillUpdate.create({
    data: {
      playerId: userId,
      sourceType: 'Partido',
      status: 'EXPECTED',
      fortalezaMental: calculateSkillGrowth(userSkills?.fortalezaMental),
      experiencia: calculateSkillGrowth(userSkills?.experiencia),
    },
  });
  return true;
};

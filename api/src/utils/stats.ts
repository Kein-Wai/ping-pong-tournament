import { PrismaClient } from '@prisma/client';
import { POINTS_MATCHES, SCORE_DEFAULT } from '../constants';
import { calculateMatchResults } from './match';
import { MatchStatus } from '@prisma/client';

export const updateMatchStats = async (prisma: PrismaClient, match: any) => {
  if (match.status !== MatchStatus.Completado) {
    return;
  }

  const { p1Sets, p2Sets, p1Points, p2Points, p1WinsMatch } = calculateMatchResults(match);

  const p1Stats = await prisma.stats.findFirst({ where: { userId: match.playerOneId } });
  const p2Stats = await prisma.stats.findFirst({ where: { userId: match.playerTwoId } });

  let p1Score = p1Stats?.elo && p1Stats.elo > 0 ? p1Stats.elo : SCORE_DEFAULT;
  let p2Score = p2Stats?.elo && p2Stats.elo > 0 ? p2Stats.elo : SCORE_DEFAULT;

  const diff = Math.abs(p1Score - p2Score);

  let bucket: readonly [number, number];
  if (diff <= 24) bucket = POINTS_MATCHES['24'];
  else if (diff <= 49) bucket = POINTS_MATCHES['49'];
  else if (diff <= 99) bucket = POINTS_MATCHES['99'];
  else if (diff <= 249) bucket = POINTS_MATCHES['249'];
  else bucket = POINTS_MATCHES['750'];

  const p1IsFavorite = p1Score >= p2Score;
  let p1ScoreDelta = 0;
  let p2ScoreDelta = 0;

  if (p1WinsMatch) {
    const pointsExchanged = p1IsFavorite ? bucket[0] : bucket[1];
    p1ScoreDelta = pointsExchanged;
    p2ScoreDelta = -Math.min(pointsExchanged, p2Score - 1);
  } else {
    const pointsExchanged = !p1IsFavorite ? bucket[0] : bucket[1];
    p2ScoreDelta = pointsExchanged;
    p1ScoreDelta = -Math.min(pointsExchanged, p1Score - 1);
  }

  const savePlayerStats = async (
    userId: string,
    statsId: string | undefined,
    scoreDelta: number,
    wonMatch: number,
    lostMatch: number,
    wonSets: number,
    lostSet: number,
    wonPoints: number,
    lostPoints: number,
  ) => {
    if (statsId) {
      await prisma.stats.update({
        where: { id: statsId },
        data: {
          elo: { increment: scoreDelta },
          matchWon: { increment: wonMatch },
          matchLost: { increment: lostMatch },
          setWon: { increment: wonSets },
          setLost: { increment: lostSet },
          pointWon: { increment: wonPoints },
          pointLost: { increment: lostPoints },
        },
      });
    } else {
      await prisma.stats.create({
        data: {
          userId,
          elo: 500 + scoreDelta,
          matchWon: wonMatch,
          matchLost: lostMatch,
          setWon: wonSets,
          setLost: lostSet,
          pointWon: wonPoints,
          pointLost: lostPoints,
          tournamentWon: 0,
          tournamentLost: 0,
        },
      });
    }
  };

  await savePlayerStats(
    match.playerOneId,
    p1Stats?.id,
    p1ScoreDelta,
    p1WinsMatch ? 1 : 0,
    p1WinsMatch ? 0 : 1,
    p1Sets,
    p2Sets,
    p1Points,
    p2Points,
  );

  await savePlayerStats(
    match.playerTwoId,
    p2Stats?.id,
    p2ScoreDelta,
    p1WinsMatch ? 0 : 1,
    p1WinsMatch ? 1 : 0,
    p2Sets,
    p1Sets,
    p2Points,
    p1Points,
  );
};

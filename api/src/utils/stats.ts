import { Prisma, MatchStatus, UpdateSourceType } from '@prisma/client';
import { POINTS_MATCHES, SCORE_DEFAULT } from '../constants';
import { calculateEffectiveResults, CompletedMatch } from './match';
import { resolveCurrentSeason } from './season';
import { calculateSkillGrowth } from './skills';

/** Tramo de puntos ELO que se intercambian segun la diferencia de rating. */
const selectEloBucket = (diff: number): readonly [number, number] => {
  if (diff <= 24) return POINTS_MATCHES['24'];
  if (diff <= 49) return POINTS_MATCHES['49'];
  if (diff <= 99) return POINTS_MATCHES['99'];
  if (diff <= 249) return POINTS_MATCHES['249'];

  return POINTS_MATCHES['750'];
};

/**
 * Calcula la variacion de ELO de los dos jugadores de un partido.
 *
 * El ganador recibe puntos del tramo correspondiente a su diferencia de rating
 * y el perdedor los pierde, sin bajar nunca de 1 punto de ELO.
 */
const calculateEloDeltas = (p1Score: number, p2Score: number, p1WinsMatch: boolean) => {
  const bucket = selectEloBucket(Math.abs(p1Score - p2Score));
  const p1IsFavorite = p1Score >= p2Score;

  if (p1WinsMatch) {
    const pointsExchanged = p1IsFavorite ? bucket[0] : bucket[1];

    return {
      p1ScoreDelta: pointsExchanged,
      p2ScoreDelta: -Math.min(pointsExchanged, p2Score - 1),
    };
  }

  const pointsExchanged = !p1IsFavorite ? bucket[0] : bucket[1];

  return {
    p1ScoreDelta: -Math.min(pointsExchanged, p1Score - 1),
    p2ScoreDelta: pointsExchanged,
  };
};

/** Variacion de estadisticas que se aplica a un jugador tras un partido. */
interface PlayerStatsDelta {
  userId: string;
  statsId: string | undefined;
  scoreDelta: number;
  wonMatch: number;
  lostMatch: number;
  wonSets: number;
  lostSets: number;
  wonPoints: number;
  lostPoints: number;
}

/** Aplica la variacion a la fila de stats del jugador, creandola si no existe. */
const saveOrUpdateStats = async (
  prisma: Prisma.TransactionClient,
  seasonId: string | null,
  delta: PlayerStatsDelta,
) => {
  const {
    userId,
    statsId,
    scoreDelta,
    wonMatch,
    lostMatch,
    wonSets,
    lostSets,
    wonPoints,
    lostPoints,
  } = delta;

  if (statsId) {
    await prisma.stats.update({
      where: { id: statsId },
      data: {
        elo: { increment: scoreDelta },
        matchWon: { increment: wonMatch },
        matchLost: { increment: lostMatch },
        setWon: { increment: wonSets },
        setLost: { increment: lostSets },
        pointWon: { increment: wonPoints },
        pointLost: { increment: lostPoints },
      },
    });

    return;
  }

  await prisma.stats.create({
    data: {
      userId,
      seasonId,
      elo: SCORE_DEFAULT + scoreDelta,
      matchWon: wonMatch,
      matchLost: lostMatch,
      setWon: wonSets,
      setLost: lostSets,
      pointWon: wonPoints,
      pointLost: lostPoints,
      tournamentWon: 0,
      tournamentPart: 0,
    },
  });
};

/**
 * Revierte el marcador de un partido que estaba completado: deshace los stats
 * del partido anterior y borra las mejoras de skill que habia generado.
 */
const revertCompletedMatch = async (prisma: Prisma.TransactionClient, previousMatch: CompletedMatch) => {
  const prevRes = calculateEffectiveResults(previousMatch);

  const p1Stats = await prisma.stats.findFirst({
    where: { userId: previousMatch.playerOneId, seasonId: previousMatch.seasonId },
  });
  const p2Stats = await prisma.stats.findFirst({
    where: { userId: previousMatch.playerTwoId, seasonId: previousMatch.seasonId },
  });

  if (!p1Stats || !p2Stats) return;

  const p1Score = p1Stats.elo || SCORE_DEFAULT;
  const p2Score = p2Stats.elo || SCORE_DEFAULT;
  const { p1ScoreDelta, p2ScoreDelta } = calculateEloDeltas(
    p1Score,
    p2Score,
    prevRes.p1WinsMatch,
  );

  await prisma.stats.update({
    where: { id: p1Stats.id },
    data: {
      elo: { decrement: p1ScoreDelta },
      matchWon: { decrement: prevRes.p1WinsMatch ? 1 : 0 },
      matchLost: { decrement: prevRes.p1WinsMatch ? 0 : 1 },
      setWon: { decrement: prevRes.p1Sets },
      setLost: { decrement: prevRes.p2Sets },
      pointWon: { decrement: prevRes.p1Points },
      pointLost: { decrement: prevRes.p2Points },
    },
  });

  await prisma.stats.update({
    where: { id: p2Stats.id },
    data: {
      elo: { decrement: p2ScoreDelta },
      matchWon: { decrement: prevRes.p1WinsMatch ? 0 : 1 },
      matchLost: { decrement: prevRes.p1WinsMatch ? 1 : 0 },
      setWon: { decrement: prevRes.p2Sets },
      setLost: { decrement: prevRes.p1Sets },
      pointWon: { decrement: prevRes.p2Points },
      pointLost: { decrement: prevRes.p1Points },
    },
  });

  await prisma.playerSkillUpdate.deleteMany({
    where: { matchId: previousMatch.id, sourceType: UpdateSourceType.Partido },
  });
};

/**
 * Aplica el marcador de un partido que pasa a completado: suma los stats de
 * los dos jugadores y genera las mejoras de skill pendientes.
 */
const applyCompletedMatch = async (prisma: Prisma.TransactionClient, newMatch: CompletedMatch) => {
  const newRes = calculateEffectiveResults(newMatch);

  const p1Stats = await prisma.stats.findFirst({
    where: { userId: newMatch.playerOneId, seasonId: newMatch.seasonId },
  });
  const p2Stats = await prisma.stats.findFirst({
    where: { userId: newMatch.playerTwoId, seasonId: newMatch.seasonId },
  });

  const p1Score = p1Stats?.elo && p1Stats.elo > 0 ? p1Stats.elo : SCORE_DEFAULT;
  const p2Score = p2Stats?.elo && p2Stats.elo > 0 ? p2Stats.elo : SCORE_DEFAULT;

  const { p1ScoreDelta, p2ScoreDelta } = calculateEloDeltas(
    p1Score,
    p2Score,
    newRes.p1WinsMatch,
  );

  await saveOrUpdateStats(prisma, newMatch.seasonId, {
    userId: newMatch.playerOneId,
    statsId: p1Stats?.id,
    scoreDelta: p1ScoreDelta,
    wonMatch: newRes.p1WinsMatch ? 1 : 0,
    lostMatch: newRes.p1WinsMatch ? 0 : 1,
    wonSets: newRes.p1Sets,
    lostSets: newRes.p2Sets,
    wonPoints: newRes.p1Points,
    lostPoints: newRes.p2Points,
  });

  await saveOrUpdateStats(prisma, newMatch.seasonId, {
    userId: newMatch.playerTwoId,
    statsId: p2Stats?.id,
    scoreDelta: p2ScoreDelta,
    wonMatch: newRes.p1WinsMatch ? 0 : 1,
    lostMatch: newRes.p1WinsMatch ? 1 : 0,
    wonSets: newRes.p2Sets,
    lostSets: newRes.p1Sets,
    wonPoints: newRes.p2Points,
    lostPoints: newRes.p1Points,
  });

  const p1Skills = await prisma.playerSkills.findFirst({
    where: { userId: newMatch.playerOneId, seasonId: newMatch.seasonId },
  });
  const p2Skills = await prisma.playerSkills.findFirst({
    where: { userId: newMatch.playerTwoId, seasonId: newMatch.seasonId },
  });

  await prisma.playerSkillUpdate.createMany({
    data: [
      {
        playerId: newMatch.playerOneId,
        matchId: newMatch.id,
        sourceType: UpdateSourceType.Partido,
        status: 'EXPECTED',
        fortalezaMental: calculateSkillGrowth(p1Skills?.fortalezaMental),
        experiencia: calculateSkillGrowth(p1Skills?.experiencia),
      },
      {
        playerId: newMatch.playerTwoId,
        matchId: newMatch.id,
        sourceType: UpdateSourceType.Partido,
        status: 'EXPECTED',
        fortalezaMental: calculateSkillGrowth(p2Skills?.fortalezaMental),
        experiencia: calculateSkillGrowth(p2Skills?.experiencia),
      },
    ],
  });
};

/**
 * Mantiene las estadisticas de los jugadores al dia cuando un partido cambia
 * de estado. Soporta edicion y reversion: si el partido ya estaba completado,
 * primero deshace el marcador anterior y despues aplica el nuevo.
 */
export const handleMatchStatsUpdate = async (
  prisma: Prisma.TransactionClient,
  previousMatch: CompletedMatch | null,
  newMatch: CompletedMatch,
) => {
  const wasCompleted = previousMatch?.status === MatchStatus.Completado;
  const isCompletedNow = newMatch.status === MatchStatus.Completado;

  // Si no estaba completado antes ni lo esta ahora, no hay nada que calcular
  if (!wasCompleted && !isCompletedNow) {
    return;
  }

  if (wasCompleted && previousMatch) {
    await revertCompletedMatch(prisma, previousMatch);
  }

  if (isCompletedNow) {
    await applyCompletedMatch(prisma, newMatch);
  }
};

/** Helper para obtener las estadisticas actuales de un jugador */
export const getPlayerCurrentStats = async (prisma: Prisma.TransactionClient, playerId: string) => {
  const currentSeason = await resolveCurrentSeason(prisma);

  return await prisma.stats.findUnique({
    where: { userId_seasonId: { userId: playerId, seasonId: currentSeason.id } },
  });
};

/** Helper para obtener las habilidades (RPG) actuales de un jugador */
export const getPlayerCurrentSkills = async (prisma: Prisma.TransactionClient, playerId: string) => {
  const currentSeason = await resolveCurrentSeason(prisma);

  return await prisma.playerSkills.findUnique({
    where: { userId_seasonId: { userId: playerId, seasonId: currentSeason.id } },
  });
};

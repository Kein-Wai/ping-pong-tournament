import { PrismaClient, MatchStatus, Prisma } from '@prisma/client';
import { computeGroupStandings } from './group-standings';

/**
 * Recalcula la tabla de clasificacion de un grupo y la persiste.
 *
 * Toda la logica de dominio (acumulados, puntos de clasificacion y criterios de
 * desempate) vive en el modulo puro `group-standings`; aqui solo se lee y se
 * escribe. Este es el seam externo que usan el resto de la app.
 */
export const updateGroupStandings = async (prisma: PrismaClient, groupId: string) => {
  const groupClasifications = await prisma.tournamentGroupClas.findMany({
    where: { tournamentGroupId: groupId },
  });

  if (groupClasifications.length === 0) return;

  const completedMatches = await prisma.match.findMany({
    where: {
      groupId: groupId,
      status: MatchStatus.Completado,
    },
  });

  const standings = computeGroupStandings(groupClasifications, completedMatches);

  // Guardamos las metricas recalculadas en la base de datos
  await prisma.$transaction(
    standings.map((standing) =>
      prisma.tournamentGroupClas.update({
        where: { id: standing.id },
        data: {
          played: standing.played,
          gamesWon: standing.gamesWon,
          gamesLost: standing.gamesLost,
          setsWon: standing.setsWon,
          setsLost: standing.setsLost,
          pointsWon: standing.pointsWon,
          pointsLost: standing.pointsLost,
          pointsClas: standing.pointsClas,
          position: standing.position,
        },
      }),
    ),
  );

  const groupInfo = await prisma.tournamentGroup.findUnique({
    where: { id: groupId },
    select: { tournamentId: true },
  });

  if (!groupInfo) throw new Error('Grupo no encontrado');

  const pendingMatches = await prisma.match.count({
    where: {
      tournamentId: groupInfo.tournamentId,
      groupId: { not: null },
      status: { not: MatchStatus.Completado },
    },
  });

  const isGroupPhaseFinished = pendingMatches === 0;

  return {
    success: true,
    isGroupPhaseFinished,
    tournamentId: groupInfo.tournamentId,
  };
};

/** Partidos de un grupo (o de todos los grupos de un torneo). */
export const fetchGroupMatches = async (
  prisma: PrismaClient,
  tournamentId: string,
  groupId?: string,
) => {
  const whereClause: Prisma.MatchWhereInput = {
    tournamentId,
    knockoutId: null,
  };

  if (groupId) {
    whereClause.groupId = groupId;
  }

  return await prisma.match.findMany({
    where: whereClause,
    include: {
      playerOne: { select: { id: true, name: true, surname: true } },
      playerTwo: { select: { id: true, name: true, surname: true } },
      group: { select: { id: true, group: true } },
    },
    orderBy: [{ group: { group: 'asc' } }, { dateStart: 'asc' }],
  });
};

/** Clasificaciones de un grupo (o de todos los grupos de un torneo). */
export const fetchGroupClassifications = async (
  prisma: PrismaClient,
  tournamentId: string,
  groupId?: string,
) => {
  const whereClause: Prisma.TournamentGroupClasWhereInput = {
    tournamentGroup: { tournamentId },
  };

  if (groupId) {
    whereClause.tournamentGroupId = groupId;
  }

  return await prisma.tournamentGroupClas.findMany({
    where: whereClause,
    include: {
      player: { select: { id: true, name: true, surname: true, stats: true } },
      tournamentGroup: { select: { group: true } },
    },
    orderBy: [{ tournamentGroup: { group: 'asc' } }, { position: 'asc' }],
  });
};

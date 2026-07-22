import { PrismaClient } from '@prisma/client';

export const fetchGroupMatches = async (
  prisma: PrismaClient,
  tournamentId: string,
  groupId?: string,
) => {
  const whereClause: any = {
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

export const fetchGroupClassifications = async (
  prisma: PrismaClient,
  tournamentId: string,
  groupId?: string,
) => {
  const whereClause: any = {
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

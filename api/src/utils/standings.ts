import { PrismaClient } from '@prisma/client';
import { MatchStatus } from '@prisma/client';

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

  const statsTracker: Record<string, any> = {};

  for (const clas of groupClasifications) {
    statsTracker[clas.playerId] = {
      played: 0,
      gamesWon: 0,
      gamesLost: 0,
      setsWon: 0,
      setsLost: 0,
      pointsWon: 0,
      pointsLost: 0,
      pointsClas: 0,
    };
  }

  for (const match of completedMatches) {
    const p1 = match.playerOneId;
    const p2 = match.playerTwoId;

    if (!statsTracker[p1] || !statsTracker[p2]) continue;

    let p1Sets = 0;
    let p2Sets = 0;
    let p1Points = 0;
    let p2Points = 0;

    const allSets = [
      [match.setOnePlayerOne, match.setOnePlayerTwo],
      [match.setTwoPlayerOne, match.setTwoPlayerTwo],
      [match.setThreePlayerOne, match.setThreePlayerTwo],
      [match.setFourPlayerOne, match.setFourPlayerTwo],
      [match.setFivePlayerOne, match.setFivePlayerTwo],
      [match.setSixPlayerOne, match.setSixPlayerTwo],
      [match.setSevenPlayerOne, match.setSevenPlayerTwo],
    ];

    for (const [scoreP1, scoreP2] of allSets) {
      if (scoreP1 !== null && scoreP2 !== null && scoreP1 !== undefined && scoreP2 !== undefined) {
        p1Points += scoreP1;
        p2Points += scoreP2;

        if (scoreP1 > scoreP2) p1Sets++;
        else if (scoreP2 > scoreP1) p2Sets++;
      }
    }

    statsTracker[p1].played++;
    statsTracker[p1].setsFor += p1Sets;
    statsTracker[p1].setsAgainst += p2Sets;
    statsTracker[p1].pointsFor += p1Points;
    statsTracker[p1].pointsAgainst += p2Points;

    statsTracker[p2].played++;
    statsTracker[p2].setsFor += p2Sets;
    statsTracker[p2].setsAgainst += p1Sets;
    statsTracker[p2].pointsFor += p2Points;
    statsTracker[p2].pointsAgainst += p1Points;

    if (p1Sets > p2Sets) {
      statsTracker[p1].won++;
      statsTracker[p1].classificationPoints += 2;
      statsTracker[p2].lost++;
      statsTracker[p2].classificationPoints += 1;
    } else if (p2Sets > p1Sets) {
      statsTracker[p2].won++;
      statsTracker[p2].classificationPoints += 2;
      statsTracker[p1].lost++;
      statsTracker[p1].classificationPoints += 1;
    }
  }

  const playersToSort = groupClasifications.map((clas) => ({
    id: clas.id,
    playerId: clas.playerId,
    ...statsTracker[clas.playerId],
  }));

  playersToSort.sort((a, b) => {
    if (b.pointsClas !== a.pointsClas) {
      return b.pointsClas - a.pointsClas;
    }

    const diffSetsA = a.setsWon - a.setsLost;
    const diffSetsB = b.setsWon - b.setsLost;
    if (diffSetsB !== diffSetsA) {
      return diffSetsB - diffSetsA;
    }

    const diffPointsA = a.pointsWon - a.pointsLost;
    const diffPointsB = b.pointsWon - b.pointsLost;
    if (diffPointsB !== diffPointsA) {
      return diffPointsB - diffPointsA;
    }

    return 0;
  });

  const playersWithPosition = playersToSort.map((player, index) => ({
    ...player,
    position: index + 1,
  }));

  await prisma.$transaction(
    playersWithPosition.map((player) => {
      return prisma.tournamentGroupClas.update({
        where: { id: player.id },
        data: {
          played: player.played,
          gamesWon: player.gamesWon,
          gamesLost: player.gamesLost,
          setsWon: player.setsWon,
          setsLost: player.setsLost,
          pointsWon: player.pointsWon,
          pointsLost: player.pointsLost,
          pointsClas: player.pointsClas,
          position: player.position,
        },
      });
    }),
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
      status: { not: 'Completado' },
    },
  });

  const isGroupPhaseFinished = pendingMatches === 0;

  return {
    success: true,
    isGroupPhaseFinished,
    tournamentId: groupInfo.tournamentId,
  };
};

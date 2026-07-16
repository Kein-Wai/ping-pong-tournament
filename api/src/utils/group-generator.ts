import { PrismaClient } from '@prisma/client';
import { TournamentStatus } from '@prisma/client';
import { MATCH_MATRIX } from '../constants';

const MATCH_MATRICES: Record<number, number[][]> = MATCH_MATRIX;

export const generateTournamentGroups = async (prisma: PrismaClient, tournamentId: string) => {
  const tournament = await prisma.tournament.findUnique({
    where: { id: tournamentId },
  });

  if (!tournament) throw new Error('El torneo no existe');
  if (tournament.groupsCreated) throw new Error('Los grupos ya han sido generados');
  if (!tournament.numGroup) throw new Error('El torneo no tiene definido el número de grupos');

  const participants = await prisma.tournamentParticipant.findMany({
    where: {
      tournamentId: tournamentId,
      status: 'Confirmado',
    },
    include: {
      player: {
        include: { stats: true },
      },
    },
  });

  if (participants.length < 2) {
    throw new Error('No hay suficientes jugadores confirmados para generar los grupos');
  }

  const playersWithElo = participants.map((p) => {
    const elo = p.player.stats?.elo ? p.player.stats.elo : 500;
    return { playerId: p.playerId, elo };
  });

  playersWithElo.sort((a, b) => b.elo - a.elo);

  const snakeGroups: Array<Array<string>> = Array.from({ length: tournament.numGroup }, () => []);

  let currentGroupIndex = 0;
  let direction = 1;

  for (const player of playersWithElo) {
    snakeGroups[currentGroupIndex].push(player.playerId);

    if (direction === 1) {
      if (currentGroupIndex === tournament.numGroup - 1) {
        direction = -1;
      } else {
        currentGroupIndex++;
      }
    } else {
      if (currentGroupIndex === 0) {
        direction = 1;
      } else {
        currentGroupIndex--;
      }
    }
  }

  await prisma.$transaction(async (tx) => {
    for (let i = 0; i < snakeGroups.length; i++) {
      const groupPlayers = snakeGroups[i];
      if (groupPlayers.length === 0) continue;

      const group = await tx.tournamentGroup.create({
        data: {
          tournamentId: tournament.id,
          group: i + 1,
          status: TournamentStatus.Programado,
        },
      });

      for (const playerId of groupPlayers) {
        await tx.tournamentGroupClas.create({
          data: {
            tournamentGroupId: group.id,
            playerId: playerId,
            position: 0,
          },
        });
      }

      const numPlayersInThisGroup = groupPlayers.length;
      const matrix = MATCH_MATRICES[numPlayersInThisGroup];

      if (matrix) {
        for (const [p1Index, p2Index] of matrix) {
          const playerOneId = groupPlayers[p1Index - 1];
          const playerTwoId = groupPlayers[p2Index - 1];

          if (playerOneId && playerTwoId) {
            await tx.match.create({
              data: {
                tournamentId: tournament.id,
                groupId: group.id,
                playerOneId: playerOneId,
                playerTwoId: playerTwoId,
                status: 'Programado',
                dateStart: new Date(),
              },
            });
          }
        }
      }
    }

    await tx.tournament.update({
      where: { id: tournament.id },
      data: {
        groupsCreated: true,
        status: TournamentStatus.Programado,
      },
    });
  });

  return { success: true, message: 'Grupos y partidos generados mediante Serpiente' };
};

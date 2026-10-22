import { PrismaClient, TournamentStatus } from '@prisma/client';
import { buildGroupsEngine, TournamentSeed } from './group-engine';

// Re-exportados para que los llamadores usen el motor a traves de este modulo.
export { buildGroupsEngine, TournamentSeed };

/**
 * Genera los grupos y los partidos de la fase de grupos de un torneo.
 *
 * El reparto lo calcula el modulo puro `group-engine`; aqui solo se lee de la
 * base de datos y se escribe el resultado.
 */
export const generateTournamentGroups = async (prisma: PrismaClient, tournamentId: string) => {
  const tournament = await prisma.tournament.findUnique({
    where: { id: tournamentId },
  });

  if (!tournament) throw new Error('El torneo no existe');
  if (tournament.groupsCreated) throw new Error('Los grupos ya han sido generados');
  if (!tournament.numGroup)
    throw new Error('El torneo no tiene definido el número de grupos');

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

  // Transformar los datos de Prisma a la interfaz universal del motor
  const playersWithElo: TournamentSeed[] = participants.map((participant) => {
    const currentStats = participant.player.stats.find(
      (stat) => stat.seasonId === tournament.seasonId,
    );
    const elo = currentStats?.elo ? currentStats.elo : 500;

    return { id: participant.playerId, seedValue: elo };
  });

  const groupsData = buildGroupsEngine(playersWithElo, tournament.numGroup);

  // Guardar la estructura en Prisma
  await prisma.$transaction(async (tx) => {
    for (const groupData of groupsData) {
      if (groupData.players.length === 0) continue;

      const group = await tx.tournamentGroup.create({
        data: {
          tournamentId: tournament.id,
          group: groupData.groupIndex,
          status: TournamentStatus.Programado,
        },
      });

      for (const playerId of groupData.players) {
        await tx.tournamentGroupClas.create({
          data: {
            tournamentGroupId: group.id,
            playerId: playerId,
            position: 0,
          },
        });
      }

      for (const match of groupData.matches) {
        await tx.match.create({
          data: {
            tournamentId: tournament.id,
            groupId: group.id,
            playerOneId: match.playerOneId,
            playerTwoId: match.playerTwoId,
            status: 'Programado',
            dateStart: new Date(),
          },
        });
      }
    }

    await tx.tournament.update({
      where: { id: tournament.id },
      data: {
        groupsCreated: true,
        status: TournamentStatus.Grupos,
      },
    });
  });

  return { success: true, message: 'Grupos y partidos generados mediante Serpiente' };
};

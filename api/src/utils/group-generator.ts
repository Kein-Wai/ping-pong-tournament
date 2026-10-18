import { PrismaClient, TournamentStatus } from '@prisma/client';
import { MATCH_MATRIX } from '../constants';

// ==========================================
// 1. INTERFAZ UNIVERSAL (Independiente de la DB)
// ==========================================
export interface TournamentSeed {
  id: string; // Puede ser un UUID de base de datos o un ID temporal "excel-1"
  seedValue: number; // El valor para ordenar (ELO, Ranking manual, etc.)
}

// ==========================================
// 2. MOTOR MATEMÁTICO PURO (Sin Prisma)
// ==========================================
export const buildGroupsEngine = (players: TournamentSeed[], numGroups: number) => {
  // 1. Ordenamos a los jugadores por su valor (de mayor a menor)
  const sortedPlayers = [...players].sort((a, b) => b.seedValue - a.seedValue);

  // 2. Algoritmo de la Serpiente
  const snakeGroups: Array<Array<string>> = Array.from({ length: numGroups }, () => []);
  let currentGroupIndex = 0;
  let direction = 1;

  if (numGroups === 1) {
    for (const player of sortedPlayers) {
      snakeGroups[0].push(player.id);
    }
  } else {
    for (const player of sortedPlayers) {
      snakeGroups[currentGroupIndex].push(player.id);

      if (direction === 1) {
        if (currentGroupIndex === numGroups - 1) {
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
  }

  // 3. Generar enfrentamientos usando la matriz matemática
  const MATCH_MATRICES: Record<number, number[][]> = MATCH_MATRIX;

  const groupsData = snakeGroups.map((groupPlayers, index) => {
    const matches: Array<{ playerOneId: string; playerTwoId: string }> = [];
    const numPlayersInThisGroup = groupPlayers.length;
    const matrix = MATCH_MATRICES[numPlayersInThisGroup];

    if (matrix) {
      for (const [p1Index, p2Index] of matrix) {
        const playerOneId = groupPlayers[p1Index - 1];
        const playerTwoId = groupPlayers[p2Index - 1];

        if (playerOneId && playerTwoId) {
          matches.push({ playerOneId, playerTwoId });
        }
      }
    }

    return {
      groupIndex: index + 1,
      players: groupPlayers,
      matches,
    };
  });

  // Retornamos un JSON estructural puro, sin tocar bases de datos
  return groupsData;
};

// ==========================================
// 3. ADAPTADOR DE BASE DE DATOS (El flujo actual)
// ==========================================
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

  // Transformar los datos de Prisma a la interfaz universal del motor
  const playersWithElo: TournamentSeed[] = participants.map((p) => {
    const currentStats = p.player.stats.find((s) => s.seasonId === tournament.seasonId);
    const elo = currentStats?.elo ? currentStats.elo : 500;
    return { id: p.playerId, seedValue: elo };
  });

  // 🚀 LLAMADA AL MOTOR PURO
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

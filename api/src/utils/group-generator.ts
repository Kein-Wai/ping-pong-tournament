import { PrismaClient } from '@prisma/client';
import { MatchStatus } from '@prisma/client';
import { MATCH_MATRIX } from '../constants';

const MATCH_MATRICES: Record<number, number[][]> = MATCH_MATRIX;

export const generateTournamentGroups = async (prisma: PrismaClient, tournamentId: string) => {
  // 1. OBTENER EL TORNEO
  const tournament = await prisma.tournament.findUnique({
    where: { id: tournamentId },
  });

  if (!tournament) throw new Error('El torneo no existe');
  if (tournament.groupsCreated) throw new Error('Los grupos ya han sido generados');
  if (!tournament.numGroup) throw new Error('El torneo no tiene definido el número de grupos');

  // 2. OBTENER JUGADORES CONFIRMADOS Y SUS ESTADÍSTICAS (PARA EL ELO)
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

  // 3. ORDENAR JUGADORES POR ELO (De mayor a menor)
  // Extraemos un array limpio con el ID del jugador y su Elo
  const playersWithElo = participants.map((p) => {
    // Si no tiene fila en stats, asumimos 500 (el base)
    const elo = p.player.stats?.elo ? p.player.stats.elo : 500;
    return { playerId: p.playerId, elo };
  });

  playersWithElo.sort((a, b) => b.elo - a.elo); // Orden descendente

  // 4. ALGORITMO DE LA SERPIENTE (SNAKE SEEDING)
  // Preparamos un array de arrays vacío para meter a los jugadores
  const snakeGroups: Array<Array<string>> = Array.from({ length: tournament.numGroup }, () => []);

  let currentGroupIndex = 0;
  let direction = 1; // 1 = Izquierda a Derecha, -1 = Derecha a Izquierda

  for (const player of playersWithElo) {
    snakeGroups[currentGroupIndex].push(player.playerId);

    if (direction === 1) {
      if (currentGroupIndex === tournament.numGroup - 1) {
        direction = -1; // Chocamos con la pared derecha, rebotamos
      } else {
        currentGroupIndex++; // Avanzamos a la derecha
      }
    } else {
      if (currentGroupIndex === 0) {
        direction = 1; // Chocamos con la pared izquierda, rebotamos
      } else {
        currentGroupIndex--; // Avanzamos a la izquierda
      }
    }
  }

  // 5. INYECCIÓN EN BASE DE DATOS (Grupos, Clasificaciones y Partidos)
  // Usamos una transacción de Prisma para que, si algo falla, no se guarde nada a medias
  await prisma.$transaction(async (tx) => {
    for (let i = 0; i < snakeGroups.length; i++) {
      const groupPlayers = snakeGroups[i];
      if (groupPlayers.length === 0) continue; // Grupo vacío (raro, pero previene errores)

      // A) Crear el Grupo
      const group = await tx.tournamentGroup.create({
        data: {
          tournamentId: tournament.id,
          group: i + 1, // Grupo 1, 2, 3...
          status: MatchStatus.Programado,
        },
      });

      // B) Crear la Clasificación inicial (todos a 0)
      for (const playerId of groupPlayers) {
        await tx.tournamentGroupClas.create({
          data: {
            tournamentGroupId: group.id,
            playerId: playerId,
            position: 0,
          },
        });
      }

      // C) Generar los Partidos usando la matriz correspondiente
      const numPlayersInThisGroup = groupPlayers.length;
      const matrix = MATCH_MATRICES[numPlayersInThisGroup];

      if (matrix) {
        for (const [p1Index, p2Index] of matrix) {
          // La matriz usa índices 1, 2, 3... Le restamos 1 para usar el array de JS (0, 1, 2...)
          const playerOneId = groupPlayers[p1Index - 1];
          const playerTwoId = groupPlayers[p2Index - 1];

          // Por si la matriz pide un jugador que no existe (fallback de seguridad)
          if (playerOneId && playerTwoId) {
            await tx.match.create({
              data: {
                tournamentId: tournament.id,
                groupId: group.id,
                playerOneId: playerOneId,
                playerTwoId: playerTwoId,
                status: 'Programado',
                dateStart: new Date(), // Aquí el Admin podría ponerles fecha en el futuro
              },
            });
          }
        }
      }
    }

    // 6. ACTUALIZAR EL ESTADO DEL TORNEO
    await tx.tournament.update({
      where: { id: tournament.id },
      data: {
        groupsCreated: true,
        status: MatchStatus.Programado, // El torneo ya está vivo
      },
    });
  });

  return { success: true, message: 'Grupos y partidos generados mediante Serpiente' };
};

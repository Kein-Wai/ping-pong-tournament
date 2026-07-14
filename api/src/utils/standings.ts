import { PrismaClient } from '@prisma/client';
import { STATUS } from '../constants';

export const updateGroupStandings = async (prisma: PrismaClient, groupId: string) => {
  // 1. Obtenemos a todos los jugadores que pertenecen a este grupo
  const groupClasifications = await prisma.tournamentGroupClas.findMany({
    where: { tournamentGroupId: groupId },
  });

  if (groupClasifications.length === 0) return;

  // 2. Obtenemos TODOS los partidos COMPLETADOS de este grupo
  const completedMatches = await prisma.match.findMany({
    where: {
      groupId: groupId,
      status: STATUS.COMPLETED, // O el estado exacto que uses (ej. 'COMPLETED')
    },
  });

  // 3. Preparamos un "diccionario" en memoria para ir sumando las estadísticas desde cero
  const statsTracker: Record<string, any> = {};

  // Inicializamos a todos los jugadores a 0
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

  // 4. Recorremos los partidos y acumulamos la magia matemática
  for (const match of completedMatches) {
    const p1 = match.playerOneId;
    const p2 = match.playerTwoId;

    // Si por algún motivo el partido tiene jugadores que no están en el tracker, lo saltamos
    if (!statsTracker[p1] || !statsTracker[p2]) continue;

    let p1Sets = 0;
    let p2Sets = 0;
    let p1Points = 0;
    let p2Points = 0;

    const allSets = [
      [match.setOnePlayerOne, match.setOnePlayerTwo],
      [match.setTwoPlayerOne, match.setTwoPlayerTwo],
      [match.setThreePlayerOne, match.setThreePlayerTwo],
      [match.setFourPlayerOne, match.setFourPlayerTwo], // Set 4
      [match.setFivePlayerOne, match.setFivePlayerTwo], // Set 5
      [match.setSixPlayerOne, match.setSixPlayerTwo], // Set 6
      [match.setSevenPlayerOne, match.setSevenPlayerTwo], // Set 7
    ];

    // Recorremos los 7 sets. Si un set tiene puntos, los sumamos.
    for (const [scoreP1, scoreP2] of allSets) {
      if (scoreP1 !== null && scoreP2 !== null && scoreP1 !== undefined && scoreP2 !== undefined) {
        p1Points += scoreP1;
        p2Points += scoreP2;

        if (scoreP1 > scoreP2) p1Sets++;
        else if (scoreP2 > scoreP1) p2Sets++;
      }
    }

    // Actualizamos Estadísticas Globales del Jugador 1
    statsTracker[p1].played++;
    statsTracker[p1].setsFor += p1Sets;
    statsTracker[p1].setsAgainst += p2Sets;
    statsTracker[p1].pointsFor += p1Points;
    statsTracker[p1].pointsAgainst += p2Points;

    // Actualizamos Estadísticas Globales del Jugador 2
    statsTracker[p2].played++;
    statsTracker[p2].setsFor += p2Sets;
    statsTracker[p2].setsAgainst += p1Sets;
    statsTracker[p2].pointsFor += p2Points;
    statsTracker[p2].pointsAgainst += p1Points;

    // Determinamos quién ganó el partido
    if (p1Sets > p2Sets) {
      statsTracker[p1].won++;
      statsTracker[p1].classificationPoints += 2; // Oficial ITTF: 2 pts victoria
      statsTracker[p2].lost++;
      statsTracker[p2].classificationPoints += 1; // Oficial ITTF: 1 pt derrota jugada
    } else if (p2Sets > p1Sets) {
      statsTracker[p2].won++;
      statsTracker[p2].classificationPoints += 2;
      statsTracker[p1].lost++;
      statsTracker[p1].classificationPoints += 1;
    }
  }

  const playersToSort = groupClasifications.map((clas) => ({
    id: clas.id, // ID de la fila en TournamentGroupClas
    playerId: clas.playerId, // ID del jugador
    ...statsTracker[clas.playerId], // Esparcimos todos los stats (gamesWon, etc.)
  }));

  // 2. Motor de ordenación (Reglas oficiales de Tenis de Mesa)
  playersToSort.sort((a, b) => {
    // Regla 1: Puntos de Clasificación (pointsClas)
    if (b.pointsClas !== a.pointsClas) {
      return b.pointsClas - a.pointsClas; // De mayor a menor
    }

    // Regla 2: Diferencia de Sets (Si hay empate a puntos)
    const diffSetsA = a.setsWon - a.setsLost;
    const diffSetsB = b.setsWon - b.setsLost;
    if (diffSetsB !== diffSetsA) {
      return diffSetsB - diffSetsA;
    }

    // Regla 3: Diferencia de Puntos (Si hay empate a puntos y a sets)
    const diffPointsA = a.pointsWon - a.pointsLost;
    const diffPointsB = b.pointsWon - b.pointsLost;
    if (diffPointsB !== diffPointsA) {
      return diffPointsB - diffPointsA;
    }

    // Regla 4: Sorteo / Empate técnico absoluto
    return 0;
  });

  // 3. Asignamos la posición final basada en cómo ha quedado el array
  // Al primero de la lista (index 0) le toca la posición 1, etc.
  const playersWithPosition = playersToSort.map((player, index) => ({
    ...player,
    position: index + 1,
  }));

  // 5. Guardamos en la base de datos de golpe usando una transacción
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
          position: player.position, // ¡AQUÍ INYECTAMOS LA POSICIÓN!
        },
      });
    }),
  );

  return true; // Terminamos el Paso 1 con éxito
};

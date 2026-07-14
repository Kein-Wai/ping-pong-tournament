import { PrismaClient } from '@prisma/client';
import { STATUS, GROUP_WIN_POINTS } from '../constants';
import { calculateMatchResults } from './match';

export const updateTournamentGroupClas = async (prisma: PrismaClient, match: any) => {
  // 1. Regla básica: El partido debe estar completado y tener un torneo asignado
  if (match.status !== STATUS.COMPLETED || !match.tournamentId) {
    return;
  }

  // 2. Verificar que el torneo existe
  const tournament = await prisma.tournament.findUnique({
    where: { id: match.tournamentId },
  });

  if (!tournament) {
    throw new Error('El torneo asignado al partido no existe.');
  }

  // 3. Verificar si es un partido de fase de grupos
  if (!match.groupId) {
    return; // Si no tiene grupo (ej. es eliminatoria), salimos silenciosamente
  }

  // 4. Verificar que el grupo existe
  const group = await prisma.tournamentGroup.findUnique({
    where: { id: match.groupId },
  });

  if (!group) {
    throw new Error('El grupo asignado al partido no existe en este torneo.');
  }

  const { p1Sets, p2Sets, p1Points, p2Points, p1WinsMatch, p2WinsMatch } =
    calculateMatchResults(match);

  const p1PointsClas = p1WinsMatch ? GROUP_WIN_POINTS : 0;
  const p2PointsClas = p2WinsMatch ? GROUP_WIN_POINTS : 0;

  const updatePlayerClas = async (
    playerId: string,
    wonGames: number,
    lostGames: number,
    wonSets: number,
    lostSets: number,
    wonPts: number,
    lostPts: number,
    pointsClas: number,
  ) => {
    // Buscamos la fila de clasificación de este jugador en este grupo exacto
    const clas = await prisma.tournamentGroupClas.findFirst({
      where: {
        tournamentGroupId: match.groupId,
        playerId: playerId,
      },
    });

    if (clas) {
      await prisma.tournamentGroupClas.update({
        where: { id: clas.id },
        data: {
          gamesWon: { increment: wonGames },
          gamesLost: { increment: lostGames },
          setsWon: { increment: wonSets },
          setsLost: { increment: lostSets },
          pointsWon: { increment: wonPts },
          pointsLost: { increment: lostPts },
          pointsClas: { increment: pointsClas },
        },
      });
    } else {
      await prisma.tournamentGroupClas.create({
        data: {
          tournamentGroupId: match.groupId,
          playerId: playerId,
          gamesWon: wonGames,
          gamesLost: lostGames,
          setsWon: wonSets,
          setsLost: lostSets,
          pointsWon: wonPts,
          pointsLost: lostPts,
          pointsClas: pointsClas,
          position: 0, // La posición se suele calcular al final reordenando la tabla
        },
      });
    }
  };

  // Ejecutamos la actualización para ambos jugadores
  await updatePlayerClas(
    match.playerOneId,
    p1WinsMatch ? 1 : 0,
    p2WinsMatch ? 1 : 0,
    p1Sets,
    p2Sets,
    p1Points,
    p2Points,
    p1PointsClas,
  );
  await updatePlayerClas(
    match.playerTwoId,
    p2WinsMatch ? 1 : 0,
    p1WinsMatch ? 1 : 0,
    p2Sets,
    p1Sets,
    p2Points,
    p1Points,
    p2PointsClas,
  );
};

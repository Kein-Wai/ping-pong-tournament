import { PrismaClient } from '@prisma/client';
import { STATUS } from '../constants';

export const updateMatchStats = async (prisma: PrismaClient, match: any) => {
  // 1. Regla de oro: Solo actualizamos si el partido está Completado
  if (match.status !== STATUS.COMPLETED) {
    return;
  }

  // 2. Extraemos todos los sets en un array para poder iterarlos
  const sets = [
    [match.setOnePlayerOne, match.setOnePlayerTwo],
    [match.setTwoPlayerOne, match.setTwoPlayerTwo],
    [match.setThreePlayerOne, match.setThreePlayerTwo],
    [match.setFourPlayerOne, match.setFourPlayerTwo],
    [match.setFivePlayerOne, match.setFivePlayerTwo],
    [match.setSixPlayerOne, match.setSixPlayerTwo],
    [match.setSevenPlayerOne, match.setSevenPlayerTwo],
  ];

  let p1Sets = 0,
    p2Sets = 0;
  let p1Points = 0,
    p2Points = 0;

  // 3. Calculamos quién ganó cada set y sumamos los puntos totales
  for (const [s1, s2] of sets) {
    // Convertimos de BigInt a Number (por si acaso Prisma los trae como BigInt)
    const score1 = Number(s1 || 0);
    const score2 = Number(s2 || 0);

    if (score1 === 0 && score2 === 0) continue; // Set no jugado

    p1Points += score1;
    p2Points += score2;

    if (score1 > score2) p1Sets++;
    else if (score2 > score1) p2Sets++;
  }

  // 4. ¿Quién ganó el partido?
  const p1WinsMatch = p1Sets > p2Sets ? 1 : 0;
  const p2WinsMatch = p2Sets > p1Sets ? 1 : 0;

  // 5. Función auxiliar interna para inyectar los datos en la base de datos
  const updateUserStats = async (
    userId: string,
    wonMatch: number,
    lostMatch: number,
    wonSets: number,
    lostSet: number,
    wonPoints: number,
    lostPoints: number,
  ) => {
    // Buscamos si el jugador ya tiene una fila en la tabla Stats
    const userStats = await prisma.stats.findFirst({ where: { userId } });

    if (userStats) {
      // Si ya tiene stats, le SUMAMOS los de este partido (increment)
      await prisma.stats.update({
        where: { id: userStats.id },
        data: {
          matchWon: { increment: wonMatch },
          matchLost: { increment: lostMatch },
          setWon: { increment: wonSets },
          setLost: { increment: lostSet },
          pointWon: { increment: wonPoints },
          pointLost: { increment: lostPoints },
        },
      });
    } else {
      // Si es su primer partido completado, le creamos su fila de Stats
      await prisma.stats.create({
        data: {
          userId,
          matchWon: wonMatch,
          matchLost: lostMatch,
          setWon: wonSets,
          setLost: lostSet,
          pointWon: wonPoints,
          pointLost: lostPoints,
          score: 0, // Lo dejamos en 0 por ahora
          tournamentWon: 0,
          tournamentLost: 0,
        },
      });
    }
  };

  // 6. Ejecutamos la actualización para ambos jugadores
  await updateUserStats(
    match.playerOneId,
    p1WinsMatch,
    p2WinsMatch,
    p1Sets,
    p2Sets,
    p1Points,
    p2Points,
  );
  await updateUserStats(
    match.playerTwoId,
    p2WinsMatch,
    p1WinsMatch,
    p2Sets,
    p1Sets,
    p2Points,
    p1Points,
  );
};

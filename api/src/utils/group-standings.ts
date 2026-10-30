import { calculateEffectiveResults, ScoredMatch } from './match';

/** Fila de clasificación de un jugador dentro de un grupo. */
export interface GroupClassification {
  id: string;
  playerId: string;
}

/** Métricas y posición de un jugador en la tabla de clasificación de un grupo. */
export interface PlayerStanding {
  id: string;
  playerId: string;
  played: number;
  gamesWon: number;
  gamesLost: number;
  setsWon: number;
  setsLost: number;
  pointsWon: number;
  pointsLost: number;
  pointsClas: number;
  position: number;
}

/** Fila de la tabla antes de asignarle posición. */
type StandingRow = Omit<PlayerStanding, 'position'>;

/** Acumulado de métricas de un jugador dentro de la fase de grupos. */
type StandingMetrics = Omit<StandingRow, 'id' | 'playerId'>;

const emptyMetrics = (): StandingMetrics => ({
  played: 0,
  gamesWon: 0,
  gamesLost: 0,
  setsWon: 0,
  setsLost: 0,
  pointsWon: 0,
  pointsLost: 0,
  pointsClas: 0,
});

/**
 * Calcula la tabla de clasificación de un grupo a partir de sus partidos.
 *
 * Módulo PURO: no toca la base de datos, no depende del reloj y no muta sus
 * entradas. Aquí vive todo el dominio de la fase de grupos: el acumulado de
 * sets y puntos, los puntos de clasificación (2 por ganar el partido, 1 por
 * jugar o perder; un W.O. da 0 al que se retira y no cuenta puntos de juego) y los criterios de desempate oficiales de tenis de mesa.
 *
 * Su interface es una sola función: esa es la superficie de test del módulo.
 */
export const computeGroupStandings = (
  classifications: GroupClassification[],
  matches: ScoredMatch[],
): PlayerStanding[] => {
  const metrics = new Map<string, StandingMetrics>(
    classifications.map((classification) => [classification.playerId, emptyMetrics()]),
  );

  for (const match of matches) {
    const p1Metrics = metrics.get(match.playerOneId);
    const p2Metrics = metrics.get(match.playerTwoId);

    // Un partido con un jugador que no pertenece al grupo no altera la tabla.
    if (!p1Metrics || !p2Metrics) continue;

    const { p1Sets, p2Sets, p1Points, p2Points } = calculateEffectiveResults(match);
    const p1Won = p1Sets > p2Sets;
    const p2Won = p2Sets > p1Sets;

    metrics.set(match.playerOneId, {
      ...p1Metrics,
      played: p1Metrics.played + 1,
      setsWon: p1Metrics.setsWon + p1Sets,
      setsLost: p1Metrics.setsLost + p2Sets,
      pointsWon: p1Metrics.pointsWon + p1Points,
      pointsLost: p1Metrics.pointsLost + p2Points,
      gamesWon: p1Metrics.gamesWon + (p1Won ? 1 : 0),
      gamesLost: p1Metrics.gamesLost + (p2Won ? 1 : 0),
      pointsClas: p1Metrics.pointsClas + (p1Won ? 2 : p2Won && !match.walkover ? 1 : 0),
    });

    metrics.set(match.playerTwoId, {
      ...p2Metrics,
      played: p2Metrics.played + 1,
      setsWon: p2Metrics.setsWon + p2Sets,
      setsLost: p2Metrics.setsLost + p1Sets,
      pointsWon: p2Metrics.pointsWon + p2Points,
      pointsLost: p2Metrics.pointsLost + p1Points,
      gamesWon: p2Metrics.gamesWon + (p2Won ? 1 : 0),
      gamesLost: p2Metrics.gamesLost + (p1Won ? 1 : 0),
      pointsClas: p2Metrics.pointsClas + (p2Won ? 2 : p1Won && !match.walkover ? 1 : 0),
    });
  }

  const rows: StandingRow[] = classifications.map((classification) => ({
    id: classification.id,
    playerId: classification.playerId,
    ...(metrics.get(classification.playerId) ?? emptyMetrics()),
  }));

  return rows.sort(compareStandings).map((row, index) => ({ ...row, position: index + 1 }));
};

/**
 * Criterios de desempate oficiales de tenis de mesa, aplicados en orden:
 * 1. Puntos de clasificación.
 * 2. Diferencia de sets (ganados - perdidos).
 * 3. Diferencia de puntos totales (a favor - en contra).
 */
const compareStandings = (a: StandingRow, b: StandingRow): number => {
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
};
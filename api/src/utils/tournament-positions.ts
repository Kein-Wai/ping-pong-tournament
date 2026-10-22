/** Posición de un jugador dentro de su grupo de la fase de grupos. */
export interface GroupClassificationPosition {
  playerId: string;
  position: number;
}

/** Posición final en el torneo de un jugador eliminado en la fase de grupos. */
export interface EliminatedPlayerPosition {
  playerId: string;
  position: number;
}

/**
 * Calcula la posición final en el torneo de los jugadores que NO avanzan a
 * eliminatorias.
 *
 * Módulo PURO: sin base de datos y sin efectos. La matemática es la oficial
 * de la fase de grupos: el clasificado `n` de un grupo queda en la posición
 * `(n - 1) * grupos + 1` del torneo, de modo que los eliminados de un grupo
 * siempre quedan por detrás de los que avancen de ese mismo grupo.
 */
export const computeEliminatedPositions = (
  groupClassifications: GroupClassificationPosition[],
  advancingPlayerIds: string[],
  numGroups: number,
): EliminatedPlayerPosition[] => {
  const advancing = new Set(advancingPlayerIds);

  return groupClassifications
    .filter((classification) => !advancing.has(classification.playerId))
    .map((classification) => ({
      playerId: classification.playerId,
      position: (classification.position - 1) * numGroups + 1,
    }));
};

/** Datos necesarios para calcular la posición final de un jugador de eliminatorias. */
export interface KnockoutPositionInput {
  /** Ronda en la que se ha eliminado: Final, Semifinales, Cuartos… */
  round: string;
  /** Rango de posiciones de la ronda, p. ej. "3-4". */
  positions: string | null;
  /** true si el jugador ganó su partido. */
  isWinner: boolean;
  /** true si es la segunda llave (llave B). */
  isSecondBracket: boolean;
  /** Número de grupos del torneo. */
  numGroups: number;
  /** Jugadores que avanzan a eliminatorias. */
  playersKnockout: number;
}

/**
 * Posición final del perdedor en cada ronda: el que cae en semifinales es
 * tercero, el que cae en cuartos es quinto, y así hasta la ronda de 128avos.
 */
const LOSER_POSITION_BY_ROUND = new Map<string, number>([
  ['Semifinales', 3],
  ['Cuartos', 5],
  ['Octavos', 9],
  ['R16avos', 17],
  ['R32avos', 33],
  ['R64avos', 65],
  ['R128avos', 129],
]);

/**
 * Calcula la posición final en el torneo de un jugador de eliminatorias.
 *
 * Módulo PURO: sin base de datos y sin efectos. Devuelve 0 cuando el jugador
 * no tiene posición asignada (por ejemplo, el ganador de una ronda que no es
 * la final, porque todavía sigue en el cuadro).
 */
export const computeKnockoutPosition = (input: KnockoutPositionInput): number => {
  const { round, positions, isWinner, isSecondBracket, numGroups, playersKnockout } = input;

  let basePosition = 0;

  if (round === 'Final') {
    if (positions && positions.includes('-')) {
      const [start, end] = positions.split('-');
      basePosition = isWinner ? parseInt(start) : parseInt(end);
    } else {
      basePosition = isWinner ? 1 : 2;
    }
  } else if (!isWinner) {
    basePosition = LOSER_POSITION_BY_ROUND.get(round) ?? 0;
  }

  if (basePosition <= 0) return 0;

  // La segunda llave va detras de la primera: sus posiciones siguen a las de la llave A.
  const offset = isSecondBracket ? numGroups * playersKnockout : 0;

  return basePosition + offset;
};

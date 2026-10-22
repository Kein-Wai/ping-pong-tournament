import { MATCH_MATRIX } from '../constants';

/** La matriz de emparejamientos indexada por numero de jugadores del grupo. */
const MATCH_MATRICES: Record<number, number[][]> = MATCH_MATRIX;

/**
 * Semilla de un jugador para el reparto en grupos: su identificador y el valor
 * por el que se ordena (ELO, ranking manual…).
 */
export interface TournamentSeed {
  id: string; // Puede ser un UUID de base de datos o un ID temporal "excel-1"
  seedValue: number; // El valor para ordenar (ELO, Ranking manual, etc.)
}

/** Enfrentamiento generado dentro de un grupo. */
export interface GroupMatch {
  playerOneId: string;
  playerTwoId: string;
}

/** Grupo con sus jugadores y sus british rounds. */
export interface EngineGroup {
  groupIndex: number;
  players: string[];
  matches: GroupMatch[];
}

/** Ordena a los jugadores de mejor a peor semilla. */
const sortBySeed = (players: TournamentSeed[]): TournamentSeed[] =>
  [...players].sort((a, b) => b.seedValue - a.seedValue);

/**
 * Reparte los jugadores entre los grupos con el algoritmo de la serpiente:
 * el 1º va al grupo 1, el 2º al grupo 2… y al llegar al ultimo grupo la
 * direccion se invierte, de modo que los mejores quedan equidistribuidos.
 */
const distributeInSnake = (sortedPlayers: TournamentSeed[], numGroups: number): string[][] => {
  const groups: string[][] = Array.from({ length: numGroups }, () => []);

  if (numGroups === 1) {
    sortedPlayers.forEach((player) => groups[0].push(player.id));
    return groups;
  }

  let currentGroupIndex = 0;
  let direction = 1;

  for (const player of sortedPlayers) {
    groups[currentGroupIndex].push(player.id);

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

  return groups;
};

/** Genera los british rounds de un grupo a partir de la matriz matematica. */
const buildMatchesForGroup = (groupPlayers: string[]): GroupMatch[] => {
  const matches: GroupMatch[] = [];
  const matrix = MATCH_MATRICES[groupPlayers.length];

  if (!matrix) return matches;

  for (const [p1Index, p2Index] of matrix) {
    const playerOneId = groupPlayers[p1Index - 1];
    const playerTwoId = groupPlayers[p2Index - 1];

    if (playerOneId && playerTwoId) {
      matches.push({ playerOneId, playerTwoId });
    }
  }

  return matches;
};

/**
 * Reparte a los jugadores en grupos y genera los british rounds de cada uno.
 *
 * Modulo PURO: no toca la base de datos ni depende del reloj. Toda la
 * matematica del reparto por serpiente y de los emparejamientos vive aqui,
 * detras de una sola funcion.
 */
export const buildGroupsEngine = (
  players: TournamentSeed[],
  numGroups: number,
): EngineGroup[] => {
  const sortedPlayers = sortBySeed(players);
  const groups = distributeInSnake(sortedPlayers, numGroups);

  return groups.map((groupPlayers, index) => ({
    groupIndex: index + 1,
    players: groupPlayers,
    matches: buildMatchesForGroup(groupPlayers),
  }));
};

import { calculateMatchResults, ScoredMatch } from './match';
import { computeGroupStandings, PlayerStanding } from './group-standings';

/** Partido completado de una liga. */
export type LeagueMatch = ScoredMatch;

type StandingRow = Omit<PlayerStanding, 'position'>;

const setsDiff = (row: StandingRow): number => row.setsWon - row.setsLost;
const pointsDiff = (row: StandingRow): number => row.pointsWon - row.pointsLost;

/** Diferencia de sets y después de puntos, los criterios generales de desempate. */
const compareByDifference = (a: StandingRow, b: StandingRow): number =>
  setsDiff(b) - setsDiff(a) || pointsDiff(b) - pointsDiff(a);

/**
 * Victorias de cada uno de los dos jugadores en los partidos que se han jugado
 * entre ellos (dos como mucho en una liga a ida y vuelta).
 */
const directWins = (a: string, b: string, matches: LeagueMatch[]): [number, number] => {
  let winsA = 0;
  let winsB = 0;
  for (const match of matches) {
    const isPair =
      (match.playerOneId === a && match.playerTwoId === b) ||
      (match.playerOneId === b && match.playerTwoId === a);
    if (!isPair) continue;

    const { p1Sets, p2Sets } = calculateMatchResults(match);
    const winner = p1Sets > p2Sets ? match.playerOneId : p2Sets > p1Sets ? match.playerTwoId : null;
    if (winner === a) winsA++;
    if (winner === b) winsB++;
  }
  return [winsA, winsB];
};

/** Ordena a los jugadores empatados a puntos de clasificación. */
const resolveTie = (tied: StandingRow[], matches: LeagueMatch[]): StandingRow[] => {
  if (tied.length === 2) {
    const [first, second] = tied;
    const [winsFirst, winsSecond] = directWins(first.playerId, second.playerId, matches);
    if (winsFirst !== winsSecond) {
      return winsFirst > winsSecond ? [first, second] : [second, first];
    }
  }
  return [...tied].sort(compareByDifference);
};

/**
 * Calcula la clasificación de una liga a partir de sus partidos completados.
 *
 * Módulo PURO. Reutiliza `computeGroupStandings` para las métricas (2 puntos por
 * ganar, 1 por perder jugando; un W.O. no suma puntos de juego y da 0 al que se
 * retira) y añade el desempate propio de la liga:
 * - Entre dos jugadores: enfrentamiento directo; si no se han enfrentado o
 *   quedó igualado, diferencia de sets y después de puntos.
 * - Entre tres o más: diferencia de sets y después de puntos.
 *
 * Solo deben pasarse partidos completados: un partido sin resultado contaría
 * como jugado.
 */
export const computeLeagueStandings = (
  playerIds: string[],
  matches: LeagueMatch[],
): PlayerStanding[] => {
  const rows: StandingRow[] = computeGroupStandings(
    playerIds.map((playerId) => ({ id: playerId, playerId })),
    matches,
  ).map((entry) => {
    const { position, ...row } = entry;
    return row;
  });

  const tiers = new Map<number, StandingRow[]>();
  for (const row of rows) {
    tiers.set(row.pointsClas, [...(tiers.get(row.pointsClas) ?? []), row]);
  }

  return [...tiers.keys()]
    .sort((a, b) => b - a)
    .flatMap((points) => resolveTie(tiers.get(points) as StandingRow[], matches))
    .map((row, index) => ({ ...row, position: index + 1 }));
};

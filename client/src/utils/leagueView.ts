import type { LeagueMatch } from '../types/league';

/** "Mejor de N sets" a partir de los sets que hay que ganar (1, 2, 3 o 4). */
export const bestOfLabel = (setsToWin: number): string => {
  const total = setsToWin * 2 - 1;
  return `Mejor de ${total} ${total === 1 ? 'set' : 'sets'}`;
};

/** Jornada del calendario con sus partidos. */
export interface LeagueRoundGroup {
  round: number;
  matches: LeagueMatch[];
}

/** Agrupa el calendario por jornada, en orden, y los partidos por su orden dentro de ella. */
export const groupMatchesByRound = (matches: LeagueMatch[]): LeagueRoundGroup[] => {
  const byRound = new Map<number, LeagueMatch[]>();
  for (const match of matches) {
    const round = match.round ?? 0;
    byRound.set(round, [...(byRound.get(round) ?? []), match]);
  }

  return [...byRound.entries()]
    .sort(([a], [b]) => a - b)
    .map(([round, roundMatches]) => ({
      round,
      matches: [...roundMatches].sort((a, b) => (a.matchOrder ?? 0) - (b.matchOrder ?? 0)),
    }));
};

/** Partidos jugados sobre el total que se van a jugar (los cancelados no cuentan). */
export const leagueProgress = (matches: LeagueMatch[]): { played: number; total: number } => {
  const live = matches.filter((match) => match.status !== 'Cancelado');
  return { played: live.filter((match) => match.status === 'Completado').length, total: live.length };
};

const SET_PAIRS = [
  ['setOnePlayerOne', 'setOnePlayerTwo'],
  ['setTwoPlayerOne', 'setTwoPlayerTwo'],
  ['setThreePlayerOne', 'setThreePlayerTwo'],
  ['setFourPlayerOne', 'setFourPlayerTwo'],
  ['setFivePlayerOne', 'setFivePlayerTwo'],
  ['setSixPlayerOne', 'setSixPlayerTwo'],
  ['setSevenPlayerOne', 'setSevenPlayerTwo'],
] as const;

/** Sets ganados por cada jugador ("2 - 1"), "W.O." o "—" si el partido no tiene resultado. */
export const matchSetsSummary = (match: LeagueMatch): string => {
  if (match.status !== 'Completado') return '—';
  if (match.walkover) return 'W.O.';

  let p1 = 0;
  let p2 = 0;
  for (const [one, two] of SET_PAIRS) {
    const s1 = match[one] ?? 0;
    const s2 = match[two] ?? 0;
    if (s1 > s2) p1++;
    else if (s2 > s1) p2++;
  }
  return `${p1} - ${p2}`;
};

/** Nombre y apellido de un jugador, o "Jugador" si no se ha cargado. */
export const playerFullName = (
  player: { name?: string | null; surname?: string | null } | null | undefined,
): string => {
  const full = `${player?.name ?? ''} ${player?.surname ?? ''}`.trim();
  return full || 'Jugador';
};

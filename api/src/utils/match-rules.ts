import { MatchStatus } from '@prisma/client';
import { isValidTableTennisSet } from './match';

/** Incumplimiento de una regla de negocio de un partido. */
export interface MatchRuleIssue {
  path: string[];
  message: string;
}

/** Marcador de los siete sets de un partido. */
export interface MatchScores {
  setOnePlayerOne?: number | null;
  setOnePlayerTwo?: number | null;
  setTwoPlayerOne?: number | null;
  setTwoPlayerTwo?: number | null;
  setThreePlayerOne?: number | null;
  setThreePlayerTwo?: number | null;
  setFourPlayerOne?: number | null;
  setFourPlayerTwo?: number | null;
  setFivePlayerOne?: number | null;
  setFivePlayerTwo?: number | null;
  setSixPlayerOne?: number | null;
  setSixPlayerTwo?: number | null;
  setSevenPlayerOne?: number | null;
  setSevenPlayerTwo?: number | null;
}

/** Los siete sets y como se llaman en el marcador. */
const SET_FIELDS: Array<{ p1: keyof MatchScores; p2: keyof MatchScores; name: string }> = [
  { p1: 'setOnePlayerOne', p2: 'setOnePlayerTwo', name: 'Set 1' },
  { p1: 'setTwoPlayerOne', p2: 'setTwoPlayerTwo', name: 'Set 2' },
  { p1: 'setThreePlayerOne', p2: 'setThreePlayerTwo', name: 'Set 3' },
  { p1: 'setFourPlayerOne', p2: 'setFourPlayerTwo', name: 'Set 4' },
  { p1: 'setFivePlayerOne', p2: 'setFivePlayerTwo', name: 'Set 5' },
  { p1: 'setSixPlayerOne', p2: 'setSixPlayerTwo', name: 'Set 6' },
  { p1: 'setSevenPlayerOne', p2: 'setSevenPlayerTwo', name: 'Set 7' },
];

/** Datos del partido que condicionan sus reglas de negocio. */
export interface MatchRulesInput {
  scores: MatchScores;
  status?: MatchStatus | null;
  setsToWin?: number | null;
}

/**
 * Comprueba las reglas de negocio de un partido: marcador valido en tenis de
 * mesa y sets ganados necesarios para completarlo.
 *
 * Modulo PURO: devuelve la lista de incumplimientos y no produce ningun
 * efecto, de modo que se puede testear sin Zod ni base de datos.
 */
export const validateMatchRules = (input: MatchRulesInput): MatchRuleIssue[] => {
  const issues: MatchRuleIssue[] = [];
  const { scores, status, setsToWin } = input;

  let p1SetsWon = 0;
  let p2SetsWon = 0;

  for (const set of SET_FIELDS) {
    const rawScore1 = scores[set.p1];
    const rawScore2 = scores[set.p2];

    // Ignorar si ambos estan vacios o a 0
    if (
      (rawScore1 === undefined || rawScore1 === null) &&
      (rawScore2 === undefined || rawScore2 === null)
    ) {
      continue;
    }
    if (rawScore1 === 0 && rawScore2 === 0) continue;

    // Falla si uno de los dos no se ha enviado
    if (
      rawScore1 === null ||
      rawScore1 === undefined ||
      rawScore2 === null ||
      rawScore2 === undefined
    ) {
      issues.push({
        path: [rawScore1 === null || rawScore1 === undefined ? set.p1 : set.p2],
        message: `Falta la puntuación del rival en el ${set.name}.`,
      });
      continue;
    }

    const score1 = Number(rawScore1);
    const score2 = Number(rawScore2);

    if (!isValidTableTennisSet(score1, score2)) {
      issues.push({
        path: [set.p1],
        message: `El marcador del ${set.name} (${score1}-${score2}) no es válido en tenis de mesa reglamentario.`,
      });
      continue;
    }

    if (score1 > score2) p1SetsWon++;
    else if (score2 > score1) p2SetsWon++;
  }

  if (status === MatchStatus.Completado && setsToWin) {
    const winnerReachedTarget = p1SetsWon === setsToWin || p2SetsWon === setsToWin;

    if (!winnerReachedTarget) {
      issues.push({
        path: ['status'],
        message: `Para completar el partido, uno de los dos jugadores debe ganar exactamente ${setsToWin} sets (Actual: ${p1SetsWon}-${p2SetsWon}).`,
      });
    }
  }

  return issues;
};

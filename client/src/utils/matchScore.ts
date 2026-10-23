import { isValidTableTennisSet } from './matchValidation';
import type { MatchToEdit } from '../types/tournament';

/**
 * Calculo de los sets ganados por cada jugador de un partido en edicion.
 *
 * Antes estaba duplicado: `matchScoreStats` (un useMemo) y
 * `checkMatchStatusOnInput` (una funcion) hacian exactamente el mismo
 * recorrido de los sets. Ahora hay una sola fuente, y como es una funcion pura
 * se puede probar sin renderizar nada.
 */

/** Resultado del calculo de sets. */
export interface MatchScore {
  /** Sets ganados por el jugador 1. */
  p1Sets: number;
  /** Sets ganados por el jugador 2. */
  p2Sets: number;
  /** Si algun jugador ya ha alcanzado los sets necesarios. */
  isValidToComplete: boolean;
}

/** Los siete sets posibles de un partido, en orden. */
const setsOf = (match: MatchToEdit): Array<[number, number]> => [
  [Number(match.set1P1), Number(match.set1P2)],
  [Number(match.set2P1), Number(match.set2P2)],
  [Number(match.set3P1), Number(match.set3P2)],
  [Number(match.set4P1), Number(match.set4P2)],
  [Number(match.set5P1), Number(match.set5P2)],
  [Number(match.set6P1), Number(match.set6P2)],
  [Number(match.set7P1), Number(match.set7P2)],
];

/**
 * Cuenta los sets ganados por cada jugador en un partido en edicion.
 *
 * Solo cuenta los sets que son validos segun las reglas del tenis de mesa
 * (no empates y marcadores imposibles).
 */
export const calculateMatchScore = (match: MatchToEdit): MatchScore => {
  let p1Sets = 0;
  let p2Sets = 0;

  for (const [s1, s2] of setsOf(match)) {
    if (!isValidTableTennisSet(s1, s2)) continue;
    if (s1 > s2) p1Sets++;
    else p2Sets++;
  }

  return {
    p1Sets,
    p2Sets,
    isValidToComplete: p1Sets === match.setsToWin || p2Sets === match.setsToWin,
  };
};

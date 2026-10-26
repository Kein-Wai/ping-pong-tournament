import { useMemo } from 'react';
import { calculateMatchScore, type MatchScore } from '../utils/matchScore';
import type { MatchToEdit } from '../types/tournament';

/**
 * Hook que calcula los sets ganados por cada jugador y si el partido
 * puede completarse, memoizando el resultado para evitar recálculos.
 *
 * Envuelve la función pura `calculateMatchScore` en un `useMemo`,
 * reemplazando el antiguo `matchScoreStats` duplicado en el padre.
 */
export function useMatchScore(match: MatchToEdit | null): MatchScore {
  return useMemo(() => {
    if (!match) return { p1Sets: 0, p2Sets: 0, isValidToComplete: false };
    return calculateMatchScore(match);
  }, [match]);
}

export default useMatchScore;
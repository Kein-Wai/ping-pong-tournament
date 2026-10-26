export const isValidTableTennisSet = (score1: number, score2: number): boolean => {
  if (score1 === 0 && score2 === 0) return false;

  const max = Math.max(score1, score2);
  const min = Math.min(score1, score2);
  const diff = max - min;

  // No se puede ganar con menos de 11 puntos
  if (max < 11) return false;

  // Si se gana con 11 puntos, el rival debe tener 9 o menos
  if (max === 11) return min <= 9;

  // Si se pasa de 11 puntos, la diferencia DEBE SER EXACTAMENTE 2
  return diff === 2;
};

import type { MatchStatus } from '@prisma/client';

/**
 * Marcador de un partido: los siete sets jugados y sus dos participantes.
 * Los sets no jugados llegan como null (o directamente ausentes).
 */
export interface ScoredMatch {
  playerOneId: string;
  playerTwoId: string;
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

/** Resultado agregado de un partido. */
export interface MatchResults {
  p1Sets: number;
  p2Sets: number;
  p1Points: number;
  p2Points: number;
  p1WinsMatch: boolean;
  p2WinsMatch: boolean;
}

/**
 * Partido completo: su marcador mas los metadatos que necesita el calculo de
 * estadisticas (identificador, estado y temporada).
 */
export interface CompletedMatch extends ScoredMatch {
  id: string;
  status: MatchStatus | null;
  seasonId: string | null;
}

export const calculateMatchResults = (match: ScoredMatch): MatchResults => {
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

  for (const [s1, s2] of sets) {
    const score1 = Number(s1 || 0);
    const score2 = Number(s2 || 0);

    if (score1 === 0 && score2 === 0) continue;

    p1Points += score1;
    p2Points += score2;

    if (score1 > score2) p1Sets++;
    else if (score2 > score1) p2Sets++;
  }

  const p1WinsMatch = p1Sets > p2Sets;
  const p2WinsMatch = p2Sets > p1Sets;

  return {
    p1Sets,
    p2Sets,
    p1Points,
    p2Points,
    p1WinsMatch,
    p2WinsMatch,
  };
};

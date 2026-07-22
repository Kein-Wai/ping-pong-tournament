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

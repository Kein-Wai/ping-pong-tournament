const recordKey = (userId: string, gameId: string) => `reflejo:${userId}:${gameId}`;

/**
 * Mejor resultado guardado del jugador en un juego, o null si aún no ha jugado.
 * Un valor corrupto o un almacenamiento bloqueado (ventana privada) cuentan como sin récord:
 * el juego debe seguir funcionando aunque no pueda recordar nada.
 */
export function getRecord(userId: string, gameId: string): number | null {
  try {
    const stored = localStorage.getItem(recordKey(userId, gameId));
    // Number('') es 0: un valor vacío no puede pasar por un récord de 0.
    if (stored === null || stored.trim() === '') return null;
    const value = Number(stored);
    return Number.isFinite(value) ? value : null;
  } catch {
    return null;
  }
}

export type RecordDirection = 'higher' | 'lower';

export interface SaveResult {
  isNewRecord: boolean;
  record: number;
}

/** Guarda el resultado solo si mejora el récord; `direction` dice si mejor es mayor o menor. */
export function saveIfBetter(
  userId: string,
  gameId: string,
  score: number,
  direction: RecordDirection
): SaveResult {
  const current = getRecord(userId, gameId);
  const beatsCurrent =
    current === null || (direction === 'higher' ? score > current : score < current);
  if (!beatsCurrent) return { isNewRecord: false, record: current };

  try {
    localStorage.setItem(recordKey(userId, gameId), String(score));
  } catch {
    // Sin almacenamiento el resultado se muestra igual, pero no se recordará.
  }
  return { isNewRecord: true, record: score };
}

/** Segundos que quedan de una partida de duración fija, redondeados hacia arriba y sin bajar de 0. */
export function remainingSecOf(startedAt: number, durationMs: number, now: number): number {
  return Math.max(0, Math.ceil((durationMs - (now - startedAt)) / 1000));
}

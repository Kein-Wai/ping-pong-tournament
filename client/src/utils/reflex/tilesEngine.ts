export const TILE_COUNT = 16;
export const GAME_DURATION_MS = 30_000;
/** Pausa entre que una teja se apaga y se enciende la siguiente. */
export const GAP_MS = 250;

const INITIAL_LIT_MS = 1200;
const LIT_STEP_MS = 40;
const MIN_LIT_MS = 400;

export interface TilesState {
  startedAt: number;
  hits: number;
  misses: number;
  /** Teja encendida ahora, o null durante la pausa. */
  litTile: number | null;
  /** Instante en que se apaga la teja encendida (sin acierto, cuenta como fallo). */
  litUntil: number;
  /** Instante en que se enciende la siguiente teja. */
  nextLitAt: number;
  lastTile: number | null;
}

/** Tiempo que dura encendida una teja: baja con cada acierto hasta un mínimo. */
export function litDurationMs(hits: number): number {
  return Math.max(MIN_LIT_MS, INITIAL_LIT_MS - LIT_STEP_MS * hits);
}

export function createTilesGame(now: number): TilesState {
  return {
    startedAt: now,
    hits: 0,
    misses: 0,
    litTile: null,
    litUntil: 0,
    nextLitAt: now + GAP_MS,
    lastTile: null,
  };
}

/** Puntuación de la partida: cada fallo resta un acierto, para que pulsar a ciegas no compense. */
export function scoreOf(state: TilesState): number {
  return Math.max(0, state.hits - state.misses);
}

export function isTilesOver(state: TilesState, now: number): boolean {
  return now - state.startedAt >= GAME_DURATION_MS;
}

/** Elige una teja distinta de la anterior; `random` devuelve un número en [0, 1). */
function pickTile(lastTile: number | null, random: () => number): number {
  const tile = Math.floor(random() * (TILE_COUNT - 1));
  // Saltar la anterior reparte por igual entre las otras 15 sin construir una lista.
  return lastTile !== null && tile >= lastTile ? tile + 1 : tile;
}

/** Apaga la teja cuyo tiempo se agotó: sin acierto, cuenta como fallo. */
function expireLitTile(state: TilesState, now: number): TilesState {
  if (state.litTile === null || now < state.litUntil) return state;
  return { ...state, misses: state.misses + 1, litTile: null, nextLitAt: now + GAP_MS };
}

/**
 * Avanza el reloj de la partida: apaga la teja que se agotó (fallo) y enciende la
 * siguiente cuando toca. No hace nada una vez terminada la partida.
 */
export function advance(state: TilesState, now: number, random: () => number): TilesState {
  if (isTilesOver(state, now)) return state;

  let next = expireLitTile(state, now);
  if (next.litTile === null && now >= next.nextLitAt) {
    const litTile = pickTile(next.lastTile, random);
    next = {
      ...next,
      litTile,
      litUntil: now + litDurationMs(next.hits),
      lastTile: litTile,
    };
  }
  return next;
}

/** Un toque acierta si es en la teja encendida; en cualquier otra teja es un fallo. */
export function tapTile(state: TilesState, tile: number, now: number): TilesState {
  if (isTilesOver(state, now)) return state;

  // Un toque tras caducar la teja no es acierto, aunque el reloj aún no haya avanzado.
  const current = expireLitTile(state, now);
  if (current.litTile === tile) {
    return { ...current, hits: current.hits + 1, litTile: null, nextLitAt: now + GAP_MS };
  }
  return { ...current, misses: current.misses + 1 };
}

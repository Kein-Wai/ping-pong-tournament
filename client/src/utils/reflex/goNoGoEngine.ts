export const CELL_COUNT = 9;
export const GAME_DURATION_MS = 30_000;
/** Pausa entre que un círculo desaparece y aparece el siguiente. */
export const GAP_MS = 300;

const GO_PROBABILITY = 0.7;
const INITIAL_VISIBLE_MS = 1000;
const VISIBLE_STEP_MS = 20;
const MIN_VISIBLE_MS = 500;

export type CircleColor = 'go' | 'nogo';

export interface GoNoGoState {
  startedAt: number;
  /** Verdes tocados. */
  hits: number;
  /** Rojos tocados. */
  wrongTaps: number;
  /** Verdes que se agotaron sin tocarlos. */
  missed: number;
  /** Círculos mostrados hasta ahora: cada uno dura menos que el anterior. */
  shown: number;
  /** Casilla del círculo visible, o null durante la pausa. */
  cell: number | null;
  color: CircleColor | null;
  visibleUntil: number;
  nextAt: number;
  lastCell: number | null;
}

/** Tiempo que dura un círculo, sabiendo cuántos se han mostrado ya: baja hasta un mínimo. */
export function visibleMsOf(shown: number): number {
  return Math.max(MIN_VISIBLE_MS, INITIAL_VISIBLE_MS - VISIBLE_STEP_MS * shown);
}

export function createGoNoGoGame(now: number): GoNoGoState {
  return {
    startedAt: now,
    hits: 0,
    wrongTaps: 0,
    missed: 0,
    shown: 0,
    cell: null,
    color: null,
    visibleUntil: 0,
    nextAt: now + GAP_MS,
    lastCell: null,
  };
}

/** Puntuación: aciertos menos errores y verdes perdidos, con mínimo 0. */
export function scoreOf(state: GoNoGoState): number {
  return Math.max(0, state.hits - state.wrongTaps - state.missed);
}

export function isGoNoGoOver(state: GoNoGoState, now: number): boolean {
  return now - state.startedAt >= GAME_DURATION_MS;
}

/** Elige una casilla distinta de la anterior; `random` devuelve un número en [0, 1). */
function pickCell(lastCell: number | null, random: () => number): number {
  const cell = Math.floor(random() * (CELL_COUNT - 1));
  // Saltar la anterior reparte por igual entre las otras 8 sin construir una lista.
  return lastCell !== null && cell >= lastCell ? cell + 1 : cell;
}

/** Retira el círculo cuyo tiempo se agotó: un verde perdido resta, un rojo ignorado es lo correcto. */
function expireCircle(state: GoNoGoState, now: number): GoNoGoState {
  if (state.cell === null || now < state.visibleUntil) return state;
  return {
    ...state,
    missed: state.color === 'go' ? state.missed + 1 : state.missed,
    cell: null,
    color: null,
    nextAt: now + GAP_MS,
  };
}

/** Avanza el reloj: retira el círculo agotado y muestra el siguiente cuando toca. */
export function advance(state: GoNoGoState, now: number, random: () => number): GoNoGoState {
  if (isGoNoGoOver(state, now)) return state;

  const current = expireCircle(state, now);
  if (current.cell !== null || now < current.nextAt) return current;

  const color: CircleColor = random() < GO_PROBABILITY ? 'go' : 'nogo';
  const cell = pickCell(current.lastCell, random);
  return {
    ...current,
    cell,
    color,
    visibleUntil: now + visibleMsOf(current.shown),
    shown: current.shown + 1,
    lastCell: cell,
  };
}

/** Solo cuenta tocar el círculo visible; una casilla vacía no hace nada. */
export function tapCell(state: GoNoGoState, cell: number, now: number): GoNoGoState {
  if (isGoNoGoOver(state, now)) return state;

  const current = expireCircle(state, now);
  if (current.cell !== cell) return current;

  return {
    ...current,
    hits: current.color === 'go' ? current.hits + 1 : current.hits,
    wrongTaps: current.color === 'nogo' ? current.wrongTaps + 1 : current.wrongTaps,
    cell: null,
    color: null,
    nextAt: now + GAP_MS,
  };
}

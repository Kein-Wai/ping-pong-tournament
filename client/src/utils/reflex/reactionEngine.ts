export const ATTEMPTS = 5;
export const MIN_WAIT_MS = 1000;
export const MAX_WAIT_MS = 4000;
/** Si pasa este tiempo desde la señal sin tocar, el intento acaba y cuenta este valor. */
export const TIMEOUT_MS = 1500;
/** Tiempo que se muestra el resultado de un intento antes de empezar el siguiente. */
export const PAUSE_MS = 1000;

export type ReactionPhase = 'waiting' | 'go' | 'shown' | 'done';
export type ReactionOutcome = 'reaction' | 'too-slow' | 'false-start';

export interface ReactionState {
  phase: ReactionPhase;
  /** Intento en curso, empezando en 1. Una salida en falso no lo avanza. */
  attempt: number;
  /** Milisegundos de reacción de los intentos ya completados. */
  times: number[];
  /** Instante en que aparece la señal. */
  goAt: number;
  /** Instante en que termina la pausa que muestra el resultado. */
  resumeAt: number;
  outcome: ReactionOutcome | null;
  lastMs: number | null;
}

/** Espera aleatoria entre MIN_WAIT_MS y MAX_WAIT_MS; `random` devuelve un número en [0, 1). */
export function waitMsOf(random: () => number): number {
  return MIN_WAIT_MS + Math.floor(random() * (MAX_WAIT_MS - MIN_WAIT_MS));
}

export function averageMs(times: number[]): number {
  if (times.length === 0) return 0;
  return Math.round(times.reduce((sum, time) => sum + time, 0) / times.length);
}

export function createReactionGame(now: number, random: () => number): ReactionState {
  return {
    phase: 'waiting',
    attempt: 1,
    times: [],
    goAt: now + waitMsOf(random),
    resumeAt: 0,
    outcome: null,
    lastMs: null,
  };
}

function showResult(
  state: ReactionState,
  outcome: ReactionOutcome,
  ms: number | null,
  now: number
): ReactionState {
  return {
    ...state,
    phase: 'shown',
    outcome,
    lastMs: ms,
    times: ms === null ? state.times : [...state.times, ms],
    resumeAt: now + PAUSE_MS,
  };
}

/** Avanza el reloj: da la señal, agota el intento o pasa al siguiente tras la pausa. */
export function advance(state: ReactionState, now: number, random: () => number): ReactionState {
  if (state.phase === 'waiting' && now >= state.goAt) return { ...state, phase: 'go' };

  if (state.phase === 'go' && now >= state.goAt + TIMEOUT_MS) {
    return showResult(state, 'too-slow', TIMEOUT_MS, now);
  }

  if (state.phase === 'shown' && now >= state.resumeAt) {
    const repeats = state.outcome === 'false-start';
    if (!repeats && state.times.length >= ATTEMPTS) return { ...state, phase: 'done' };
    return {
      ...state,
      phase: 'waiting',
      attempt: repeats ? state.attempt : state.attempt + 1,
      goAt: now + waitMsOf(random),
      outcome: null,
      lastMs: null,
    };
  }

  return state;
}

/** Un toque antes de la señal es salida en falso; durante la señal mide la reacción. */
export function tap(state: ReactionState, now: number, random: () => number): ReactionState {
  // Si el reloj aún no había dado la señal pero ya tocaba, el toque cuenta como reacción.
  const current = advance(state, now, random);

  if (current.phase === 'waiting') return showResult(current, 'false-start', null, now);
  if (current.phase === 'go') return showResult(current, 'reaction', now - current.goAt, now);
  return current;
}

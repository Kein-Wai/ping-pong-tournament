import type { WarmupExerciseKey } from '../constants/warmupExercises';

export interface WarmupItem {
  exerciseKey: WarmupExerciseKey;
  durationSec: number;
  restSec: number;
}

export type WarmupPhase = 'countdown' | 'rest' | 'exercise' | 'finished';

export interface WarmupState {
  items: WarmupItem[];
  phase: WarmupPhase;
  index: number;
  paused: boolean;
  /** El jugador pulsó «Esperar»: el descanso no termina sola hasta «Ya estoy listo». */
  waiting: boolean;
  /** Tiempo que quedaba en la fase actual en el instante `anchorAt`. */
  remainingMs: number;
  anchorAt: number;
}

export interface WarmupView {
  phase: WarmupPhase;
  index: number;
  remainingSec: number;
  totalRemainingSec: number;
  paused: boolean;
  waiting: boolean;
}

export const COUNTDOWN_SEC = 5;
const COUNTDOWN_MS = COUNTDOWN_SEC * 1000;

/** Arranca la sesión en la cuenta atrás inicial que sigue a «Preparado». */
export function startSession(items: WarmupItem[], now: number): WarmupState {
  return {
    items,
    phase: 'countdown',
    index: 0,
    paused: false,
    waiting: false,
    remainingMs: COUNTDOWN_MS,
    anchorAt: now,
  };
}

function isFrozen(state: WarmupState): boolean {
  return state.paused || state.waiting;
}

function getRemainingMs(state: WarmupState, now: number): number {
  return isFrozen(state) ? state.remainingMs : state.remainingMs - (now - state.anchorAt);
}

function enterPhase(
  state: WarmupState,
  phase: WarmupPhase,
  index: number,
  remainingMs: number,
  anchorAt: number,
): WarmupState {
  return { ...state, phase, index, remainingMs, anchorAt };
}

/**
 * Aplica el paso del tiempo y encadena las fases que ya hayan terminado. El
 * sobrante de cada fase se arrastra a la siguiente: así un salto grande de reloj
 * (pestaña en segundo plano) cae en la fase correcta de una vez.
 */
export function advance(state: WarmupState, now: number): WarmupState {
  let current = state;
  let remainingMs = getRemainingMs(current, now);

  while (!isFrozen(current) && current.phase !== 'finished' && remainingMs <= 0) {
    const endedAt = current.anchorAt + current.remainingMs;
    const { items, index } = current;

    if (current.phase === 'countdown' && items.length > 0) {
      current = enterPhase(current, 'rest', 0, items[0].restSec * 1000, endedAt);
    } else if (current.phase === 'rest') {
      current = enterPhase(current, 'exercise', index, items[index].durationSec * 1000, endedAt);
    } else if (current.phase === 'exercise' && index + 1 < items.length) {
      current = enterPhase(current, 'rest', index + 1, items[index + 1].restSec * 1000, endedAt);
    } else {
      current = enterPhase(current, 'finished', index, 0, endedAt);
    }
    remainingMs = getRemainingMs(current, now);
  }

  return current;
}

/** Congela el tiempo en la fase actual. No hace nada si ya estaba en pausa o la sesión terminó. */
export function pause(rawState: WarmupState, now: number): WarmupState {
  const state = advance(rawState, now);
  if (state.paused || state.phase === 'finished') return state;
  return { ...state, paused: true, remainingMs: getRemainingMs(state, now), anchorAt: now };
}

export function resume(state: WarmupState, now: number): WarmupState {
  if (!state.paused) return state;
  return { ...state, paused: false, anchorAt: now };
}

/** «Esperar»: detiene el descanso hasta que el jugador diga que está listo (p. ej. buscando mesa). */
export function holdRest(rawState: WarmupState, now: number): WarmupState {
  const state = advance(rawState, now);
  if (state.phase !== 'rest' || state.waiting) return state;
  return { ...state, waiting: true, remainingMs: getRemainingMs(state, now), anchorAt: now };
}

/** «Ya estoy listo»: salta lo que quede del descanso y empieza el ejercicio. */
export function skipRest(rawState: WarmupState, now: number): WarmupState {
  const state = advance(rawState, now);
  if (state.phase !== 'rest') return state;
  const durationMs = state.items[state.index].durationSec * 1000;
  return { ...enterPhase(state, 'exercise', state.index, durationMs, now), waiting: false };
}

/** «Terminar»: cierra la sesión desde cualquier fase. */
export function finish(rawState: WarmupState, now: number): WarmupState {
  const state = advance(rawState, now);
  return { ...enterPhase(state, 'finished', state.index, 0, now), paused: false, waiting: false };
}

function jumpToRest(state: WarmupState, index: number, now: number): WarmupState {
  if (index >= state.items.length) return finish(state, now);
  const restMs = state.items[index].restSec * 1000;
  return { ...enterPhase(state, 'rest', index, restMs, now), waiting: false };
}

/** Salta al descanso del ejercicio siguiente (o al final si era el último). */
export function next(rawState: WarmupState, now: number): WarmupState {
  const state = advance(rawState, now);
  if (state.phase === 'finished') return state;
  return jumpToRest(state, state.phase === 'countdown' ? 0 : state.index + 1, now);
}

/** Vuelve al descanso del ejercicio anterior; en el primero reinicia su descanso. */
export function previous(rawState: WarmupState, now: number): WarmupState {
  const state = advance(rawState, now);
  if (state.phase === 'finished' || state.phase === 'countdown') return state;
  return jumpToRest(state, Math.max(0, state.index - 1), now);
}

/** Tiempo de las fases que aún no han empezado, sin contar la actual. */
function getPendingMs(state: WarmupState): number {
  const { items, phase, index } = state;
  if (phase === 'finished') return 0;
  const firstPendingItem = phase === 'countdown' ? 0 : index + 1;
  const laterItemsMs = items
    .slice(firstPendingItem)
    .reduce((total, item) => total + (item.restSec + item.durationSec) * 1000, 0);
  const ownExerciseMs = phase === 'rest' ? items[index].durationSec * 1000 : 0;
  return laterItemsMs + ownExerciseMs;
}

export function getView(rawState: WarmupState, now: number): WarmupView {
  const state = advance(rawState, now);
  const remainingMs = getRemainingMs(state, now);
  return {
    phase: state.phase,
    index: state.index,
    remainingSec: Math.max(0, Math.ceil(remainingMs / 1000)),
    totalRemainingSec: Math.max(0, Math.ceil((remainingMs + getPendingMs(state)) / 1000)),
    paused: state.paused,
    waiting: state.waiting,
  };
}

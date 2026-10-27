export const BALLS = 10;
/** Tiempo que se muestra el resultado de una pelota antes de lanzar la siguiente. */
export const PAUSE_MS = 1000;

const FIRST_FLIGHT_MS = 1800;
const FLIGHT_STEP_MS = 120;
const MIN_FLIGHT_MS = 700;
/** Pasado este margen tras el impacto sin tocar, la pelota se da por perdida. */
const LATE_LIMIT_MS = 350;

export type ShotQuality = 'perfect' | 'good' | 'early' | 'late' | 'too-early' | 'too-late';

export interface ShotResult {
  /** Negativo si se tocó antes del impacto y positivo si después; null si no se tocó. */
  deviationMs: number | null;
  quality: ShotQuality;
  points: number;
}

export type TimingPhase = 'flying' | 'shown' | 'done';

export interface TimingState {
  phase: TimingPhase;
  /** Pelota en curso, empezando en 1. */
  ball: number;
  launchAt: number;
  /** Instante en que la pelota vuelve a la raqueta: el golpe perfecto es tocar justo entonces. */
  impactAt: number;
  /** Instante en que termina la pausa que muestra el resultado. */
  resumeAt: number;
  results: ShotResult[];
}

/** Tiempo de vuelo de una pelota (empezando en 0): cada una tarda menos que la anterior. */
export function flightMsOf(index: number): number {
  return Math.max(MIN_FLIGHT_MS, FIRST_FLIGHT_MS - FLIGHT_STEP_MS * index);
}

/** Califica un golpe según su desviación respecto al impacto: negativa es pronto, positiva tarde. */
export function evaluateShot(deviationMs: number): Pick<ShotResult, 'quality' | 'points'> {
  const distance = Math.abs(deviationMs);
  const side = deviationMs < 0 ? 'early' : 'late';

  if (distance <= 40) return { quality: 'perfect', points: 10 };
  if (distance <= 100) return { quality: 'good', points: 6 };
  if (distance <= 200) return { quality: side, points: 3 };
  if (distance <= LATE_LIMIT_MS) return { quality: side, points: 1 };
  return { quality: deviationMs < 0 ? 'too-early' : 'too-late', points: 0 };
}

/** Desviación media sin signo de los golpes dados, o null si no hubo ninguno. */
export function averageDeviationMs(results: Pick<ShotResult, 'deviationMs'>[]): number | null {
  const deviations = results.flatMap((result) =>
    result.deviationMs === null ? [] : [Math.abs(result.deviationMs)]
  );
  if (deviations.length === 0) return null;
  return Math.round(deviations.reduce((sum, value) => sum + value, 0) / deviations.length);
}

export function scoreOf(state: TimingState): number {
  return state.results.reduce((sum, result) => sum + result.points, 0);
}

function launch(state: TimingState, ball: number, now: number): TimingState {
  return {
    ...state,
    phase: 'flying',
    ball,
    launchAt: now,
    impactAt: now + flightMsOf(ball - 1),
  };
}

export function createTimingGame(now: number): TimingState {
  return launch(
    { phase: 'flying', ball: 1, launchAt: 0, impactAt: 0, resumeAt: 0, results: [] },
    1,
    now
  );
}

function showResult(state: TimingState, result: ShotResult, now: number): TimingState {
  return { ...state, phase: 'shown', results: [...state.results, result], resumeAt: now + PAUSE_MS };
}

/** Avanza el reloj: da la pelota por perdida si no se tocó, o lanza la siguiente tras la pausa. */
export function advance(state: TimingState, now: number): TimingState {
  if (state.phase === 'flying' && now > state.impactAt + LATE_LIMIT_MS) {
    return showResult(state, { deviationMs: null, quality: 'too-late', points: 0 }, now);
  }

  if (state.phase === 'shown' && now >= state.resumeAt) {
    if (state.results.length >= BALLS) return { ...state, phase: 'done' };
    return launch(state, state.ball + 1, now);
  }

  return state;
}

/** El primer toque de cada pelota la resuelve; los demás se ignoran hasta la siguiente. */
export function tap(state: TimingState, now: number): TimingState {
  if (state.phase !== 'flying') return state;

  const deviationMs = now - state.impactAt;
  return showResult(state, { deviationMs, ...evaluateShot(deviationMs) }, now);
}

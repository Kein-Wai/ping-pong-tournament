import type { WarmupView } from './warmupEngine';

export type WarmupCue = 'tick' | 'exercise-start' | 'rest-start' | 'finish';

const TICK_FROM_SEC = 3;

// Entrar en la cuenta atrás solo ocurre al arrancar, y eso ya lo marca el botón «Preparado».
const PHASE_CUES: Record<WarmupView['phase'], WarmupCue[]> = {
  countdown: [],
  rest: ['rest-start'],
  exercise: ['exercise-start'],
  finished: ['finish'],
};

/**
 * Avisos que corresponden al paso de una vista a la siguiente. La vista se
 * refresca varias veces por segundo, así que cada aviso sale solo en el cambio
 * que lo provoca y no en cada refresco.
 */
export function getCues(previous: WarmupView | null, current: WarmupView): WarmupCue[] {
  if (!previous || current.paused || current.waiting) return [];

  if (previous.phase !== current.phase || previous.index !== current.index) {
    return PHASE_CUES[current.phase];
  }

  const secondChanged = current.remainingSec !== previous.remainingSec;
  if (secondChanged && current.remainingSec >= 1 && current.remainingSec <= TICK_FROM_SEC) return ['tick'];

  return [];
}

import type { WarmupCue } from './warmupCues';
import {
  FINISH_FEEDBACK,
  createFeedbackSound,
  type CueFeedback,
  type FeedbackSound,
} from './feedbackSound';

// Tono distinto por tipo de aviso para que se reconozca sin mirar la pantalla:
// tic corto, inicio de ejercicio largo y agudo, descanso grave y doble, final en tres notas.
const CUE_FEEDBACK: Record<WarmupCue, CueFeedback> = {
  tick: { beeps: [{ frequencyHz: 880, atSec: 0, durationSec: 0.08 }], vibration: 30 },
  'exercise-start': { beeps: [{ frequencyHz: 1320, atSec: 0, durationSec: 0.4 }], vibration: 200 },
  'rest-start': {
    beeps: [
      { frequencyHz: 440, atSec: 0, durationSec: 0.15 },
      { frequencyHz: 440, atSec: 0.25, durationSec: 0.15 },
    ],
    vibration: [80, 60, 80],
  },
  finish: FINISH_FEEDBACK,
};

export type WarmupSound = FeedbackSound<WarmupCue>;

export function createWarmupSound(): WarmupSound {
  return createFeedbackSound(CUE_FEEDBACK);
}

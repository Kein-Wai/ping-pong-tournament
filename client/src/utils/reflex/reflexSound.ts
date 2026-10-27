import {
  FINISH_FEEDBACK,
  createFeedbackSound,
  type CueFeedback,
  type FeedbackSound,
} from '../feedbackSound';

export type ReflexCue = 'tick' | 'go' | 'hit' | 'miss' | 'finish';

// Tonos distintos para saber si has acertado sin mirar: acierto corto y agudo, fallo grave y largo.
const REFLEX_FEEDBACK: Record<ReflexCue, CueFeedback> = {
  tick: { beeps: [{ frequencyHz: 660, atSec: 0, durationSec: 0.1 }], vibration: 30 },
  go: { beeps: [{ frequencyHz: 1320, atSec: 0, durationSec: 0.35 }], vibration: 150 },
  hit: { beeps: [{ frequencyHz: 1040, atSec: 0, durationSec: 0.06 }], vibration: 20 },
  miss: { beeps: [{ frequencyHz: 180, atSec: 0, durationSec: 0.18 }], vibration: [60, 40, 60] },
  finish: FINISH_FEEDBACK,
};

export type ReflexSound = FeedbackSound<ReflexCue>;

export function createReflexSound(): ReflexSound {
  return createFeedbackSound(REFLEX_FEEDBACK);
}

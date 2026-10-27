type AudioContextConstructor = typeof AudioContext;

export interface Beep {
  frequencyHz: number;
  /** Retraso respecto al instante del aviso, en segundos. */
  atSec: number;
  durationSec: number;
}

export interface CueFeedback {
  beeps: Beep[];
  vibration: number | number[];
}

/** Tres notas ascendentes: el mismo aviso de final en todas las funcionalidades. */
export const FINISH_FEEDBACK: CueFeedback = {
  beeps: [
    { frequencyHz: 660, atSec: 0, durationSec: 0.2 },
    { frequencyHz: 880, atSec: 0.3, durationSec: 0.2 },
    { frequencyHz: 1320, atSec: 0.6, durationSec: 0.5 },
  ],
  vibration: [200, 100, 200, 100, 400],
};

/** Safari antiguo solo expone `webkitAudioContext`. */
function getAudioContextConstructor(): AudioContextConstructor | undefined {
  const legacy = window as unknown as { webkitAudioContext?: AudioContextConstructor };
  return window.AudioContext ?? legacy.webkitAudioContext;
}

function playBeep(context: AudioContext, beep: Beep): void {
  const oscillator = context.createOscillator();
  const gain = context.createGain();
  const startAt = context.currentTime + beep.atSec;

  oscillator.type = 'sine';
  oscillator.frequency.value = beep.frequencyHz;
  // Subida y bajada rápidas del volumen: sin ellas el pitido produce un chasquido.
  gain.gain.setValueAtTime(0.0001, startAt);
  gain.gain.exponentialRampToValueAtTime(0.4, startAt + 0.01);
  gain.gain.exponentialRampToValueAtTime(0.0001, startAt + beep.durationSec);
  oscillator.connect(gain);
  gain.connect(context.destination);
  oscillator.start(startAt);
  oscillator.stop(startAt + beep.durationSec + 0.02);
}

export interface FeedbackSound<Cue extends string> {
  /** Debe llamarse dentro de un gesto del usuario: los navegadores no dejan sonar antes. */
  unlock: () => void;
  /** Reanuda el audio si el sistema lo suspendió (p. ej. al volver de segundo plano en iOS). */
  resume: () => void;
  play: (cue: Cue) => void;
  dispose: () => void;
}

/** Reproductor de pitidos y vibración para una tabla de avisos propia de cada funcionalidad. */
export function createFeedbackSound<Cue extends string>(
  feedback: Record<Cue, CueFeedback>
): FeedbackSound<Cue> {
  let context: AudioContext | null = null;

  const resume = () => {
    if (context && context.state !== 'running') void context.resume();
  };

  const unlock = () => {
    if (!context) {
      const Constructor = getAudioContextConstructor();
      if (!Constructor) return;
      context = new Constructor();
    }
    resume();
  };

  const play = (cue: Cue) => {
    const { beeps, vibration } = feedback[cue];
    const audio = context;
    if (audio) beeps.forEach((beep) => playBeep(audio, beep));
    navigator.vibrate?.(vibration);
  };

  const dispose = () => {
    void context?.close();
    context = null;
  };

  return { unlock, resume, play, dispose };
}

import type { ReflexCue } from '../utils/reflex/reflexSound';

/** Contrato común de un juego de reflejo: recibe dos avisos y devuelve su puntuación al terminar. */
export interface ReflexGameProps {
  onFinish: (score: number, detail?: string) => void;
  onCue: (cue: ReflexCue) => void;
}

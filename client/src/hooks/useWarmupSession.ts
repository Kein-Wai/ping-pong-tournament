import { useEffect, useState } from 'react';
import {
  finish as finishSession,
  getView,
  holdCourtesy,
  next as nextExercise,
  pause as pauseSession,
  previous as previousExercise,
  resume as resumeSession,
  skipCourtesy,
  startSession,
  type WarmupItem,
  type WarmupState,
} from '../utils/warmupEngine';

// Frecuencia con la que se refresca la vista. El tiempo real sale de Date.now(),
// no de contar ticks, así que un intervalo frenado por el navegador no desvía la cuenta.
const TICK_MS = 250;

export function useWarmupSession(items: WarmupItem[]) {
  const [state, setState] = useState<WarmupState | null>(null);
  const [now, setNow] = useState(() => Date.now());

  const view = state ? getView(state, now) : null;
  const isRunning = view !== null && view.phase !== 'finished';

  useEffect(() => {
    if (!isRunning) return undefined;
    const intervalId = setInterval(() => setNow(Date.now()), TICK_MS);
    // Al volver a la pestaña no se espera al siguiente tick: la vista se pone al día ya.
    const handleVisibility = () => {
      if (document.visibilityState === 'visible') setNow(Date.now());
    };
    document.addEventListener('visibilitychange', handleVisibility);
    return () => {
      clearInterval(intervalId);
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, [isRunning]);

  const start = () => {
    const startedAt = Date.now();
    setState(startSession(items, startedAt));
    setNow(startedAt);
  };

  // La hora se toma fuera del updater para que éste siga siendo puro.
  const applyAction = (action: (current: WarmupState, at: number) => WarmupState) => {
    const at = Date.now();
    setState((current) => (current ? action(current, at) : current));
    setNow(at);
  };

  return {
    view,
    start,
    reset: () => setState(null),
    pause: () => applyAction(pauseSession),
    resume: () => applyAction(resumeSession),
    hold: () => applyAction(holdCourtesy),
    skip: () => applyAction(skipCourtesy),
    next: () => applyAction(nextExercise),
    previous: () => applyAction(previousExercise),
    finish: () => applyAction(finishSession),
  };
}

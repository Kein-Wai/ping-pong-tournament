import { useEffect, useState } from 'react';
import type { FeedbackSound } from '../utils/feedbackSound';

/**
 * Crea el sonido una vez, lo reanuda al volver a la pestaña (iOS suspende el audio en
 * segundo plano) y lo libera al desmontar. `create` debe ser estable.
 */
export function useFeedbackSound<Cue extends string>(
  create: () => FeedbackSound<Cue>
): FeedbackSound<Cue> {
  const [sound] = useState(create);

  useEffect(() => {
    const handleVisibility = () => {
      if (document.visibilityState === 'visible') sound.resume();
    };
    document.addEventListener('visibilitychange', handleVisibility);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibility);
      sound.dispose();
    };
  }, [sound]);

  return sound;
}

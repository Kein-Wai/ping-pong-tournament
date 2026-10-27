import { useEffect, useRef } from 'react';
import { useFeedbackSound } from './useFeedbackSound';
import { getCues } from '../utils/warmupCues';
import type { WarmupView } from '../utils/warmupEngine';
import { createWarmupSound } from '../utils/warmupSound';

export function useWarmupAlerts(view: WarmupView | null) {
  const sound = useFeedbackSound(createWarmupSound);
  const previousViewRef = useRef<WarmupView | null>(null);

  useEffect(() => {
    if (view) getCues(previousViewRef.current, view).forEach(sound.play);
    previousViewRef.current = view;
  }, [view, sound]);

  return { unlock: sound.unlock };
}

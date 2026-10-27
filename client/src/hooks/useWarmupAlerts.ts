import { useEffect, useRef, useState } from 'react';
import { getCues } from '../utils/warmupCues';
import type { WarmupView } from '../utils/warmupEngine';
import { createWarmupSound } from '../utils/warmupSound';

export function useWarmupAlerts(view: WarmupView | null) {
  const [sound] = useState(createWarmupSound);
  const previousViewRef = useRef<WarmupView | null>(null);

  useEffect(() => {
    if (view) getCues(previousViewRef.current, view).forEach(sound.play);
    previousViewRef.current = view;
  }, [view, sound]);

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

  return { unlock: sound.unlock };
}

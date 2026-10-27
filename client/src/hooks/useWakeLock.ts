import { useEffect } from 'react';

/**
 * Mantiene la pantalla encendida mientras `active` sea true, para que el
 * cronómetro no se quede sin avisos porque el móvil se bloquee a mitad de sesión.
 * Si el navegador no lo soporta o lo rechaza, la sesión sigue sin él.
 */
export function useWakeLock(active: boolean) {
  useEffect(() => {
    if (!active || !navigator.wakeLock) return undefined;

    let sentinel: WakeLockSentinel | null = null;
    let cancelled = false;

    const acquire = async () => {
      try {
        const lock = await navigator.wakeLock.request('screen');
        if (cancelled) {
          void lock.release();
          return;
        }
        sentinel = lock;
      } catch {
        // Sin permiso o con ahorro de batería: no es un error de la sesión.
      }
    };

    // El navegador libera el bloqueo al ocultar la pestaña: hay que volver a pedirlo al volver.
    const handleVisibility = () => {
      if (document.visibilityState === 'visible' && (!sentinel || sentinel.released)) void acquire();
    };

    void acquire();
    document.addEventListener('visibilitychange', handleVisibility);

    return () => {
      cancelled = true;
      document.removeEventListener('visibilitychange', handleVisibility);
      void sentinel?.release();
    };
  }, [active]);
}

import { useEffect } from 'react';
import { manualMatchesRepository } from '../offline/manualMatchesRepository';
import { useSyncStore } from '../store/syncStore';

/**
 * Marca un partido como abierto mientras la pantalla de análisis está montada: la sincronización
 * se detiene (para que volver la conexión nunca interrumpa un análisis) y los cambios se acumulan
 * en el móvil. Al salir se libera y lo pendiente se encola para enviarse.
 */
export const useMatchSession = (matchId: string | undefined) => {
  useEffect(() => {
    if (!matchId) return;
    const releaseSync = useSyncStore.getState().blockSync();
    manualMatchesRepository.openMatch(matchId);
    return () => {
      releaseSync();
      void manualMatchesRepository.closeMatch(matchId);
    };
  }, [matchId]);
};

import { useEffect, useState } from 'react';

import { manualMatchesService } from '../api/services/manualMatches';
import type { TrackedMatch } from '../types/manualMatch';

/**
 * useManualMatch — Carga del partido que se analiza.
 *
 * `match` es el partido vivo: la pantalla lo actualiza con `setMatch` cuando guarda
 * cambios. `loaded` es lo que llegó del servidor, sin tocar: los demás hooks lo usan
 * para arrancar sus formularios y se reinician solo cuando se carga otro partido.
 *
 * Migration: extracción quirúrgica del efecto de carga de ManualMatchTracker.
 */
export const useManualMatch = (id: string | undefined) => {
  const [match, setMatch] = useState<TrackedMatch | null>(null);
  const [loaded, setLoaded] = useState<TrackedMatch | null>(null);

  useEffect(() => {
    manualMatchesService
      .byId<TrackedMatch>(id!)
      .then((data) => {
        setMatch(data);
        setLoaded(data);
      })
      .catch(() => {
        // El interceptor de api/axios ya notifica el error.
      });
  }, [id]);

  return { match, setMatch, loaded };
};

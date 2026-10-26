import { useCallback, useEffect, useState } from 'react';

import { usersService } from '../api/services/users';
import type { PlayerListItem } from '../types/players';

/**
 * useJugadoresLista — Carga de la plantilla de jugadores.
 *
 * Expone la lista, el estado de carga y `refetch`, que las acciones de la
 * pantalla (aprobar, ajustar ELO, crear, resetear) llaman al terminar. Cada
 * recarga pasa otra vez por `loading`, como hacía la pantalla.
 *
 * Migration: extracción quirúrgica de fetchPlayers de Jugadores.
 */
export const useJugadoresLista = () => {
  const [players, setPlayers] = useState<PlayerListItem[]>([]);
  const [loading, setLoading] = useState(true);

  const refetch = useCallback(async () => {
    try {
      setLoading(true);
      const data = await usersService.list<PlayerListItem>();
      if (Array.isArray(data)) {
        setPlayers(data);
      }
    } catch (error) {
      console.error('Error cargando jugadores:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refetch();
  }, [refetch]);

  return { players, loading, refetch };
};

import { useCallback, useEffect, useState } from 'react';

import { matchesService } from '../api/services/matches';
import { seasonsService } from '../api/services/seasons';
import { trainingsService } from '../api/services/trainings';
import { usersService } from '../api/services/users';
import type { PlayerTraining } from '../types/api';
import type { PlayerProfile, ProfileMatch } from '../types/playerProfile';

/**
 * useJugadorPerfil — Carga de datos de la pantalla de perfil de un jugador.
 *
 * Trae el jugador, la temporada vigente y sus últimos diez partidos completados
 * y, solo si `canViewTrainings` (el propio jugador o un administrador), sus
 * macrociclos. Expone `refetch` para recargar tras editar, consolidar o borrar.
 *
 * Migration: extracción quirúrgica de `fetchPlayerInfo` de JugadorPerfil. Sin
 * `id` no pide nada y `loading` sigue en `true`.
 */
export const useJugadorPerfil = (id: string | undefined, canViewTrainings: boolean) => {
  const [player, setPlayer] = useState<PlayerProfile | null>(null);
  const [recentMatches, setRecentMatches] = useState<ProfileMatch[]>([]);
  const [trainings, setTrainings] = useState<PlayerTraining[]>([]);
  const [currentSeason, setCurrentSeason] = useState<string>('');
  const [loading, setLoading] = useState(true);

  const refetch = useCallback(async () => {
    if (!id) return;
    try {
      const [playerData, allMatches, activeS] = await Promise.all([
        usersService.byId<PlayerProfile>(id),
        matchesService.list(),
        seasonsService.current(),
      ]);

      if (activeS) setCurrentSeason(activeS.name);
      setPlayer(playerData);

      const userMatches = allMatches
        .filter((m) => (m.playerOneId === id || m.playerTwoId === id) && m.status === 'Completado')
        .sort((a, b) => new Date(b.dateStart).getTime() - new Date(a.dateStart).getTime());

      // La API incluye siempre a los dos jugadores y los marcadores de set.
      setRecentMatches(userMatches.slice(0, 10) as unknown as ProfileMatch[]);

      if (canViewTrainings) {
        setTrainings(await trainingsService.byPlayer(id));
      }
    } catch (error) {
      console.error('Error cargando perfil del jugador:', error);
    } finally {
      setLoading(false);
    }
  }, [id, canViewTrainings]);

  useEffect(() => {
    refetch();
  }, [refetch]);

  return { player, recentMatches, trainings, currentSeason, loading, refetch };
};

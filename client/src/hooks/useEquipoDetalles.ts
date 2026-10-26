import { useCallback, useEffect, useState } from 'react';

import { teamsService } from '../api/services/teams';
import { usersService } from '../api/services/users';
import type { ClubTeam, User } from '../types/api';

/**
 * useEquipoDetalles — Carga de datos de la pantalla de detalle de un equipo.
 *
 * Trae los equipos del club (y se queda con el del `id`) junto con los jugadores
 * aprobados del club, que alimentan el modal de plantilla. Expone `refetch` para
 * que las acciones de la pantalla recarguen tras guardar.
 *
 * Migration: extracción quirúrgica de `fetchData` de EquipoDetalles. Sin `id` o
 * sin club no pide nada y `loading` sigue en `true`, como hacía la pantalla.
 */
export const useEquipoDetalles = (id: string | undefined, clubId: string | null | undefined) => {
  const [team, setTeam] = useState<ClubTeam | null>(null);
  const [loading, setLoading] = useState(true);
  const [clubPlayers, setClubPlayers] = useState<User[]>([]);

  const refetch = useCallback(async () => {
    if (!id || !clubId) return;
    try {
      const [teams, players] = await Promise.all([teamsService.byClub(clubId), usersService.list()]);
      setTeam(teams.find((t) => t.id === id) ?? null);
      setClubPlayers(players.filter((p) => p.clubStatus === 'Aprobado'));
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  }, [id, clubId]);

  useEffect(() => {
    refetch();
  }, [refetch]);

  return { team, clubPlayers, loading, refetch };
};

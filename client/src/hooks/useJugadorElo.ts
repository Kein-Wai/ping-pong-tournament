import { useState } from 'react';

import { usersService } from '../api/services/users';
import type { PlayerListItem } from '../types/players';
import { getPlayerStats } from '../utils/players';

/**
 * useJugadorElo — Ajuste manual del ELO de un jugador.
 *
 * Gestiona el modal «Ajustar Nivel ELO». `refetch` recarga la plantilla tras guardar.
 *
 * Migration: extracción quirúrgica de openEditElo / handleUpdateElo de Jugadores.
 */
export interface UseJugadorEloProps {
  refetch: () => void | Promise<void>;
}

export const useJugadorElo = ({ refetch }: UseJugadorEloProps) => {
  const [editEloModal, setEditEloModal] = useState<{
    opened: boolean;
    player: PlayerListItem | null;
  }>({
    opened: false,
    player: null,
  });
  const [newElo, setNewElo] = useState<number | string>(500);

  const openEditElo = (player: PlayerListItem) => {
    const pStats = getPlayerStats(player);
    setNewElo(pStats?.elo || 500);
    setEditEloModal({ opened: true, player });
  };

  const closeEditElo = () => setEditEloModal({ opened: false, player: null });

  const handleUpdateElo = async () => {
    if (!editEloModal.player) return;
    try {
      await usersService.update(editEloModal.player.id, { elo: Number(newElo) });
      setEditEloModal({ opened: false, player: null });
      await refetch();
    } catch {
      // El interceptor de api/axios ya notifica el error.
    }
  };

  return { editEloModal, newElo, setNewElo, openEditElo, closeEditElo, handleUpdateElo };
};

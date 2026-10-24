import { useState, useMemo } from 'react';

import { tournamentsService } from '../api/services/tournaments';
import type { Participant } from '../types/tournament';

/**
 * useTorneoIntercambio — Estado y lógica del intercambio de jugadores.
 *
 * Gestiona el estado del modal de intercambio (swapModalOpen, swapPlayerA,
 * swapPlayerB, isSwapping), las opciones elegibles (swapOptions) y el
 * handler handleSwapPlayers.
 *
 * Migration: extracción quirúrgica del state de intercambio y su handler en
 * TorneoDetalles. El refresco posterior (torneo + pestaña activa) se abstrae
 * como callback para mantener el orden original de operaciones.
 */
export interface UseTorneoIntercambioProps {
  id: string | undefined;
  participants: Participant[] | null;
  /** Refresca la pantalla tras intercambiar (torneo y pestaña activa). */
  onSwapped: () => Promise<void>;
}

export const useTorneoIntercambio = ({ id, participants, onSwapped }: UseTorneoIntercambioProps) => {
  const [swapModalOpen, setSwapModalOpen] = useState(false);
  const [swapPlayerA, setSwapPlayerA] = useState<string | null>(null);
  const [swapPlayerB, setSwapPlayerB] = useState<string | null>(null);
  const [isSwapping, setIsSwapping] = useState(false);

  const swapOptions = useMemo(() => {
    const confirmed = participants?.filter((p) => p.status === 'Confirmado') || [];
    // Solo permitimos intercambiar jugadores reales confirmados. Cero fantasmas.
    return confirmed.map((p) => ({
      value: p.player.id,
      label: `${p.player.name} ${p.player.surname || ''}`,
    }));
  }, [participants]);

  const handleSwapPlayers = async () => {
    if (!id || !swapPlayerA || !swapPlayerB) return;
    setIsSwapping(true);
    try {
      await tournamentsService.swapPlayers(id, {
        playerAId: swapPlayerA,
        playerBId: swapPlayerB,
      });
      setSwapModalOpen(false);
      setSwapPlayerA(null);
      setSwapPlayerB(null);

      // Recargamos todo para que la pantalla refresque los cuadros y los grupos
      await onSwapped();
    } catch (error) {
      console.error(error);
    } finally {
      setIsSwapping(false);
    }
  };

  return {
    swapModalOpen,
    setSwapModalOpen,
    swapPlayerA,
    setSwapPlayerA,
    swapPlayerB,
    setSwapPlayerB,
    isSwapping,
    swapOptions,
    handleSwapPlayers,
  };
};

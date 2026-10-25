import { useState, useCallback } from 'react';

import { tournamentsService, type CreateTournamentPayload } from '../api/services/tournaments';
import type { Tournament } from '../types/tournament';

/**
 * useTorneoFormato — Estado y lógica del formato de torneo.
 *
 * Gestiona el estado del modal de edición de formato (numGroups,
 * numGroupPlayers, playersKnockout, setsToWinGroup/setsToWinKnockout)
 * y los handlers openEditFormat / saveFormat.
 *
 * Migration: extracción quirúrgica del estado f_* y handlers dedicados
 * en TorneoDetalles. La lógica de payload (Knockout vs no Knockout) y
 * el refetch post-save se preservan exactamente.
 */
export interface UseTorneoFormatoProps {
  id: string | undefined;
  tournament: Tournament | null;
  /** Callback que refresca el torneo tras guardar (equivalente a fetchTournamentInfo). */
  onFormatSaved: () => Promise<void>;
}

export const useTorneoFormato = ({ id, tournament, onFormatSaved }: UseTorneoFormatoProps) => {
  const [editFormatOpened, setEditFormatOpened] = useState(false);
  const [numGroup, setNumGroup] = useState<number | string>(4);
  const [numGroupPlayers, setNumGroupPlayers] = useState<number | string>(4);
  const [playersKnockout, setPlayersKnockout] = useState<number | string>(2);
  const [setsToWinGroup, setSetsToWinGroup] = useState<number | string>(2);
  const [setsToWinKnockout, setSetsToWinKnockout] = useState<number | string>(3);

  const openEditFormat = useCallback(() => {
    setNumGroup(tournament?.numGroup || 4);
    setNumGroupPlayers(tournament?.numGroupPlayers || 4);
    setPlayersKnockout(tournament?.playersKnockout || 2);
    setSetsToWinGroup(tournament?.setsToWinGroup || 2);
    setSetsToWinKnockout(tournament?.setsToWinKnockout || 3);
    setEditFormatOpened(true);
  }, [tournament]);

  const saveFormat = useCallback(async () => {
    if (!id || !tournament) return;
    try {
      const payload: Partial<CreateTournamentPayload> = {
        setsToWinGroup: Number(setsToWinGroup),
        setsToWinKnockout: Number(setsToWinKnockout),
      };

      if (tournament.rounds !== 'Knockout') {
        payload.numGroup = Number(numGroup);
        payload.numGroupPlayers = Number(numGroupPlayers);
        payload.playersKnockout = Number(playersKnockout);
      }

      await tournamentsService.update(id, payload);
      setEditFormatOpened(false);
      await onFormatSaved();
    } catch (error) {
      console.error(error);
    }
  }, [id, tournament, numGroup, numGroupPlayers, playersKnockout, setsToWinGroup, setsToWinKnockout, onFormatSaved]);

  return {
    editFormatOpened,
    setEditFormatOpened,
    numGroup,
    setNumGroup,
    numGroupPlayers,
    setNumGroupPlayers,
    playersKnockout,
    setPlayersKnockout,
    setsToWinGroup,
    setSetsToWinGroup,
    setsToWinKnockout,
    setSetsToWinKnockout,
    openEditFormat,
    saveFormat,
  };
};

import { useState, useCallback } from 'react';

import { api } from '../api/axios';
import { ENDPOINTS } from '../api/endpoints';
import { openAppConfirmModal } from '../utils/modals';
import { IconTournament, IconTrophy } from '@tabler/icons-react';
import type {
  Tournament,
  MatchToEdit,
  GroupMatch,
  BracketMatch,
} from '../types/tournament';

/**
 * useTorneoPartido — Estado y lógica de edición de partidos.
 *
 * Gestiona el estado del partido en edición (MatchToEdit), el flag de
 * envío, y los handlers openEditMatchModal / executeSaveMatch /
 * handleSaveMatch.
 *
 * Migration: extracción quirúrgica del state editMatch/submittingMatch y
 * los handlers correspondientes de TorneoDetalles. El refetch post-save
 * se abstrae como onMatchSaved para mantener la lógica tab-specific
 * en el caller (TorneoDetalles).
 */
export interface UseTorneoPartidoProps {
  id: string | undefined;
  tournament: Tournament | null;
  isAdmin: boolean;
  groupMatches: GroupMatch[] | null;
  /** Callback que refetch-ea datos tab-specific + torneo tras guardar. */
  onMatchSaved: () => Promise<void>;
}

export const useTorneoPartido = ({
  id,
  tournament,
  isAdmin,
  groupMatches,
  onMatchSaved,
}: UseTorneoPartidoProps) => {
  const [editMatch, setEditMatch] = useState<MatchToEdit | null>(null);
  const [submittingMatch, setSubmittingMatch] = useState(false);

  const openEditMatchModal = useCallback(
    (match: GroupMatch | BracketMatch, isKnockout: boolean) => {
      if (!isAdmin) return;

      const setsToWin = isKnockout
        ? tournament?.setsToWinKnockout || 3
        : tournament?.setsToWinGroup || 2;

      // playerOneId/playerTwoId vienen del API pero no están en los tipos de dominio;
      // se accede vía type intersection para mantener type-safety sin `any`.
      const matchData = match as (GroupMatch | BracketMatch) & {
        playerOneId?: string;
        playerTwoId?: string;
        setSixPlayerOne?: number | null;
        setSixPlayerTwo?: number | null;
        setSevenPlayerOne?: number | null;
        setSevenPlayerTwo?: number | null;
      };

      setEditMatch({
        id: match.id,
        playerOneName: `${match.playerOne?.name || 'Jugador 1'} ${match.playerOne?.surname || ''}`,
        playerTwoName: `${match.playerTwo?.name || 'Jugador 2'} ${match.playerTwo?.surname || ''}`,
        playerOneId: matchData.playerOneId || match.playerOne?.id || '',
        playerTwoId: matchData.playerTwoId || match.playerTwo?.id || '',
        setsToWin,
        status: match.status || 'Programado',
        isKnockout,
        set1P1: match.setOnePlayerOne ?? 0,
        set1P2: match.setOnePlayerTwo ?? 0,
        set2P1: match.setTwoPlayerOne ?? 0,
        set2P2: match.setTwoPlayerTwo ?? 0,
        set3P1: match.setThreePlayerOne ?? 0,
        set3P2: match.setThreePlayerTwo ?? 0,
        set4P1: match.setFourPlayerOne ?? 0,
        set4P2: match.setFourPlayerTwo ?? 0,
        set5P1: match.setFivePlayerOne ?? 0,
        set5P2: match.setFivePlayerTwo ?? 0,
        set6P1: matchData.setSixPlayerOne ?? 0,
        set6P2: matchData.setSixPlayerTwo ?? 0,
        set7P1: matchData.setSevenPlayerOne ?? 0,
        set7P2: matchData.setSevenPlayerTwo ?? 0,
      });
    },
    [isAdmin, tournament],
  );

  const executeSaveMatch = useCallback(async () => {
    if (!editMatch || !id) return;
    setSubmittingMatch(true);

    try {
      const payload = {
        status: editMatch.status,
        setsToWin: editMatch.setsToWin,
        playerOneId: editMatch.playerOneId,
        playerTwoId: editMatch.playerTwoId,
        setOnePlayerOne: Number(editMatch.set1P1),
        setOnePlayerTwo: Number(editMatch.set1P2),
        setTwoPlayerOne: Number(editMatch.set2P1),
        setTwoPlayerTwo: Number(editMatch.set2P2),
        setThreePlayerOne: Number(editMatch.set3P1),
        setThreePlayerTwo: Number(editMatch.set3P2),
        setFourPlayerOne: Number(editMatch.set4P1),
        setFourPlayerTwo: Number(editMatch.set4P2),
        setFivePlayerOne: Number(editMatch.set5P1),
        setFivePlayerTwo: Number(editMatch.set5P2),
        setSixPlayerOne: Number(editMatch.set6P1),
        setSixPlayerTwo: Number(editMatch.set6P2),
        setSevenPlayerOne: Number(editMatch.set7P1),
        setSevenPlayerTwo: Number(editMatch.set7P2),
      };

      await api.put(ENDPOINTS.MATCHES.BY_ID(editMatch.id), payload);
      setEditMatch(null);
      await onMatchSaved();
    } catch (error) {
      console.error('Error al actualizar el partido:', error);
    } finally {
      setSubmittingMatch(false);
    }
  }, [editMatch, id, onMatchSaved]);

  const handleSaveMatch = useCallback(() => {
    if (!editMatch) return;

    const isCompletingNow = editMatch.status === 'Completado';
    const pendingGroupMatchesCount =
      groupMatches?.filter((m) => m.status !== 'Completado').length || 0;

    if (!editMatch.isKnockout && isCompletingNow && pendingGroupMatchesCount === 1) {
      openAppConfirmModal({
        title: 'Último partido de la Fase de Grupos',
        icon: <IconTournament size={18} />,
        color: 'orange',
        description:
          'Estás a punto de completar el último partido pendiente de toda la fase de grupos.',
        highlightText: 'Se generará el Cuadro de Eliminatorias automáticamente',
        warningText:
          'Asegúrate de que todos los resultados de los grupos son correctos antes de continuar. Una vez generado el cuadro principal, modificar un partido de grupos no alterará los cruces.',
        confirmLabel: 'Completar y Generar Cuadro',
        onConfirm: executeSaveMatch,
      });
    } else if (editMatch.isKnockout && isCompletingNow) {
      openAppConfirmModal({
        title: 'Confirmar Resultado Definitivo',
        icon: <IconTrophy size={18} />,
        color: 'red',
        description: 'Estás a punto de cerrar este partido eliminatorio.',
        highlightText: 'El ganador avanzará automáticamente en el cuadro.',
        warningText:
          '¡Atención! Una vez completado, revertir el ganador en el cuadro principal afectará a los cruces y no es posible deshacerlo fácilmente desde la interfaz. ¡Revisa bien el marcador!',
        confirmLabel: 'Sí, Guardar y Avanzar Jugador',
        onConfirm: executeSaveMatch,
      });
    } else {
      executeSaveMatch();
    }
  }, [editMatch, groupMatches, executeSaveMatch]);

  return {
    editMatch,
    setEditMatch,
    submittingMatch,
    openEditMatchModal,
    executeSaveMatch,
    handleSaveMatch,
  };
};

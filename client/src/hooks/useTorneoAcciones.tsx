import { useState } from 'react';
import type { Dispatch, SetStateAction } from 'react';

import { IconUserCheck, IconUserX, IconRocket, IconTrash } from '@tabler/icons-react';
import { tournamentsService } from '../api/services/tournaments';
import { openAppConfirmModal } from '../utils/modals';
import type { Participant, Tournament } from '../types/tournament';

/**
 * useTorneoAcciones — Acciones con confirmación sobre el torneo.
 *
 * Gestiona isGenerating y los handlers handleParticipantStatus /
 * handleGenerateTournament / handleDeleteTournament, todos con su modal de
 * confirmación.
 *
 * Migration: extracción quirúrgica de los handlers dedicados en
 * TorneoDetalles. Los efectos sobre la pantalla (recargar el torneo, cambiar
 * de pestaña, navegar tras borrar) entran como callbacks para mantener el
 * orden original de operaciones.
 */
export interface UseTorneoAccionesProps {
  id: string | undefined;
  tournament: Tournament | null;
  confirmedPlayersCount: number;
  setParticipants: Dispatch<SetStateAction<Participant[] | null>>;
  setActiveTab: (tab: string | null) => void;
  /** Refresca el torneo (equivalente a fetchTournamentInfo). */
  reloadTournament: () => Promise<void>;
  /** Se invoca tras eliminar el torneo (p. ej. navegar al listado). */
  onDeleted: () => void;
}

export const useTorneoAcciones = ({
  id,
  tournament,
  confirmedPlayersCount,
  setParticipants,
  setActiveTab,
  reloadTournament,
  onDeleted,
}: UseTorneoAccionesProps) => {
  const [isGenerating, setIsGenerating] = useState(false);

  const hasGroupsFormat =
    tournament?.rounds === 'GruposKnockout' || tournament?.rounds === 'TodosvsTodos';

  const handleParticipantStatus = (
    playerId: string,
    playerName: string,
    playerSurname: string | null,
    status: 'Confirmado' | 'NoPresentado',
  ) => {
    if (!id) return;
    const isNoShow = status === 'NoPresentado';

    openAppConfirmModal({
      title: isNoShow ? 'Sancionar Jugador' : 'Confirmar Asistencia',
      icon: isNoShow ? <IconUserX size={18} /> : <IconUserCheck size={18} />,
      color: isNoShow ? 'red' : 'green',
      description: isNoShow
        ? '¿Estás seguro de marcar a este jugador como No Presentado? Se le restarán 100 puntos de ELO como penalización.'
        : 'Confirmar a este jugador para que el algoritmo de la Serpiente lo incluya en la Fase de Grupos.',
      highlightText: `${playerName} ${playerSurname}`,
      confirmLabel: isNoShow ? 'Sí, Sancionar' : 'Confirmar Jugador',
      onConfirm: async () => {
        try {
          await tournamentsService.updateParticipantStatus(id, playerId, status);
          setParticipants(await tournamentsService.participants(id));
        } catch (error) {
          console.error(error);
        }
      },
    });
  };

  const handleGenerateTournament = () => {
    if (!id) return;
    const isUnderbooked = confirmedPlayersCount < (tournament?.numPlayers || 0);

    openAppConfirmModal({
      title: 'Iniciar Competición',
      icon: <IconRocket size={18} />,
      color: isUnderbooked ? 'red' : 'orange',
      description:
        'Se cerrarán las inscripciones y el algoritmo distribuirá en el cuadro únicamente a los jugadores confirmados.',
      highlightText: tournament?.name || '',
      warningText: isUnderbooked
        ? `🚨 ATENCIÓN: Solo tienes ${confirmedPlayersCount} confirmados de los ${tournament?.numPlayers} esperados. ¡Te sobrarán huecos vacíos! Te recomendamos cancelar y usar "Ajustar Formato".`
        : 'Esta acción es irreversible. Se generarán los cruces y el torneo pasará a estar activo.',
      confirmLabel: 'Sí, Iniciar Torneo',
      onConfirm: async () => {
        setIsGenerating(true);
        try {
          await tournamentsService.generateGroups(id);
          await reloadTournament();
          setActiveTab(hasGroupsFormat ? 'grupos' : 'bracketA');
        } catch (error) {
          console.error('Error al generar el torneo', error);
        } finally {
          setIsGenerating(false);
        }
      },
    });
  };

  const handleDeleteTournament = () => {
    if (!id) return;

    openAppConfirmModal({
      title: 'Eliminar Torneo',
      icon: <IconTrash size={18} />,
      color: 'red',
      description:
        '¿Estás seguro de que deseas eliminar este torneo? Se borrarán todas las inscripciones registradas.',
      highlightText: tournament?.name || '',
      warningText: 'Esta acción es irreversible y el torneo desaparecerá del listado.',
      confirmLabel: 'Sí, Eliminar Torneo',
      onConfirm: async () => {
        try {
          await tournamentsService.remove(id);
          onDeleted();
        } catch (error) {
          console.error('Error al eliminar el torneo', error);
        }
      },
    });
  };

  return {
    isGenerating,
    handleParticipantStatus,
    handleGenerateTournament,
    handleDeleteTournament,
  };
};

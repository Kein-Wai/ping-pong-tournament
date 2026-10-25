import { useState } from 'react';

import { teamsService } from '../api/services/teams';
import { openAppConfirmModal } from '../utils/modals';
import { IconTrash } from '@tabler/icons-react';
import type { TeamMatch, TeamMatchStatus } from '../types/api';

/**
 * useEquipoPartido — Gestión de un partido ya programado del equipo.
 *
 * Gestiona el modal «Actualizar Partido» (datos y resultado), su borrado con
 * confirmación y la confirmación de asistencia del jugador. `refetch` recarga
 * el equipo tras cada cambio.
 *
 * Migration: extracción quirúrgica de openEditMatchModal /
 * handleUpdateMatchResult / handleDeleteMatch / handleToggleAttendance de
 * EquipoDetalles.
 */
export interface UseEquipoPartidoProps {
  refetch: () => void | Promise<void>;
}

export const useEquipoPartido = ({ refetch }: UseEquipoPartidoProps) => {
  const [saving, setSaving] = useState(false);
  const [editMatchModalOpen, setEditMatchModalOpen] = useState(false);
  const [selectedMatch, setSelectedMatch] = useState<TeamMatch | null>(null);

  const [editStatus, setEditStatus] = useState<string>('Programado');
  const [ourScore, setOurScore] = useState<number | string>('');
  const [rivalScore, setRivalScore] = useState<number | string>('');

  const [editRivalName, setEditRivalName] = useState('');
  const [editDate, setEditDate] = useState<Date | null>(null);
  const [editIsHome, setEditIsHome] = useState(true);
  const [editLocation, setEditLocation] = useState('');

  const handleUpdateMatchResult = async () => {
    if (!selectedMatch || !editDate) return;
    setSaving(true);
    try {
      await teamsService.updateMatch(selectedMatch.id, {
        status: editStatus as TeamMatchStatus,
        ourScore: editStatus === 'Completado' ? Number(ourScore) : null,
        rivalScore: editStatus === 'Completado' ? Number(rivalScore) : null,
        rivalName: editRivalName,
        date: editDate.toISOString(),
        isHome: editIsHome,
        location: editLocation,
      });
      setEditMatchModalOpen(false);
      refetch();
    } catch {
      // El interceptor de api/axios ya avisa al usuario del error.
    } finally {
      setSaving(false);
    }
  };

  const openEditMatchModal = (match: TeamMatch) => {
    setSelectedMatch(match);
    setEditStatus(match.status);
    setOurScore(match.ourScore ?? '');
    setRivalScore(match.rivalScore ?? '');
    setEditRivalName(match.rivalName);
    setEditDate(new Date(match.date));
    setEditIsHome(match.isHome);
    setEditLocation(match.location || '');
    setEditMatchModalOpen(true);
  };

  const handleDeleteMatch = (matchId: string) => {
    openAppConfirmModal({
      title: 'Eliminar Partido',
      icon: <IconTrash size={18} />,
      color: 'red',
      description: '¿Estás seguro de que deseas eliminar este partido del calendario?',
      highlightText: 'Esta acción no se puede deshacer.',
      confirmLabel: 'Sí, Eliminar Partido',
      onConfirm: async () => {
        try {
          await teamsService.deleteMatch(matchId);
          refetch();
          setEditMatchModalOpen(false);
        } catch {
          // El interceptor de api/axios ya avisa al usuario del error.
        }
      },
    });
  };

  const handleToggleAttendance = async (matchId: string) => {
    try {
      await teamsService.toggleAvailability(matchId);
      refetch();
    } catch {
      // El interceptor de api/axios ya avisa al usuario del error.
    }
  };

  return {
    saving,
    editMatchModalOpen,
    setEditMatchModalOpen,
    selectedMatch,
    editStatus,
    setEditStatus,
    ourScore,
    setOurScore,
    rivalScore,
    setRivalScore,
    editRivalName,
    setEditRivalName,
    editDate,
    setEditDate,
    editIsHome,
    setEditIsHome,
    editLocation,
    setEditLocation,
    openEditMatchModal,
    handleUpdateMatchResult,
    handleDeleteMatch,
    handleToggleAttendance,
  };
};

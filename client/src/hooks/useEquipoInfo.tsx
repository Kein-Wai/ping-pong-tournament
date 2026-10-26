import { useState } from 'react';

import { teamsService } from '../api/services/teams';
import { openAppConfirmModal } from '../utils/modals';
import { IconTrash } from '@tabler/icons-react';
import type { ClubTeam } from '../types/api';

/**
 * useEquipoInfo — Edición y borrado de un equipo.
 *
 * Gestiona el modal «Editar Información del Equipo» (nombre, categoría y nivel)
 * y la confirmación de borrado. Los efectos de pantalla llegan como callbacks:
 * `refetch` recarga el equipo tras guardar y `onTeamDeleted` deja que la página
 * navegue al listado.
 *
 * Migration: extracción quirúrgica de handleOpenEditTeam / handleUpdateTeam /
 * handleDeleteTeam de EquipoDetalles.
 */
export interface UseEquipoInfoProps {
  id: string | undefined;
  team: ClubTeam | null;
  refetch: () => void | Promise<void>;
  onTeamDeleted: () => void;
}

export const useEquipoInfo = ({ id, team, refetch, onTeamDeleted }: UseEquipoInfoProps) => {
  const [saving, setSaving] = useState(false);
  const [editTeamModalOpen, setEditTeamModalOpen] = useState(false);
  const [editTeamName, setEditTeamName] = useState('');
  const [editTeamCategory, setEditTeamCategory] = useState<string | null>('');
  const [editTeamLevel, setEditTeamLevel] = useState<string | null>('');

  const handleOpenEditTeam = () => {
    setEditTeamName(team!.name);
    setEditTeamCategory(team!.category);
    setEditTeamLevel(team!.level);
    setEditTeamModalOpen(true);
  };

  const handleUpdateTeam = async () => {
    if (!editTeamName || !editTeamCategory || !editTeamLevel) return;
    setSaving(true);
    try {
      await teamsService.update(id!, {
        name: editTeamName,
        category: editTeamCategory,
        level: editTeamLevel,
      });
      setEditTeamModalOpen(false);
      refetch();
    } catch {
      // El interceptor de api/axios ya avisa al usuario del error.
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteTeam = () => {
    openAppConfirmModal({
      title: 'Eliminar Equipo',
      icon: <IconTrash size={18} />,
      color: 'red',
      description: '¿Estás seguro de que deseas eliminar este equipo de competición?',
      highlightText: team!.name,
      warningText:
        'Se borrarán todos los partidos programados en su calendario. Los jugadores quedarán desvinculados del equipo, pero seguirán formando parte de la plantilla del club.',
      confirmLabel: 'Sí, Eliminar Equipo',
      onConfirm: async () => {
        try {
          await teamsService.remove(id!);
          onTeamDeleted();
        } catch (error) {
          console.error('Error eliminando equipo:', error);
        }
      },
    });
  };

  return {
    saving,
    editTeamModalOpen,
    setEditTeamModalOpen,
    editTeamName,
    setEditTeamName,
    editTeamCategory,
    setEditTeamCategory,
    editTeamLevel,
    setEditTeamLevel,
    handleOpenEditTeam,
    handleUpdateTeam,
    handleDeleteTeam,
  };
};

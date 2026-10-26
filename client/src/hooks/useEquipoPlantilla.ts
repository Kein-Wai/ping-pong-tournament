import { useState } from 'react';

import { teamsService } from '../api/services/teams';
import type { ClubTeam } from '../types/api';

/**
 * useEquipoPlantilla — Ajuste de la plantilla de un equipo.
 *
 * Gestiona el modal «Ajustar Plantilla»: qué jugadores están marcados y el
 * guardado de la selección. `refetch` recarga el equipo tras guardar.
 *
 * Migration: extracción quirúrgica de handleOpenRoster / handleSaveRoster de
 * EquipoDetalles.
 */
export interface UseEquipoPlantillaProps {
  id: string | undefined;
  team: ClubTeam | null;
  refetch: () => void | Promise<void>;
}

export const useEquipoPlantilla = ({ id, team, refetch }: UseEquipoPlantillaProps) => {
  const [saving, setSaving] = useState(false);
  const [rosterModalOpen, setRosterModalOpen] = useState(false);
  const [checkedPlayers, setCheckedPlayers] = useState<string[]>([]);

  const handleOpenRoster = () => {
    setCheckedPlayers(team!.players.map((p) => p.id));
    setRosterModalOpen(true);
  };

  const handleSaveRoster = async () => {
    setSaving(true);
    try {
      await teamsService.updatePlayers(id!, checkedPlayers);
      setRosterModalOpen(false);
      refetch();
    } catch {
      // El interceptor de api/axios ya avisa al usuario del error.
    } finally {
      setSaving(false);
    }
  };

  return {
    saving,
    rosterModalOpen,
    setRosterModalOpen,
    checkedPlayers,
    setCheckedPlayers,
    handleOpenRoster,
    handleSaveRoster,
  };
};

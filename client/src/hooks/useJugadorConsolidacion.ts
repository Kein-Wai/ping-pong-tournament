import { useState } from 'react';

import { skillsService } from '../api/services/skills';
import { PROFILE_SKILL_KEYS } from '../constants/skills';
import type { PlayerProfile } from '../types/playerProfile';

/**
 * useJugadorConsolidacion — Consolidación de las mejoras de habilidades.
 *
 * Gestiona el modal «Consolidar Progreso»: las subidas propuestas (las mejoras
 * pendientes del jugador), que el administrador puede ajustar, y su aplicación
 * sumándolas a la base. `refetch` recarga el perfil tras aplicar.
 *
 * Migration: extracción quirúrgica de handleOpenConsolidate /
 * handleExecuteConsolidate de JugadorPerfil.
 */
export interface UseJugadorConsolidacionProps {
  id: string | undefined;
  player: PlayerProfile | null;
  refetch: () => void | Promise<void>;
}

export const useJugadorConsolidacion = ({ id, player, refetch }: UseJugadorConsolidacionProps) => {
  const [consolidateModalOpened, setConsolidateModalOpened] = useState(false);
  const [approvedGains, setApprovedGains] = useState<Record<string, number>>({});
  const [consolidating, setConsolidating] = useState(false);

  const currentSkills = Array.isArray(player?.skills) ? player.skills[0] : player?.skills;

  const handleOpenConsolidate = () => {
    const initialGains: Record<string, number> = {};
    PROFILE_SKILL_KEYS.forEach((s) => {
      initialGains[s.key] =
        player?.pendingSkills?.[s.key as keyof typeof player.pendingSkills] || 0;
    });
    setApprovedGains(initialGains);
    setConsolidateModalOpened(true);
  };

  const handleExecuteConsolidate = async () => {
    if (!id || !player) return;
    setConsolidating(true);
    try {
      const finalSkills: Record<string, number> = {};
      PROFILE_SKILL_KEYS.forEach((sKey) => {
        const base = currentSkills?.[sKey.key as keyof typeof currentSkills] || 0;
        const gain = approvedGains[sKey.key] || 0;
        finalSkills[sKey.key] = Number((base + gain).toFixed(2));
      });

      await skillsService.consolidate(id, finalSkills);
      setConsolidateModalOpened(false);
      await refetch();
    } catch {
      // El interceptor de api/axios ya avisa al usuario del error.
    } finally {
      setConsolidating(false);
    }
  };

  return {
    consolidateModalOpened,
    setConsolidateModalOpened,
    approvedGains,
    setApprovedGains,
    consolidating,
    handleOpenConsolidate,
    handleExecuteConsolidate,
  };
};

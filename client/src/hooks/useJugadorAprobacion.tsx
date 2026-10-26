import { useState } from 'react';
import { IconUserMinus } from '@tabler/icons-react';

import { clubsService } from '../api/services/clubs';
import type { PlayerLevel } from '../types/enums';
import type { PlayerListItem, SkillInputs } from '../types/players';
import { openAppConfirmModal } from '../utils/modals';
import { EMPTY_SKILL_INPUTS, buildFinalSkills, getPlayerStats } from '../utils/players';

/**
 * useJugadorAprobacion — Resolución de las solicitudes de ingreso al club.
 *
 * Rechazar pide confirmación y envía el rechazo; aprobar abre el modal «Nivel de
 * Entrada Inicial», donde el administrador fija nivel, ELO y habilidades antes de
 * confirmar. Un SuperAdmin actúa con el club del propio jugador; el resto, con el
 * suyo (`clubId`). `refetch` recarga la plantilla.
 *
 * Migration: extracción quirúrgica de handleProcessRequest / handleConfirmApproval
 * de Jugadores.
 */
export interface UseJugadorAprobacionProps {
  players: PlayerListItem[];
  clubId: string | null | undefined;
  isSuperAdmin: boolean;
  refetch: () => void | Promise<void>;
}

export const useJugadorAprobacion = ({
  players,
  clubId,
  isSuperAdmin,
  refetch,
}: UseJugadorAprobacionProps) => {
  const [approveModal, setApproveModal] = useState<{
    opened: boolean;
    player: PlayerListItem | null;
  }>({
    opened: false,
    player: null,
  });
  const [playerLevel, setPlayerLevel] = useState<PlayerLevel | null>(null);
  const [startingElo, setStartingElo] = useState<number | string>(500);
  const [skills, setSkills] = useState<SkillInputs>(EMPTY_SKILL_INPUTS);
  const [approving, setApproving] = useState(false);

  const handleProcessRequest = (
    playerId: string,
    playerName: string,
    action: 'Aprobado' | 'Rechazado',
  ) => {
    const isApprove = action === 'Aprobado';
    const adminClubId = isSuperAdmin ? players.find((p) => p.id === playerId)?.clubId : clubId;
    if (!adminClubId) return;

    if (isApprove) {
      const playerToApprove = players.find((p) => p.id === playerId) || null;
      const pStats = playerToApprove ? getPlayerStats(playerToApprove) : undefined;
      setApproveModal({ opened: true, player: playerToApprove });
      setStartingElo(pStats?.elo || 500);
      return;
    }

    openAppConfirmModal({
      title: 'Rechazar Solicitud',
      icon: <IconUserMinus size={18} />,
      color: 'red',
      description: `Estás a punto de procesar la solicitud de membresía para:`,
      highlightText: playerName,
      warningText:
        'La solicitud será denegada. El jugador volverá al estado de Jugador Libre para poder aplicar a otros clubes.',
      confirmLabel: 'Rechazar Solicitud',
      onConfirm: async () => {
        try {
          await clubsService.updateMemberStatus(adminClubId, playerId, { status: action });
          await refetch();
          window.dispatchEvent(new CustomEvent('refresh-notifications'));
        } catch {
          // El interceptor de api/axios ya notifica el error.
        }
      },
    });
  };

  const closeApproveModal = () => {
    setApproveModal({ opened: false, player: null });
    setPlayerLevel(null);
  };

  const handleConfirmApproval = async () => {
    const clubIdToApprove = isSuperAdmin ? approveModal.player?.clubId : clubId;
    if (!approveModal.player || !playerLevel || !clubIdToApprove) return;
    setApproving(true);

    const finalSkills = buildFinalSkills(playerLevel, skills);

    try {
      await clubsService.updateMemberStatus(clubIdToApprove, approveModal.player.id, {
        status: 'Aprobado',
        level: playerLevel,
        elo: Number(startingElo),
        skills: finalSkills,
      });

      setApproveModal({ opened: false, player: null });
      setPlayerLevel(null);
      setSkills(EMPTY_SKILL_INPUTS);
      await refetch();
      window.dispatchEvent(new CustomEvent('refresh-notifications'));
    } catch {
      // El interceptor de api/axios ya notifica el error.
    } finally {
      setApproving(false);
    }
  };

  return {
    approveModal,
    playerLevel,
    setPlayerLevel,
    startingElo,
    setStartingElo,
    skills,
    setSkills,
    approving,
    handleProcessRequest,
    closeApproveModal,
    handleConfirmApproval,
  };
};

import { useState, useCallback } from 'react';

import { api } from '../api/axios';
import { ENDPOINTS } from '../api/endpoints';
import { openAppConfirmModal } from '../utils/modals';
import { IconTrophy } from '@tabler/icons-react';
import type { Tournament, ClubPlayer } from '../types/tournament';
import type { User } from '../store/authStore';

/**
 * useTorneoInscripcion — Estado y lógica de inscripción al torneo.
 *
 * Gestiona el estado del modal de inscripción masiva (enrollModalOpen,
 * clubPlayers, checkedToEnroll, enrolling) y el flag isRegistering,
 * así como los handlers handleOpenEnrollModal / handleInscribirse /
 * handleBulkEnroll.
 *
 * Migration: extracción quirúrgica del state de inscripción y handlers
 * dedicados en TorneoDetalles. Los refetches post-inscripción se
 * abstraen como callbacks para mantener la lógica de TorneoDetalles.
 */
export interface UseTorneoInscripcionProps {
  id: string | undefined;
  tournament: Tournament | null;
  user: User | null;
  onInscribirseSuccess: () => Promise<void>;
  onBulkEnrollSuccess: () => Promise<void>;
}

export const useTorneoInscripcion = ({
  id,
  tournament,
  user,
  onInscribirseSuccess,
  onBulkEnrollSuccess,
}: UseTorneoInscripcionProps) => {
  const [enrollModalOpen, setEnrollModalOpen] = useState(false);
  const [clubPlayers, setClubPlayers] = useState<ClubPlayer[]>([]);
  const [checkedToEnroll, setCheckedToEnroll] = useState<string[]>([]);
  const [enrolling, setEnrolling] = useState(false);
  const [isRegistering, setIsRegistering] = useState(false);

  const handleOpenEnrollModal = useCallback(async () => {
    try {
      const res = await api.get(ENDPOINTS.USERS.BASE);
      setClubPlayers(res.data.data);
      setCheckedToEnroll([]);
      setEnrollModalOpen(true);
    } catch (e) {
      console.error(e);
    }
  }, []);

  const handleInscribirse = useCallback(() => {
    if (!id) return;
    openAppConfirmModal({
      title: 'Inscripción al Torneo',
      icon: <IconTrophy size={18} />,
      color: 'green',
      description: '¿Confirmas que deseas inscribirte en la siguiente competición?',
      highlightText: tournament?.name || '',
      warningText:
        'Recuerda revisar la fecha de inicio. ¡Asegúrate de estar disponible para jugar! Si no apareces, se te descontarán 100 puntos en tu ELO.',
      confirmLabel: 'Confirmar e Inscribirme',
      onConfirm: async () => {
        setIsRegistering(true);
        try {
          await api.post(ENDPOINTS.TOURNAMENTS.REGISTER(id), {
            playerId: user?.id,
            registeredAt: new Date().toISOString(),
            status: 'Pendiente',
          });
          await onInscribirseSuccess();
        } catch (error) {
          console.error(error);
        } finally {
          setIsRegistering(false);
        }
      },
    });
  }, [id, user, tournament, onInscribirseSuccess]);

  const handleBulkEnroll = useCallback(async () => {
    if (!id) return;
    setEnrolling(true);
    try {
      await api.post(ENDPOINTS.TOURNAMENTS.REGISTER_BULK(id), { playerIds: checkedToEnroll });
      setEnrollModalOpen(false);
      await onBulkEnrollSuccess();
    } catch (error) {
      console.error(error);
    } finally {
      setEnrolling(false);
    }
  }, [id, checkedToEnroll, onBulkEnrollSuccess]);

  return {
    enrollModalOpen,
    setEnrollModalOpen,
    clubPlayers,
    setClubPlayers,
    checkedToEnroll,
    setCheckedToEnroll,
    enrolling,
    isRegistering,
    handleOpenEnrollModal,
    handleInscribirse,
    handleBulkEnroll,
  };
};

import { clubsService } from '../api/services/clubs';
import { trainingsService } from '../api/services/trainings';
import { openAppConfirmModal } from '../utils/modals';
import { IconTrash, IconUserMinus } from '@tabler/icons-react';
import type { PlayerProfile } from '../types/playerProfile';

/**
 * useJugadorAdministracion — Acciones de administrador sobre el perfil de un jugador.
 *
 * Dar de baja al jugador del club y borrar uno de sus planes de entrenamiento,
 * ambas con confirmación. Los efectos de pantalla llegan como callbacks:
 * `onKicked` deja que la página navegue al listado y `refetch` recarga el perfil.
 *
 * Migration: extracción quirúrgica de handleKickPlayer / handleDeletePlan de
 * JugadorPerfil.
 */
export interface UseJugadorAdministracionProps {
  player: PlayerProfile | null;
  refetch: () => void | Promise<void>;
  onKicked: () => void;
}

export const useJugadorAdministracion = ({
  player,
  refetch,
  onKicked,
}: UseJugadorAdministracionProps) => {
  const handleKickPlayer = () => {
    openAppConfirmModal({
      title: 'Dar de baja del club',
      icon: <IconUserMinus size={18} />,
      color: 'red',
      description: '¿Estás seguro de que deseas expulsar a este jugador del club?',
      highlightText: `${player?.name} ${player?.surname || ''}`,
      warningText:
        'El jugador perderá acceso a los torneos internos y al calendario del club. Su cuenta no se borrará, pasará a ser un Jugador Libre.',
      confirmLabel: 'Sí, dar de baja',
      onConfirm: async () => {
        try {
          await clubsService.updateMemberStatus(player!.clubId!, player!.id, {
            status: 'Rechazado',
          });
          onKicked();
        } catch {
          // El interceptor de api/axios ya notifica el error.
        }
      },
    });
  };

  const handleDeletePlan = (planId: string) => {
    openAppConfirmModal({
      title: 'Eliminar Plan de Entrenamiento',
      icon: <IconTrash size={18} />,
      color: 'red',
      description: '¿Estás seguro de que deseas eliminar este plan completo?',
      highlightText: 'Esta acción no se puede deshacer',
      confirmLabel: 'Sí, eliminar plan',
      onConfirm: async () => {
        try {
          await trainingsService.deletePlan(planId);
          await refetch();
        } catch {
          // El interceptor de api/axios ya notifica el error.
        }
      },
    });
  };

  return { handleKickPlayer, handleDeletePlan };
};

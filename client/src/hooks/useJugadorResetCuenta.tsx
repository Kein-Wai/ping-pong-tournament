import { useState } from 'react';
import { notifications } from '@mantine/notifications';
import { IconCheck } from '@tabler/icons-react';

import { authService } from '../api/services/auth';
import { usersService } from '../api/services/users';
import type { PlayerListItem } from '../types/players';
import { isGuestEmail } from '../utils/players';

/**
 * useJugadorResetCuenta — Reseteo de cuenta / asignación de correo.
 *
 * Gestiona el modal «Resetear Cuenta»: si el correo cambió (un invitado al que se
 * le asigna uno real) lo guarda en la cuenta, y después envía el enlace de
 * recuperación. `refetch` recarga la plantilla tras enviar.
 *
 * Migration: extracción quirúrgica de handleOpenResetAccount / handleSendResetEmail
 * de Jugadores.
 */
export interface UseJugadorResetCuentaProps {
  refetch: () => void | Promise<void>;
}

export const useJugadorResetCuenta = ({ refetch }: UseJugadorResetCuentaProps) => {
  const [resetAccountModal, setResetAccountModal] = useState<{
    opened: boolean;
    player: PlayerListItem | null;
  }>({ opened: false, player: null });
  const [recoveryEmail, setRecoveryEmail] = useState('');
  const [sendingReset, setSendingReset] = useState(false);

  const handleOpenResetAccount = (player: PlayerListItem) => {
    const isGuestWithoutEmail = isGuestEmail(player.email);
    setRecoveryEmail(isGuestWithoutEmail ? '' : player.email);
    setResetAccountModal({ opened: true, player });
  };

  const closeResetAccount = () => setResetAccountModal({ opened: false, player: null });

  const handleSendResetEmail = async () => {
    if (!recoveryEmail || !resetAccountModal.player) return;
    setSendingReset(true);

    try {
      // 1. Si es un Guest o le han cambiado el correo desde aquí, actualizamos su cuenta primero.
      if (resetAccountModal.player.email !== recoveryEmail) {
        await usersService.update(resetAccountModal.player.id, { email: recoveryEmail });
      }

      // 2. Disparamos el correo usando el endpoint público de Auth
      await authService.forgotPassword(recoveryEmail);

      notifications.show({
        title: 'Correo Enviado',
        message: `Se ha enviado el enlace de recuperación a ${recoveryEmail}.`,
        color: 'green',
        icon: <IconCheck size={16} />,
      });

      setResetAccountModal({ opened: false, player: null });
      await refetch();
    } catch {
      // El interceptor de api/axios ya notifica el error.
    } finally {
      setSendingReset(false);
    }
  };

  return {
    resetAccountModal,
    recoveryEmail,
    setRecoveryEmail,
    sendingReset,
    handleOpenResetAccount,
    closeResetAccount,
    handleSendResetEmail,
  };
};

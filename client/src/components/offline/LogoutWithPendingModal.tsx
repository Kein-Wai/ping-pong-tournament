import { Button, Modal, Stack, Text } from '@mantine/core';
import { useState } from 'react';
import { getAppLocalStore } from '../../offline/appLocalStore';
import { getAppSync } from '../../offline/appSync';
import { discardAllOutbox } from '../../offline/outbox';
import { useAuthStore } from '../../store/authStore';
import { selectIsOnline, useConnectivityStore } from '../../store/connectivityStore';
import { useSyncStore } from '../../store/syncStore';

interface LogoutWithPendingModalProps {
  opened: boolean;
  onClose: () => void;
  /** Cierra la sesión (sin tocar los pendientes). */
  onLogout: () => void;
}

/**
 * Aviso al cerrar sesión con pendientes. Salir no borra nada: los datos siguen ligados a la cuenta
 * y se retoman cuando la misma persona vuelve a entrar. Solo «Descartar pendientes» los elimina.
 */
export const LogoutWithPendingModal = ({ opened, onClose, onLogout }: LogoutWithPendingModalProps) => {
  const total = useSyncStore((state) => state.pending + state.needsAttention);
  const canSync = useConnectivityStore(selectIsOnline);
  const [syncing, setSyncing] = useState(false);
  const [stillPending, setStillPending] = useState(false);

  const syncFirst = async () => {
    setSyncing(true);
    try {
      await getAppSync()?.syncNow();
    } finally {
      setSyncing(false);
    }
    const { pending, needsAttention } = useSyncStore.getState();
    if (pending + needsAttention === 0) onLogout();
    else setStillPending(true);
  };

  const discardAndLogout = async () => {
    const store = await getAppLocalStore();
    const userId = useAuthStore.getState().user?.id;
    if (store && userId) await discardAllOutbox(store, userId);
    onLogout();
  };

  return (
    <Modal opened={opened} onClose={onClose} title="Tienes datos sin enviar" centered>
      <Stack gap="sm">
        <Text>
          Hay {total} {total === 1 ? 'elemento pendiente' : 'elementos pendientes'} de enviar. Si
          sales ahora no se pierden: seguirán guardados en este móvil y se enviarán cuando vuelvas
          a entrar con esta misma cuenta.
        </Text>
        {stillPending && (
          <Text c="orange" size="sm">
            No se pudo enviar todo. Puedes salir igualmente o revisar los pendientes.
          </Text>
        )}
        <Button onClick={() => void syncFirst()} loading={syncing} disabled={!canSync}>
          Sincronizar y salir
        </Button>
        <Button variant="light" onClick={onLogout}>
          Salir igualmente
        </Button>
        <Button variant="subtle" color="red" onClick={() => void discardAndLogout()}>
          Descartar pendientes y salir
        </Button>
        <Button variant="default" onClick={onClose}>
          Cancelar
        </Button>
      </Stack>
    </Modal>
  );
};

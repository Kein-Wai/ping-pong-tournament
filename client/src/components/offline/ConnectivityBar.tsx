import { Badge, Button, Group, Paper, Text } from '@mantine/core';
import { useState } from 'react';
import { useConnectivity } from '../../hooks/useConnectivity';
import { getAppSync } from '../../offline/appSync';
import { selectIsSyncBlocked, useSyncStore } from '../../store/syncStore';
import { PendingItemsModal } from './PendingItemsModal';

/**
 * Franja fina con el estado de la conexión y de la cola de pendientes. Solo existe en la app
 * nativa y solo se ve si hay algo que contar: sin red, «Trabajar offline» o pendientes.
 */
export const ConnectivityBar = () => {
  const { isNative, isOnline, networkOnline } = useConnectivity();
  const pending = useSyncStore((state) => state.pending);
  const needsAttention = useSyncStore((state) => state.needsAttention);
  const syncing = useSyncStore((state) => state.syncing);
  const blocked = useSyncStore(selectIsSyncBlocked);
  const [listOpen, setListOpen] = useState(false);

  const total = pending + needsAttention;
  if (!isNative || (isOnline && total === 0)) return null;

  const message = !networkOnline ? 'Sin conexión' : !isOnline ? 'Modo offline activado' : null;

  return (
    <>
      <Paper
        withBorder
        radius="md"
        px="sm"
        py={6}
        mb="sm"
        bg={isOnline ? 'var(--mantine-color-blue-light)' : 'var(--mantine-color-yellow-light)'}
      >
        <Group justify="space-between" gap="xs" wrap="nowrap">
          <Group gap="xs">
            {message && (
              <Text size="sm" fw={600}>
                {message}
              </Text>
            )}
            {total > 0 && (
              <Badge
                variant="filled"
                color={needsAttention > 0 ? 'orange' : 'blue'}
                style={{ cursor: 'pointer' }}
                onClick={() => setListOpen(true)}
              >
                {total === 1 ? '1 pendiente' : `${total} pendientes`}
                {needsAttention > 0 ? ` · ${needsAttention} requieren atención` : ''}
              </Badge>
            )}
          </Group>
          {total > 0 && (
            <Button
              size="compact-sm"
              variant="light"
              loading={syncing}
              disabled={!isOnline || blocked}
              onClick={() => void getAppSync()?.syncNow()}
            >
              Sincronizar
            </Button>
          )}
        </Group>
      </Paper>
      <PendingItemsModal opened={listOpen} onClose={() => setListOpen(false)} />
    </>
  );
};

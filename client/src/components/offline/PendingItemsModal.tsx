import { Badge, Button, Group, Modal, Paper, Stack, Text } from '@mantine/core';
import { usePendingItems } from '../../hooks/usePendingItems';
import { describeOutboxItem } from '../../offline/outboxLabels';

interface PendingItemsModalProps {
  opened: boolean;
  onClose: () => void;
}

const STATUS_LABEL = {
  pendiente: { text: 'Pendiente', color: 'blue' },
  enviando: { text: 'Enviando', color: 'cyan' },
  'requiere-atencion': { text: 'Requiere atención', color: 'orange' },
} as const;

/** Lista de lo que espera para enviarse, con reintentar y descartar para cada elemento. */
export const PendingItemsModal = ({ opened, onClose }: PendingItemsModalProps) => {
  const { items, retry, discard } = usePendingItems();

  return (
    <Modal opened={opened} onClose={onClose} title="Pendientes de enviar" centered>
      <Stack gap="sm">
        {items.length === 0 && <Text c="dimmed">No hay nada pendiente.</Text>}
        {items.map((item) => {
          const status = STATUS_LABEL[item.status];
          return (
            <Paper key={item.id} withBorder p="sm" radius="md">
              <Stack gap={6}>
                <Group justify="space-between">
                  <Text fw={600}>{describeOutboxItem(item)}</Text>
                  <Badge color={status.color} variant="light">
                    {status.text}
                  </Badge>
                </Group>
                {item.reason && (
                  <Text size="sm" c="orange">
                    {item.reason}
                  </Text>
                )}
                <Group gap="xs">
                  {item.status === 'requiere-atencion' && (
                    <Button size="compact-sm" variant="light" onClick={() => void retry(item.id)}>
                      Reintentar
                    </Button>
                  )}
                  <Button
                    size="compact-sm"
                    variant="subtle"
                    color="red"
                    onClick={() => void discard(item.id)}
                  >
                    Descartar
                  </Button>
                </Group>
              </Stack>
            </Paper>
          );
        })}
      </Stack>
    </Modal>
  );
};

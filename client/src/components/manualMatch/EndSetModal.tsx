import { Button, Group, Modal, Stack, Text, Title } from '@mantine/core';
import { IconTrophy } from '@tabler/icons-react';

import type { SetSummary } from '../../types/manualMatch';
import { SetCategoriesGrid } from './SetCategoriesGrid';

interface EndSetModalProps {
  opened: boolean;
  /** Resumen del set recién terminado. */
  summary: SetSummary;
  onUndo: () => void;
  onConfirm: () => void;
}

/** Aviso «¡Set Finalizado!»: resultado y resumen del set; obliga a deshacer el último punto o avanzar. */
export const EndSetModal = ({ opened, summary, onUndo, onConfirm }: EndSetModalProps) => (
  <Modal
    opened={opened}
    onClose={() => {}}
    withCloseButton={false}
    centered
    closeOnClickOutside={false}
    size="lg"
  >
    <Stack align="center">
      <IconTrophy size={50} color="var(--mantine-color-yellow-5)" />
      <Title order={3}>¡Set Finalizado!</Title>
      <Text size="lg" fw={700}>
        {summary.myScore > summary.oppScore ? 'Has ganado' : 'Rival gana'} ({summary.myScore} -{' '}
        {summary.oppScore})
      </Text>

      <SetCategoriesGrid
        summary={summary}
        wonTitle="Tus Fortalezas (Ganados)"
        lostTitle="A Mejorar (Perdidos)"
        mt="md"
      />

      <Group grow w="100%" mt="md">
        <Button variant="subtle" color="red" onClick={onUndo}>
          Deshacer Último Punto
        </Button>
        <Button color="blue" onClick={onConfirm}>
          Avanzar al Siguiente Set
        </Button>
      </Group>
    </Stack>
  </Modal>
);

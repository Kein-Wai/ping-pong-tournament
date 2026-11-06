import { Button, Modal, Stack, Text } from '@mantine/core';

import type { SetSummary } from '../../types/manualMatch';
import { SetCategoriesGrid } from './SetCategoriesGrid';

interface MatchSummaryModalProps {
  opened: boolean;
  /** Puntos de todos los sets del partido, agrupados. */
  summary: SetSummary;
  onClose: () => void;
}

/** Modal «Total del partido»: los puntos de todos los sets juntos, con sus porcentajes. */
export const MatchSummaryModal = ({ opened, summary, onClose }: MatchSummaryModalProps) => (
  <Modal
    opened={opened}
    onClose={onClose}
    title={
      <Text fw={700} size="lg">
        Total del partido
      </Text>
    }
    centered
    size="lg"
  >
    <Stack align="center">
      <Text size="lg" fw={700}>
        Puntos del partido: {summary.myScore} - {summary.oppScore}
      </Text>
      <SetCategoriesGrid
        summary={summary}
        wonTitle="Tus Fortalezas"
        lostTitle="A Mejorar"
        mt="sm"
      />
      <Button fullWidth mt="md" onClick={onClose}>
        Cerrar Resumen
      </Button>
    </Stack>
  </Modal>
);

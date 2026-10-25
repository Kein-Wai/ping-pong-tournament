import { Button, Modal, Stack, Text } from '@mantine/core';

import type { SetSummary } from '../../types/manualMatch';
import { SetCategoriesGrid } from './SetCategoriesGrid';

interface SetSummaryModalProps {
  /** Set que se revisa; `null` mantiene el modal cerrado. */
  setNumber: number | null;
  summary: SetSummary | null;
  onClose: () => void;
}

/** Modal «Resumen del Set N»: resultado y puntos agrupados de un set ya jugado. */
export const SetSummaryModal = ({ setNumber, summary, onClose }: SetSummaryModalProps) => (
  <Modal
    opened={setNumber !== null}
    onClose={onClose}
    title={
      <Text fw={700} size="lg">
        Resumen del Set {setNumber}
      </Text>
    }
    centered
    size="lg"
  >
    {summary && (
      <Stack align="center">
        <Text size="lg" fw={700}>
          Resultado: {summary.myScore > summary.oppScore ? 'Ganaste' : 'Rival ganó'} (
          {summary.myScore} - {summary.oppScore})
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
    )}
  </Modal>
);

import { Badge, Group, Modal, Paper, SimpleGrid, Stack, Text } from '@mantine/core';

import type { ProgramDetails } from '../../types/generalTraining';
import { formatDate } from '../../utils/dates';

interface ProgramDetailsModalProps {
  opened: boolean;
  details: ProgramDetails | null;
  onClose: () => void;
}

/** Modal «Detalles del Programa»: resumen del bloque de sesiones al que pertenece una sesión. */
export const ProgramDetailsModal = ({ opened, details, onClose }: ProgramDetailsModalProps) => (
  <Modal
    opened={opened}
    onClose={onClose}
    title={
      <Text size="lg" fw={700}>
        Detalles del Programa
      </Text>
    }
    centered
  >
    {details && (
      <Stack gap="md">
        <Paper withBorder p="sm" bg="var(--mantine-color-gray-0)" style={{ darkHidden: true }}>
          <Text fw={600} size="sm">
            Descripción del Bloque
          </Text>
          <Text size="sm" c="dimmed">
            {details.description || 'Sin descripción especial.'}
          </Text>
        </Paper>

        <SimpleGrid cols={2}>
          <Paper withBorder p="sm" ta="center">
            <Text fw={600} size="xs" c="dimmed" tt="uppercase">
              Fecha de Inicio
            </Text>
            <Text fw={700} size="lg" c="blue.7">
              {formatDate(details.minDate)}
            </Text>
          </Paper>
          <Paper withBorder p="sm" ta="center">
            <Text fw={600} size="xs" c="dimmed" tt="uppercase">
              Fecha de Fin
            </Text>
            <Text fw={700} size="lg" c="red.7">
              {formatDate(details.maxDate)}
            </Text>
          </Paper>
        </SimpleGrid>

        <Group justify="space-between">
          <Text size="sm">
            <b>Horario Base:</b> {details.scheduleName || 'Antiguo/Desconocido'}
          </Text>
          <Badge color="blue" variant="light" size="lg">
            {details.sessionCount} Sesiones Totales
          </Badge>
        </Group>

        <Text fw={600} size="sm" mt="sm">
          Habilidades a entrenar:
        </Text>
        <Group gap="xs">
          {details.activeSkills.length === 0 ? (
            <Text size="sm" c="dimmed">
              No se seleccionó ninguna habilidad específica.
            </Text>
          ) : (
            details.activeSkills.map((s) => (
              <Badge key={s.key} color="orange" variant="dot">
                {s.label}
              </Badge>
            ))
          )}
        </Group>
      </Stack>
    )}
  </Modal>
);

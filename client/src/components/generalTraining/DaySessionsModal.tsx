import { ActionIcon, Badge, Box, Button, Center, Group, Modal, Paper, Stack, Text } from '@mantine/core';
import { IconInfoCircle } from '@tabler/icons-react';

import type { TrainingSession } from '../../types/generalTraining';
import { formatDate } from '../../utils/dates';

interface DaySessionsModalProps {
  opened: boolean;
  date: Date | null;
  sessions: TrainingSession[];
  getScheduleColor: (scheduleId?: string | null) => string;
  onClose: () => void;
  onViewProgram: (session: TrainingSession) => void;
  onViewAttendees: (session: TrainingSession) => void;
  onAttendance: (session: TrainingSession) => void;
}

/** Modal «Sesiones del día»: punto de entrada para ver el programa, los asistentes y pasar lista. */
export const DaySessionsModal = ({
  opened,
  date,
  sessions,
  getScheduleColor,
  onClose,
  onViewProgram,
  onViewAttendees,
  onAttendance,
}: DaySessionsModalProps) => (
  <Modal
    opened={opened}
    onClose={onClose}
    title={
      <Text size="lg" fw={700}>
        Sesiones del {date && formatDate(date)}
      </Text>
    }
    centered
  >
    <Stack gap="md">
      {sessions.length === 0 ? (
        <Center py="xl">
          <Text c="dimmed">No hay entrenamientos este día.</Text>
        </Center>
      ) : (
        sessions.map((tr) => {
          const isPast = new Date(tr.date) < new Date();
          return (
            <Paper key={tr.id} withBorder p="md" radius="md">
              <Group justify="space-between" align="center">
                <Group gap="xs">
                  {/* NUEVO: Circulito de color */}
                  <Box
                    w={14}
                    h={14}
                    style={{
                      borderRadius: '50%',
                      backgroundColor: `var(--mantine-color-${getScheduleColor(tr.scheduleId)}-5)`,
                    }}
                  />
                  <Text fw={700}>{tr.description || 'Entrenamiento Grupal'}</Text>
                  <ActionIcon
                    size="sm"
                    variant="light"
                    color="blue"
                    onClick={() => onViewProgram(tr)}
                  >
                    <IconInfoCircle size={16} />
                  </ActionIcon>
                </Group>
                {tr.schedule ? (
                  <Text size="sm" c="dimmed">
                    {tr.schedule.name} ({tr.schedule.startTime} - {tr.schedule.endTime})
                  </Text>
                ) : (
                  <Badge variant="light" color="gray" mt={4}>
                    Horario Antiguo
                  </Badge>
                )}
                <Group gap="xs">
                  {isPast && tr.attendances?.length > 0 && (
                    <Button variant="light" color="cyan" onClick={() => onViewAttendees(tr)}>
                      Ver Asistentes ({tr.attendances.length})
                    </Button>
                  )}
                  {tr.schedule && (
                    <Button
                      variant={isPast ? 'filled' : 'light'}
                      color={isPast ? 'green' : 'gray'}
                      onClick={() => onAttendance(tr)}
                    >
                      {isPast
                        ? tr.attendances?.length > 0
                          ? 'Editar Lista'
                          : 'Pasar Lista'
                        : 'Ver Inscritos'}
                    </Button>
                  )}
                </Group>
              </Group>
            </Paper>
          );
        })
      )}
    </Stack>
  </Modal>
);

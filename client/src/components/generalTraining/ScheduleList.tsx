import { ActionIcon, Badge, Box, Card, Group, Paper, Stack, Text, Title } from '@mantine/core';
import { IconEdit, IconPlus, IconTrash } from '@tabler/icons-react';

import { DAYS_OF_WEEK } from '../../constants/generalTrainings';
import type { GeneralTrainingSchedule } from '../../types/api';

interface ScheduleListProps {
  schedules: GeneralTrainingSchedule[];
  getScheduleColor: (scheduleId: string) => string;
  onAdd: () => void;
  onEdit: (schedule: GeneralTrainingSchedule) => void;
  onDelete: (id: string, name: string) => void;
}

/** Tarjeta «Clases Fijas»: los horarios base del club, con alta, edición y borrado. */
export const ScheduleList = ({
  schedules,
  getScheduleColor,
  onAdd,
  onEdit,
  onDelete,
}: ScheduleListProps) => (
  <Card shadow="sm" p="md" radius="md" withBorder>
    <Group justify="space-between" mb="md">
      <Title order={4}>Clases Fijas</Title>
      <ActionIcon color="blue" variant="light" onClick={onAdd}>
        <IconPlus size={18} />
      </ActionIcon>
    </Group>
    <Stack gap="xs">
      {schedules.map((sch) => (
        <Paper key={sch.id} withBorder p="sm" radius="md" bg="gray.0" style={{ darkHidden: true }}>
          <Group justify="space-between">
            <div>
              <Group gap="xs">
                <Box
                  w={12}
                  h={12}
                  style={{
                    borderRadius: '50%',
                    backgroundColor: `var(--mantine-color-${getScheduleColor(sch.id)}-5)`,
                  }}
                />
                <Text fw={600} size="sm">
                  {sch.name}
                </Text>
              </Group>
              <Text size="xs" c="dimmed">
                {sch.startTime} - {sch.endTime}
              </Text>
              <Group gap={4} mt={4}>
                {DAYS_OF_WEEK.map(
                  (d) =>
                    sch.daysOfWeek.includes(d.value) && (
                      <Badge key={d.value} size="xs" color="gray" variant="outline">
                        {d.label}
                      </Badge>
                    ),
                )}
              </Group>
            </div>
            <Group gap={4}>
              <ActionIcon color="blue" variant="subtle" onClick={() => onEdit(sch)}>
                <IconEdit size={16} />
              </ActionIcon>
              <ActionIcon color="red" variant="subtle" onClick={() => onDelete(sch.id, sch.name)}>
                <IconTrash size={16} />
              </ActionIcon>
            </Group>
          </Group>
        </Paper>
      ))}
      {schedules.length === 0 && (
        <Text size="sm" c="dimmed">
          No hay horarios configurados.
        </Text>
      )}
    </Stack>
  </Card>
);

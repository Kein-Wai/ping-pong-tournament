import { ActionIcon, Badge, Box, Button, Card, Group, Paper, SimpleGrid, Stack, Text, Title } from '@mantine/core';
import { IconChevronLeft, IconChevronRight, IconPlus } from '@tabler/icons-react';

import type { TrainingSession } from '../../types/generalTraining';
import { formatDate } from '../../utils/dates';
import { getSessionsOnDay } from '../../utils/general-trainings';

interface TrainingCalendarProps {
  currentDate: Date;
  /** Huecos previos al día 1 para que la semana empiece en lunes. */
  blanks: number;
  days: number[];
  trainings: TrainingSession[];
  getScheduleColor: (scheduleId?: string | null) => string;
  /** Sin horarios no se puede programar. */
  canProgram: boolean;
  onPrevMonth: () => void;
  onNextMonth: () => void;
  onDayClick: (dayNumber: number) => void;
  onProgram: () => void;
}

/** Calendario mensual de sesiones: cada día muestra una insignia por sesión y se puede abrir. */
export const TrainingCalendar = ({
  currentDate,
  blanks,
  days,
  trainings,
  getScheduleColor,
  canProgram,
  onPrevMonth,
  onNextMonth,
  onDayClick,
  onProgram,
}: TrainingCalendarProps) => (
  <Card shadow="sm" p="md" radius="md" withBorder style={{ gridColumn: 'span 2' }}>
    <Group justify="space-between" mb="md">
      <Group>
        <ActionIcon variant="light" onClick={onPrevMonth}>
          <IconChevronLeft size={18} />
        </ActionIcon>
        <Title order={3}>
          {formatDate(currentDate, { month: 'long', year: 'numeric' }).toUpperCase()}
        </Title>
        <ActionIcon variant="light" onClick={onNextMonth}>
          <IconChevronRight size={18} />
        </ActionIcon>
      </Group>
      <Button
        color="blue"
        leftSection={<IconPlus size={16} />}
        disabled={!canProgram}
        onClick={onProgram}
      >
        Programar
      </Button>
    </Group>

    <Box>
      <SimpleGrid cols={7} spacing={4} mb="xs">
        {['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'].map((day) => (
          <Text key={day} ta="center" size="sm" fw={700} c="dimmed">
            {day}
          </Text>
        ))}
      </SimpleGrid>

      <SimpleGrid cols={7} spacing={4}>
        {Array.from({ length: blanks }).map((_, i) => (
          <Box
            key={`blank-${i}`}
            style={{
              minHeight: 80,
              backgroundColor: 'var(--mantine-color-gray-1)',
              opacity: 0.5,
              borderRadius: 8,
            }}
          />
        ))}

        {days.map((dayNum) => {
          const dayDate = new Date(currentDate.getFullYear(), currentDate.getMonth(), dayNum);
          const isToday = new Date().toDateString() === dayDate.toDateString();
          const dayEvents = getSessionsOnDay(trainings, dayDate);

          return (
            <Paper
              key={dayNum}
              withBorder
              p={4}
              radius="md"
              style={{
                minHeight: 80,
                cursor: 'pointer',
                borderColor: isToday ? 'var(--mantine-color-blue-filled)' : undefined,
              }}
              onClick={() => onDayClick(dayNum)}
            >
              <Text
                size="sm"
                fw={isToday ? 900 : 500}
                c={isToday ? 'blue' : undefined}
                ta="right"
                mb={4}
              >
                {dayNum}
              </Text>
              <Stack gap={2}>
                {dayEvents.map((ev) => (
                  <Badge
                    key={ev.id}
                    size="xs"
                    color={getScheduleColor(ev.scheduleId)}
                    variant={new Date(ev.date) < new Date() ? 'light' : 'filled'}
                    fullWidth
                    style={{ overflow: 'hidden' }}
                  >
                    {ev.schedule ? ev.schedule.startTime : 'Antiguo'}
                  </Badge>
                ))}
              </Stack>
            </Paper>
          );
        })}
      </SimpleGrid>
    </Box>
  </Card>
);

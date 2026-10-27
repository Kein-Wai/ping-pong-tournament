import { ActionIcon, Button, Group, Paper, SimpleGrid, Stack, Text, Title } from '@mantine/core';
import { IconArrowDown, IconArrowUp, IconPlayerPlay, IconPlus, IconTrash } from '@tabler/icons-react';
import {
  WARMUP_EXERCISES,
  WARMUP_EXERCISES_BY_KEY,
  type WarmupExerciseKey,
} from '../../constants/warmupExercises';
import { formatDuration } from '../../utils/warmupFormat';
import {
  MAX_COURTESY_SEC,
  MAX_DURATION_SEC,
  MAX_ROUTINE_ITEMS,
  MIN_COURTESY_SEC,
  MIN_DURATION_SEC,
  type RoutineEntry,
} from '../../utils/warmupRoutine';
import { SecondsField } from './SecondsField';

export interface WarmupBuilderProps {
  entries: RoutineEntry[];
  totalSec: number;
  canAdd: boolean;
  onAdd: (exerciseKey: WarmupExerciseKey) => void;
  onRemove: (id: string) => void;
  onMove: (id: string, direction: 'up' | 'down') => void;
  onChangeDuration: (id: string, seconds: number) => void;
  onChangeCourtesy: (id: string, seconds: number) => void;
  onStart: () => void;
}

export const WarmupBuilder = ({
  entries,
  totalSec,
  canAdd,
  onAdd,
  onRemove,
  onMove,
  onChangeDuration,
  onChangeCourtesy,
  onStart,
}: WarmupBuilderProps) => {
  const count = entries.length;

  return (
    <Stack gap="lg">
      <Stack gap="xs">
        <Title order={4}>Añadir ejercicio</Title>
        <SimpleGrid cols={{ base: 1, xs: 2, md: 3 }} spacing="xs">
          {WARMUP_EXERCISES.map((exercise) => (
            <Button
              key={exercise.key}
              variant="light"
              justify="flex-start"
              leftSection={<IconPlus size={16} />}
              aria-label={`Añadir ${exercise.name}`}
              disabled={!canAdd}
              onClick={() => onAdd(exercise.key)}
            >
              {exercise.name}
            </Button>
          ))}
        </SimpleGrid>
        {!canAdd && (
          <Text size="sm" c="dimmed">
            Has llegado al máximo de {MAX_ROUTINE_ITEMS} ejercicios por rutina.
          </Text>
        )}
      </Stack>

      <Stack gap="xs">
        <Group justify="space-between" align="baseline">
          <Title order={4}>Tu rutina</Title>
          {count > 0 && (
            <Text size="sm" c="dimmed">
              {count} {count === 1 ? 'ejercicio' : 'ejercicios'} · {formatDuration(totalSec)}
            </Text>
          )}
        </Group>

        {count === 0 && (
          <Text size="sm" c="dimmed">
            Añade ejercicios para montar tu rutina de calentamiento.
          </Text>
        )}

        <Stack component="ul" gap="xs" p={0} m={0} style={{ listStyle: 'none' }}>
          {entries.map((entry, index) => {
            const position = index + 1;
            return (
              <Paper key={entry.id} component="li" withBorder p="sm" radius="md">
                <Group justify="space-between" wrap="wrap" gap="sm">
                  <Text fw={600} data-testid="nombre-ejercicio">
                    {WARMUP_EXERCISES_BY_KEY[entry.exerciseKey].name}
                  </Text>
                  <Group gap={4} wrap="nowrap">
                    <ActionIcon
                      variant="subtle"
                      aria-label={`Subir ejercicio ${position}`}
                      disabled={index === 0}
                      onClick={() => onMove(entry.id, 'up')}
                    >
                      <IconArrowUp size={18} />
                    </ActionIcon>
                    <ActionIcon
                      variant="subtle"
                      aria-label={`Bajar ejercicio ${position}`}
                      disabled={index === count - 1}
                      onClick={() => onMove(entry.id, 'down')}
                    >
                      <IconArrowDown size={18} />
                    </ActionIcon>
                    <ActionIcon
                      variant="subtle"
                      color="red"
                      aria-label={`Quitar ejercicio ${position}`}
                      onClick={() => onRemove(entry.id)}
                    >
                      <IconTrash size={18} />
                    </ActionIcon>
                  </Group>
                </Group>
                <Group mt="xs" gap="sm">
                  <SecondsField
                    label="Duración"
                    ariaLabel={`Duración del ejercicio ${position}`}
                    value={entry.durationSec}
                    min={MIN_DURATION_SEC}
                    max={MAX_DURATION_SEC}
                    step={15}
                    onCommit={(seconds) => onChangeDuration(entry.id, seconds)}
                  />
                  <SecondsField
                    label="Cortesía"
                    ariaLabel={`Cortesía del ejercicio ${position}`}
                    value={entry.courtesySec}
                    min={MIN_COURTESY_SEC}
                    max={MAX_COURTESY_SEC}
                    step={5}
                    onCommit={(seconds) => onChangeCourtesy(entry.id, seconds)}
                  />
                </Group>
              </Paper>
            );
          })}
        </Stack>
      </Stack>

      <Button size="lg" leftSection={<IconPlayerPlay size={20} />} disabled={count === 0} onClick={onStart}>
        ¡Preparado!
      </Button>
    </Stack>
  );
};

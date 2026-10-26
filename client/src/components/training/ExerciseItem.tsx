import { ActionIcon, Badge, Group, Paper, Text } from '@mantine/core';
import { IconTrash } from '@tabler/icons-react';
import type { SessionExercise } from '../../types/api';

/**
 * Tarjeta de un ejercicio dentro de una sesion.
 *
 * Es la pieza de UI que comparten el detalle de plan (que muestra el resumen
 * de los ejercicios de cada sesion) y el detalle de sesion (que muestra el
 * ejercicio completo con su descripcion). Antes cada una tinha su propia
 * copia: un cambio de formato obligaba a tocar las dos.
 */

/** Propiedades del ejercicio. */
export interface ExerciseItemProps {
  exercise: SessionExercise;
  /** Si se puede quitar el ejercicio de la sesion. */
  canRemove?: boolean;
  /** Callback al pulsar el icono de borrar. */
  onRemove?: (exerciseId: string) => void;
}

export const ExerciseItem = ({ exercise, canRemove = false, onRemove }: ExerciseItemProps) => {
  const meta = exercise.exercise;
  const hasSetsOrReps = Boolean(exercise.sets || exercise.reps);

  return (
    <Paper
      withBorder
      p="xs"
      radius="sm"
      bg={exercise.completed ? 'var(--mantine-color-green-light)' : 'var(--mantine-color-gray-0)'}
      style={{ darkHidden: true, transition: 'background-color 0.3s' }}
    >
      <Group justify="space-between" wrap="nowrap">
        <Group gap="xs" style={{ flex: 1 }}>
          <Text
            size="sm"
            fw={600}
            truncate
            td={exercise.completed ? 'line-through' : 'none'}
            c={exercise.completed ? 'dimmed' : 'inherit'}
          >
            {meta?.code ? `[${meta.code}] ` : ''}
            {meta?.name}
          </Text>
        </Group>

        <Group gap="xs">
          {hasSetsOrReps && (
            <Badge size="sm" variant="light" color={exercise.completed ? 'green' : 'blue'}>
              {exercise.sets || '-'}x{exercise.reps || '-'}
            </Badge>
          )}
          {exercise.durationMinutes && (
            <Badge size="sm" variant="light" color={exercise.completed ? 'green' : 'teal'}>
              {exercise.durationMinutes} min
            </Badge>
          )}

          {canRemove && onRemove && (
            <ActionIcon color="red" variant="subtle" size="sm" onClick={() => onRemove(exercise.id)}>
              <IconTrash size={14} />
            </ActionIcon>
          )}
        </Group>
      </Group>
    </Paper>
  );
};

export default ExerciseItem;

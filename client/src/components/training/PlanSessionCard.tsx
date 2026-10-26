import { Badge, Button, Card, Center, Group, Stack, Text } from '@mantine/core';
import { IconBarbell, IconCheck, IconCopy, IconPlus } from '@tabler/icons-react';
import { useNavigate } from 'react-router-dom';
import { APP_ROUTES } from '../../constants/routes';
import { ExerciseItem } from './ExerciseItem';
import { MAX_EXERCISES_PER_SESSION, type PlanSession } from '../../hooks/useTrainingPlan';

/**
 * Tarjeta de una sesion dentro del detalle de un plan: su estado, el acceso a
 * la sesion y la gestion de sus ejercicios.
 */

/** Propiedades de la tarjeta. */
export interface PlanSessionCardProps {
  session: PlanSession;
  /** Numero de sesion (1, 2, 3...). */
  index: number;
  /** Si el usuario puede anadir o clonar ejercicios. */
  isAdmin: boolean;
  /** Si hay sesiones con ejercicios que se puedan clonar. */
  canClone: boolean;
  /** Abre el modal de anadir ejercicio a esta sesion. */
  onAddExercise: (sessionId: string) => void;
  /** Abre el modal de clonar hacia esta sesion. */
  onCloneSession: (sessionId: string, sessionNumber: number) => void;
  /** Pide quitar un ejercicio de la sesion. */
  onRemoveExercise: (sessionExerciseId: string) => void;
}

export const PlanSessionCard = ({
  session,
  index,
  isAdmin,
  canClone,
  onAddExercise,
  onCloneSession,
  onRemoveExercise,
}: PlanSessionCardProps) => {
  const navigate = useNavigate();

  const exercises = session.exercises ?? [];
  const isSessionEmpty = exercises.length === 0;
  const completedExercises = exercises.filter((exercise) => exercise.completed).length;
  const isSessionCompleted = !isSessionEmpty && completedExercises === exercises.length;
  const isAtLimit = exercises.length >= MAX_EXERCISES_PER_SESSION;

  return (
    <Card shadow="sm" radius="md" withBorder>
      <Group justify="space-between" mb="md">
        <Text fw={700}>Sesión {index + 1}</Text>

        {isSessionEmpty ? (
          <Badge color="gray" variant="light">
            Vacía
          </Badge>
        ) : isSessionCompleted ? (
          <Badge color="green" variant="filled" leftSection={<IconCheck size={14} />}>
            Completada
          </Badge>
        ) : (
          <Badge color="blue" variant="light" tt="none">
            Progreso: {completedExercises} / {exercises.length}
          </Badge>
        )}
      </Group>

      <Button
        fullWidth
        variant="light"
        color="blue"
        mb="md"
        leftSection={<IconBarbell size={16} />}
        onClick={() => navigate(APP_ROUTES.ENTRENAMIENTOS.SESSION(session.id))}
      >
        Entrar a la Sesión
      </Button>

      <Stack gap="xs" mb="md" style={{ minHeight: 80 }}>
        {isSessionEmpty ? (
          <Center h="100%">
            <Text size="sm" c="dimmed" fs="italic">
              Sin ejercicios asignados
            </Text>
          </Center>
        ) : (
          exercises.map((exercise) => (
            <ExerciseItem
              key={exercise.id}
              exercise={exercise}
              canRemove={isAdmin}
              onRemove={onRemoveExercise}
            />
          ))
        )}
      </Stack>

      {isAdmin && (
        <Group grow mt="xs">
          <Button
            variant="light"
            color="orange"
            leftSection={<IconPlus size={16} />}
            disabled={isAtLimit}
            onClick={() => onAddExercise(session.id)}
          >
            {isAtLimit ? `Límite (${MAX_EXERCISES_PER_SESSION})` : 'Añadir'}
          </Button>

          <Button
            variant="subtle"
            color="gray"
            leftSection={<IconCopy size={16} />}
            disabled={isAtLimit || !canClone}
            onClick={() => onCloneSession(session.id, index + 1)}
          >
            Clonar
          </Button>
        </Group>
      )}
    </Card>
  );
};

export default PlanSessionCard;

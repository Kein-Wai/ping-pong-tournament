import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Title,
  Text,
  Button,
  Group,
  Stack,
  SimpleGrid,
  ThemeIcon,
  Center,
  Loader,
  Paper,
  Alert,
} from '@mantine/core';
import {
  IconCalendar,
  IconArrowLeft,
  IconTrash,
  IconInfoCircle,
  IconTarget,
  IconTrendingUp,
  IconTrendingDown,
} from '@tabler/icons-react';
import { openAppConfirmModal } from '../../utils/modals';
import { usePermissions } from '../../hooks/usePermissions';
import { useTrainingPlan } from '../../hooks/useTrainingPlan';
import { AddExerciseModal } from '../../components/training/AddExerciseModal';
import { CloneSessionModal } from '../../components/training/CloneSessionModal';
import { PlanSessionCard } from '../../components/training/PlanSessionCard';
import { APP_ROUTES } from '../../constants/routes';

export const PlanDetalles = () => {
  const { planId } = useParams();
  const navigate = useNavigate();

  const {
    plan: planData,
    sessions,
    catalog,
    isLoading: loading,
    isSubmitting,
    availableSourceSessions,
    addExercise,
    cloneSession,
    removeExercise,
  } = useTrainingPlan(planId);

  // Sesion sobre la que esta abierto el modal de añadir (null = cerrado).
  const [addTargetId, setAddTargetId] = useState<string | null>(null);

  // El destino se conserva al cerrar para que el titulo no cambie durante la animacion.
  const [cloneModalOpened, setCloneModalOpened] = useState(false);
  const [targetSession, setTargetSession] = useState<{ id: string; number: number } | null>(null);

  const { isAdmin } = usePermissions();

  const openCloneModal = (targetId: string, targetNumber: number) => {
    setTargetSession({ id: targetId, number: targetNumber });
    setCloneModalOpened(true);
  };

  const handleDeleteExercise = (sessionExerciseId: string) => {
    openAppConfirmModal({
      title: 'Quitar Ejercicio',
      icon: <IconTrash size={18} />,
      color: 'red',
      description: '¿Estás seguro de quitar este ejercicio de la sesión?',
      highlightText: 'Esta acción no se puede deshacer',
      confirmLabel: 'Sí, quitar',
      onConfirm: async () => {
        await removeExercise(sessionExerciseId);
      },
    });
  };

  if (loading) {
    return (
      <Center h={400}>
        <Loader color="orange" />
      </Center>
    );
  }

  return (
    <Stack gap="xl" maw={1000} mx="auto">
      <div>
        <Button
          variant="subtle"
          leftSection={<IconArrowLeft size={16} />}
          onClick={() => {
            if (planData?.playerId) {
              // Te lleva directamente al perfil del jugador
              navigate(APP_ROUTES.JUGADORES.PROFILE(planData.playerId));
            } else {
              navigate(-1); // Respaldo por si aún no ha cargado
            }
          }}
        >
          Volver atrás
        </Button>
      </div>

      <Group justify="space-between" align="center">
        <Group gap="sm">
          <ThemeIcon size={50} radius="md" color="orange" variant="light">
            <IconCalendar size={28} />
          </ThemeIcon>
          <div>
            <Title order={2}>Detalles del Macrociclo</Title>
            <Text c="dimmed" size="sm">
              Gestiona las sesiones de este plan.
            </Text>
          </div>
        </Group>
      </Group>

      {planData && (
        <Paper
          withBorder
          p="md"
          radius="md"
          bg="var(--mantine-color-gray-0)"
          style={{ darkHidden: true }}
        >
          <SimpleGrid cols={{ base: 1, sm: 3 }} spacing="md">
            <Stack gap="xs">
              <Group gap="xs">
                <ThemeIcon color="green" variant="light" size="sm">
                  <IconTrendingUp size={16} />
                </ThemeIcon>
                <Text fw={600} size="sm">
                  Fortalezas
                </Text>
              </Group>
              <Text size="sm" c="dimmed" style={{ whiteSpace: 'pre-wrap' }}>
                {planData.strengths || 'No especificadas'}
              </Text>
            </Stack>

            <Stack gap="xs">
              <Group gap="xs">
                <ThemeIcon color="red" variant="light" size="sm">
                  <IconTrendingDown size={16} />
                </ThemeIcon>
                <Text fw={600} size="sm">
                  A Mejorar
                </Text>
              </Group>
              <Text size="sm" c="dimmed" style={{ whiteSpace: 'pre-wrap' }}>
                {planData.weaknesses || 'No especificadas'}
              </Text>
            </Stack>

            <Stack gap="xs">
              <Group gap="xs">
                <ThemeIcon color="blue" variant="light" size="sm">
                  <IconTarget size={16} />
                </ThemeIcon>
                <Text fw={600} size="sm">
                  Objetivos del Plan
                </Text>
              </Group>
              <Text size="sm" c="dimmed" style={{ whiteSpace: 'pre-wrap' }}>
                {planData.objectives || 'No especificados'}
              </Text>
            </Stack>
          </SimpleGrid>
        </Paper>
      )}

      <Title order={4}>Sesiones Programadas</Title>

      <Alert
        variant="light"
        color="blue"
        title="Fechas Flexibles"
        icon={<IconInfoCircle />}
        mb="sm"
      >
        Las fechas mostradas en cada sesión son <strong>orientativas</strong> para ayudar a
        distribuir la carga de trabajo semanal. El jugador puede completar los ejercicios a su
        propio ritmo.
      </Alert>

      {/* GRID DE SESIONES */}
      <SimpleGrid cols={{ base: 1, sm: 2, md: 3 }} spacing="md">
        {sessions.map((session, index) => (
          <PlanSessionCard
            key={session.id}
            session={session}
            index={index}
            isAdmin={isAdmin}
            canClone={availableSourceSessions.length > 0}
            onAddExercise={setAddTargetId}
            onCloneSession={openCloneModal}
            onRemoveExercise={handleDeleteExercise}
          />
        ))}
      </SimpleGrid>

      <AddExerciseModal
        opened={addTargetId !== null}
        onClose={() => setAddTargetId(null)}
        catalog={catalog}
        isSubmitting={isSubmitting}
        onSubmit={(payload) => addExercise(addTargetId as string, payload)}
      />

      <CloneSessionModal
        opened={cloneModalOpened}
        onClose={() => setCloneModalOpened(false)}
        targetSession={targetSession}
        sourceSessions={availableSourceSessions}
        isSubmitting={isSubmitting}
        onSubmit={(sourceSessionId) =>
          cloneSession((targetSession as { id: string }).id, sourceSessionId)
        }
      />
    </Stack>
  );
};

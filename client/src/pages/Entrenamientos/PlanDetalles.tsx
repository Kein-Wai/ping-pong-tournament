import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Card,
  Title,
  Text,
  Button,
  Group,
  Stack,
  SimpleGrid,
  ThemeIcon,
  Center,
  Loader,
  Modal,
  Select,
  NumberInput,
  Badge,
  ActionIcon,
  Paper,
  Alert,
} from '@mantine/core';
import {
  IconCalendar,
  IconPlus,
  IconArrowLeft,
  IconBarbell,
  IconTrash,
  IconCopy,
  IconInfoCircle,
  IconCheck,
} from '@tabler/icons-react';
import { api } from '../../api/axios';
import { ENDPOINTS } from '../../api/endpoints';
import { openAppConfirmModal } from '../../utils/modals';
import { EXERCISE_CATEGORIES } from '../../constants/constants'; // Asegúrate de que la ruta es correcta
import { useAuthStore } from '../../store/authStore';
import { APP_ROUTES } from '../../constants/routes';

export const PlanDetalles = () => {
  const { planId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuthStore();

  // Estados del Plan
  const [loading, setLoading] = useState(true);
  const [sessions, setSessions] = useState<any[]>([]);

  // Catálogo Raw para filtrado dinámico
  const [rawCatalog, setRawCatalog] = useState<any[]>([]);

  // Estados del Modal Añadir
  const [modalOpened, setModalOpened] = useState(false);
  const [modalCategoryFilter, setModalCategoryFilter] = useState<string | null>(null);
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(null);
  const [exerciseId, setExerciseId] = useState<string | null>(null);
  const [sets, setSets] = useState<number | string>('');
  const [reps, setReps] = useState<number | string>('');
  const [duration, setDuration] = useState<number | string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Estados del Modal Clonar
  const [cloneModalOpened, setCloneModalOpened] = useState(false);
  const [targetSession, setTargetSession] = useState<{ id: string; number: number } | null>(null);
  const [sourceSessionId, setSourceSessionId] = useState<string | null>(null);

  const isAdmin = user?.role === 'AdminClub' || user?.role === 'SuperAdmin';

  // 1. Cargar Plan
  const fetchPlanDetails = async () => {
    if (!planId) return;
    try {
      const response = await api.get(`${ENDPOINTS.TRAININGS.BASE}/${planId}`);
      const data = response.data.data;
      setSessions(data.sessions || []);
    } catch (error) {
      console.error('Error al cargar el plan:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPlanDetails();
  }, [planId]);

  // 2. Cargar Catálogo (Una sola vez)
  useEffect(() => {
    api
      .get(ENDPOINTS.EXERCISES.BASE)
      .then((res) => {
        setRawCatalog(res.data.data);
      })
      .catch((err) => console.error('Error cargando catálogo', err));
  }, []);

  // Filtramos los ejercicios según la categoría elegida en el Modal
  const filteredCatalogOptions = rawCatalog
    .filter((ex) => !modalCategoryFilter || ex.category === modalCategoryFilter)
    .map((ex) => ({
      value: ex.id,
      label: `${ex.code ? `[${ex.code}] ` : ''}${ex.name}`,
    }));

  // Filtramos las sesiones que tienen ejercicios para el modal de clonación
  const availableSourceSessions = sessions
    .map((s, idx) => ({
      id: s.id,
      number: idx + 1,
      count: s.exercises?.length || 0,
    }))
    .filter((s) => s.count > 0 && s.id !== targetSession?.id)
    .map((s) => ({
      value: s.id,
      label: `Sesión ${s.number} (${s.count} ejercicios)`,
    }));

  // Manejadores de Modales
  const openAddModal = (sessionId: string) => {
    setSelectedSessionId(sessionId);
    setExerciseId(null);
    setSets('');
    setReps('');
    setDuration('');
    setModalOpened(true);
  };

  const openCloneModal = (targetId: string, targetNumber: number) => {
    setTargetSession({ id: targetId, number: targetNumber });
    setSourceSessionId(null);
    setCloneModalOpened(true);
  };

  // Acciones (API)
  const handleAddExercise = async () => {
    if (!selectedSessionId || !exerciseId) return;
    setIsSubmitting(true);

    try {
      const payload = {
        exerciseId,
        sets: sets ? Number(sets) : undefined,
        reps: reps ? Number(reps) : undefined,
        durationMinutes: duration ? Number(duration) : undefined,
      };

      await api.post(ENDPOINTS.TRAININGS.SESSIONS(selectedSessionId), payload);

      await fetchPlanDetails();
      setModalOpened(false);
    } catch (error) {
      console.error(error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleExecuteClone = async () => {
    if (!targetSession || !sourceSessionId) return;
    try {
      await api.post(ENDPOINTS.TRAININGS.CLONE_SESSION(targetSession.id, sourceSessionId));
      setCloneModalOpened(false);
      await fetchPlanDetails();
    } catch (error) {
      console.error('Error al clonar sesión:', error);
    }
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
        try {
          await api.delete(ENDPOINTS.TRAININGS.DELETE_EXERCISE(sessionExerciseId));
          await fetchPlanDetails();
        } catch (error) {
          console.error('Error al quitar ejercicio:', error);
        }
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
          onClick={() => navigate(-1)}
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
        {sessions.map((session, index) => {
          const isSessionEmpty = session.exercises.length === 0;
          const completedExercises = session.exercises.filter((ex: any) => ex.completed).length;
          const isSessionCompleted =
            !isSessionEmpty && completedExercises === session.exercises.length;

          return (
            <Card key={session.id} shadow="sm" radius="md" withBorder>
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
                    Progreso: {completedExercises} / {session.exercises.length}
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
                {session.exercises.length === 0 ? (
                  <Center h="100%">
                    <Text size="sm" c="dimmed" fs="italic">
                      Sin ejercicios asignados
                    </Text>
                  </Center>
                ) : (
                  session.exercises.map((item: any) => (
                    <Paper
                      key={item.id}
                      withBorder
                      p="xs"
                      radius="sm"
                      bg={
                        item.completed
                          ? 'var(--mantine-color-green-light)'
                          : 'var(--mantine-color-gray-0)'
                      }
                      style={{ darkHidden: true, transition: 'background-color 0.3s' }}
                    >
                      <Group justify="space-between" wrap="nowrap">
                        {/* CHECKBOX INTERACTIVO */}
                        <Group gap="xs" style={{ flex: 1 }}>
                          <Text
                            size="sm"
                            fw={600}
                            truncate
                            td={item.completed ? 'line-through' : 'none'}
                            c={item.completed ? 'dimmed' : 'inherit'}
                          >
                            {item.exercise?.code ? `[${item.exercise.code}] ` : ''}
                            {item.exercise?.name}
                          </Text>
                        </Group>

                        <Group gap="xs">
                          {(item.sets || item.reps) && (
                            <Badge
                              size="sm"
                              variant="light"
                              color={item.completed ? 'green' : 'blue'}
                            >
                              {item.sets || '-'}x{item.reps || '-'}
                            </Badge>
                          )}
                          {item.durationMinutes && (
                            <Badge
                              size="sm"
                              variant="light"
                              color={item.completed ? 'green' : 'teal'}
                            >
                              {item.durationMinutes} min
                            </Badge>
                          )}

                          {/* BOTÓN DE BORRAR (SOLO ADMIN) */}
                          {isAdmin && (
                            <ActionIcon
                              color="red"
                              variant="subtle"
                              size="sm"
                              onClick={() => handleDeleteExercise(item.id)}
                            >
                              <IconTrash size={14} />
                            </ActionIcon>
                          )}
                        </Group>
                      </Group>
                    </Paper>
                  ))
                )}
              </Stack>

              {/* BOTONES DE LA TARJETA */}
              {isAdmin && (
                <Group grow mt="xs">
                  <Button
                    variant="light"
                    color="orange"
                    leftSection={<IconPlus size={16} />}
                    disabled={session.exercises.length >= 6}
                    onClick={() => openAddModal(session.id)}
                  >
                    {session.exercises.length >= 6 ? 'Límite (6)' : 'Añadir'}
                  </Button>

                  <Button
                    variant="subtle"
                    color="gray"
                    leftSection={<IconCopy size={16} />}
                    disabled={session.exercises.length >= 6 || availableSourceSessions.length === 0}
                    onClick={() => openCloneModal(session.id, index + 1)}
                  >
                    Clonar
                  </Button>
                </Group>
              )}
            </Card>
          );
        })}
      </SimpleGrid>

      {/* MODAL PARA AÑADIR EJERCICIO */}
      <Modal
        opened={modalOpened}
        onClose={() => setModalOpened(false)}
        title={
          <Group gap="xs">
            <IconBarbell color="orange" />
            <Title order={4}>Asignar Ejercicio</Title>
          </Group>
        }
        centered
      >
        <Stack gap="md">
          <Select
            label="Filtrar por Categoría"
            placeholder="Todas las categorías"
            data={EXERCISE_CATEGORIES}
            value={modalCategoryFilter}
            onChange={(val) => {
              setModalCategoryFilter(val);
              setExerciseId(null);
            }}
            clearable
          />

          <Select
            label="Selecciona un ejercicio"
            placeholder="Busca por nombre o código..."
            data={filteredCatalogOptions}
            value={exerciseId}
            onChange={setExerciseId}
            searchable
            required
            nothingFoundMessage="No hay ejercicios en esta categoría"
          />

          <Group grow>
            <NumberInput
              label="Series"
              placeholder="Opcional"
              min={1}
              value={sets}
              onChange={setSets}
            />
            <NumberInput
              label="Repeticiones"
              placeholder="Opcional"
              min={1}
              value={reps}
              onChange={setReps}
            />
          </Group>

          <NumberInput
            label="Duración (Minutos)"
            placeholder="Opcional (Ej. para calentamiento/físico)"
            min={1}
            value={duration}
            onChange={setDuration}
          />

          <Button
            color="orange"
            fullWidth
            mt="md"
            onClick={handleAddExercise}
            loading={isSubmitting}
            disabled={!exerciseId}
          >
            Añadir a la Sesión
          </Button>
        </Stack>
      </Modal>

      {/* MODAL PARA CLONAR SESIÓN */}
      <Modal
        opened={cloneModalOpened}
        onClose={() => setCloneModalOpened(false)}
        title={
          <Group gap="xs">
            <IconCopy color="blue" />
            <Title order={4}>Clonar Ejercicios a Sesión {targetSession?.number}</Title>
          </Group>
        }
        centered
      >
        <Stack gap="md">
          <Text size="sm" c="dimmed">
            Selecciona la sesión de la cual deseas copiar todos los ejercicios:
          </Text>

          <Select
            label="Sesión Origen"
            placeholder="Selecciona una sesión con ejercicios..."
            data={availableSourceSessions}
            value={sourceSessionId}
            onChange={setSourceSessionId}
            required
          />

          <Button
            color="blue"
            fullWidth
            mt="md"
            disabled={!sourceSessionId}
            onClick={handleExecuteClone}
          >
            Copiar Ejercicios
          </Button>
        </Stack>
      </Modal>
    </Stack>
  );
};

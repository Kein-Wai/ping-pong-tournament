import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Card,
  Title,
  Text,
  Button,
  Group,
  Stack,
  Center,
  Loader,
  Alert,
  Badge,
  Paper,
  Accordion,
  Table,
  ThemeIcon,
  SimpleGrid,
  Textarea,
} from '@mantine/core';
import { IconArrowLeft, IconBook, IconCheck } from '@tabler/icons-react';
import { api } from '../../api/axios';
import { ENDPOINTS } from '../../api/endpoints';

// Rellena esto con los datos exactos de tu foto
const NOMENCLATURA = [
  { sigla: 'A', desc: 'JUGADOR A' },
  { sigla: 'B', desc: 'JUGADOR B' },
  { sigla: 'D', desc: 'DRIVE O DERECHA' },
  { sigla: 'R', desc: 'REVES' },
  { sigla: 'T', desc: 'TOP SPIN' },
  { sigla: 'BL', desc: 'BLOQUEO' },
  { sigla: 'F', desc: 'FLIP' },
  { sigla: 'RE', desc: 'RECEPCION' },
  { sigla: 'C', desc: 'CORTO' },
  { sigla: 'L', desc: 'LARGO' },
  { sigla: 'LI', desc: 'LIBRE' },
  { sigla: 'CT', desc: 'CONTRA TOP SPIN' },
  { sigla: 'PR', desc: 'PUNTA DEL LADO DEL REVES' },
  { sigla: 'ME', desc: 'MEDIO' },
  { sigla: 'PD', desc: 'PUNTA DEL LADO DEL DRIVE' },
];

export const SessionDetalles = () => {
  const { sessionId } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [session, setSession] = useState<any>(null);

  // const isOwnProfile = currentUser?.id === id;

  const fetchSession = async () => {
    try {
      const res = await api.get(ENDPOINTS.TRAININGS.SESSION_DETAILS(sessionId!));
      console.log(res.data.data);
      setSession(res.data.data);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (sessionId) fetchSession();
  }, [sessionId]);

  const handleToggleCompleted = async (sessionExerciseId: string, currentStatus: boolean) => {
    try {
      await api.put(ENDPOINTS.TRAININGS.UPDATE_EXERCISE(sessionExerciseId), {
        completed: !currentStatus,
      });
      await fetchSession(); // Recargamos para reflejar el check
    } catch (error) {
      console.error('Error al actualizar:', error);
    }
  };

  const handleUpdateNotes = async (sessionExerciseId: string, notes: string) => {
    try {
      await api.put(ENDPOINTS.TRAININGS.UPDATE_EXERCISE(sessionExerciseId), {
        notes, // Mandamos solo las notas al backend
      });
      // No recargamos la página aquí para no interrumpir al usuario mientras escribe
    } catch (error) {
      console.error('Error al guardar las notas:', error);
    }
  };

  const half = Math.ceil(NOMENCLATURA.length / 2);
  const col1 = NOMENCLATURA.slice(0, half);
  const col2 = NOMENCLATURA.slice(half);

  if (loading)
    return (
      <Center h={400}>
        <Loader color="orange" />
      </Center>
    );
  if (!session)
    return (
      <Center h={400}>
        <Text>Sesión no encontrada</Text>
      </Center>
    );

  return (
    <Stack gap="lg" maw={800} mx="auto">
      <Button
        variant="subtle"
        leftSection={<IconArrowLeft size={16} />}
        onClick={() => navigate(-1)}
        w="max-content"
      >
        Volver al Macrociclo
      </Button>

      <Title order={2}>Entrenamiento del Día</Title>

      {/* TABLA DE REFERENCIA (NOMENCLATURAS) */}
      <Accordion variant="separated" radius="md">
        <Accordion.Item value="nomenclatura">
          <Accordion.Control icon={<IconBook size={20} color="var(--mantine-color-blue-6)" />}>
            <Text fw={600}>Tabla de Referencia (Nomenclaturas)</Text>
          </Accordion.Control>
          <Accordion.Panel>
            {/* 2. Usamos SimpleGrid para poner las dos tablas lado a lado */}
            <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="xl">
              {/* Primera Columna */}
              <Table striped verticalSpacing="xs">
                <Table.Thead>
                  <Table.Tr>
                    <Table.Th w={80}>Sigla</Table.Th>
                    <Table.Th>Descripción</Table.Th>
                  </Table.Tr>
                </Table.Thead>
                <Table.Tbody>
                  {col1.map((n) => (
                    <Table.Tr key={n.sigla}>
                      <Table.Td>
                        <Badge color="gray">{n.sigla}</Badge>
                      </Table.Td>
                      <Table.Td>
                        <Text size="sm">{n.desc}</Text>
                      </Table.Td>
                    </Table.Tr>
                  ))}
                </Table.Tbody>
              </Table>

              {/* Segunda Columna */}
              <Table striped verticalSpacing="xs">
                <Table.Thead>
                  <Table.Tr>
                    <Table.Th w={80}>Sigla</Table.Th>
                    <Table.Th>Descripción</Table.Th>
                  </Table.Tr>
                </Table.Thead>
                <Table.Tbody>
                  {col2.map((n) => (
                    <Table.Tr key={n.sigla}>
                      <Table.Td>
                        <Badge color="gray">{n.sigla}</Badge>
                      </Table.Td>
                      <Table.Td>
                        <Text size="sm">{n.desc}</Text>
                      </Table.Td>
                    </Table.Tr>
                  ))}
                </Table.Tbody>
              </Table>
            </SimpleGrid>
          </Accordion.Panel>
        </Accordion.Item>
      </Accordion>

      {/* LISTA DE EJERCICIOS A REALIZAR */}
      <Title order={4} mt="md">
        Ejercicios a Ejecutar
      </Title>
      {session.exercises.length > 0 &&
        session.exercises.filter((ex: any) => ex.completed).length === session.exercises.length && (
          <Alert variant="light" color="green" title="¡Gran trabajo!" icon={<IconCheck />} mb="md">
            Has completado todos los ejercicios de esta sesión. Puedes volver al Macrociclo cuando
            quieras.
          </Alert>
        )}

      {session.exercises.length === 0 ? (
        <Text c="dimmed">No hay ejercicios asignados a esta sesión.</Text>
      ) : (
        session.exercises.map((item: any, index: number) => (
          <Card key={item.id} shadow="sm" radius="md" withBorder>
            <Group justify="space-between" align="flex-start" mb="xs">
              <Group gap="sm" style={{ flex: 1 }}>
                <ThemeIcon
                  size="lg"
                  radius="md"
                  color={item.completed ? 'green' : 'blue'}
                  variant="light"
                >
                  {item.completed ? <IconCheck /> : <Text fw={700}>{index + 1}</Text>}
                </ThemeIcon>
                <Title
                  order={5}
                  style={{ textDecoration: item.completed ? 'line-through' : 'none' }}
                >
                  {item.exercise?.code ? `[${item.exercise.code}] ` : ''}
                  {item.exercise?.name}
                </Title>
              </Group>

              <Group gap="xs">
                {(item.sets || item.reps) && (
                  <Badge size="lg" variant="light" color={item.completed ? 'green' : 'blue'}>
                    {item.sets || '-'} x {item.reps || '-'}
                  </Badge>
                )}
                {item.durationMinutes && (
                  <Badge size="lg" variant="light" color={item.completed ? 'green' : 'teal'}>
                    {item.durationMinutes} min
                  </Badge>
                )}
              </Group>
            </Group>

            <Paper
              withBorder
              p="sm"
              bg="var(--mantine-color-gray-0)"
              mt="sm"
              style={{ darkHidden: true }}
            >
              <Text size="sm" style={{ whiteSpace: 'pre-wrap' }}>
                {item.exercise?.description || 'Sin descripción detallada.'}
              </Text>
            </Paper>

            <Textarea
              label="Mis anotaciones / Feedback"
              placeholder="Ej: Sensaciones, peso utilizado, dificultades..."
              defaultValue={item.notes || ''}
              onBlur={(e) => handleUpdateNotes(item.id, e.currentTarget.value)}
              disabled={item.completed ? true : false}
              mt="md"
              autosize
              minRows={2}
            />

            <Button
              fullWidth
              mt="md"
              variant={item.completed ? 'outline' : 'filled'}
              color={item.completed ? 'gray' : 'green'}
              leftSection={<IconCheck size={16} />}
              onClick={() => handleToggleCompleted(item.id, item.completed)}
            >
              {item.completed ? 'Desmarcar Ejercicio' : 'Marcar como Completado'}
            </Button>
          </Card>
        ))
      )}
    </Stack>
  );
};

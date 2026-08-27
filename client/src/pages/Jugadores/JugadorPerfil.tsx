import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Card,
  Avatar,
  Text,
  Group,
  Button,
  SimpleGrid,
  Title,
  Center,
  Loader,
  Badge,
  Paper,
  ThemeIcon,
  Stack,
  Table,
  ScrollArea,
  Modal,
  TextInput,
  ActionIcon,
} from '@mantine/core';
import {
  IconArrowLeft,
  IconTrophy,
  IconPingPong,
  IconChartBar,
  IconMathSymbols,
  IconHistory,
  IconEdit,
  IconClipboardList,
  IconTrash,
  IconTrendingUp,
  IconTrendingDown,
  IconTarget,
} from '@tabler/icons-react';
import { RadarChart } from '@mantine/charts'; // 👈 IMPORTAMOS EL RADAR
import { api } from '../../api/axios';
import { ENDPOINTS } from '../../api/endpoints';
import { APP_ROUTES } from '../../constants/routes';
import { useAuthStore } from '../../store/authStore';
import { getPlayerAvatar } from '../../utils/avatar';
import { openAppConfirmModal } from '../../utils/modals';

// ... (Mantenemos tus interfaces iguales)
interface UserProfile {
  id: string;
  email: string;
  name: string;
  surname?: string;
  nickname?: string;
  avatarUrl?: string | null;
  stats?: {
    elo: number;
    matchWon: number;
    matchLost: number;
    setWon: number;
    setLost: number;
    pointWon: number;
    pointLost: number;
    tournamentWon: number;
    tournamentLost: number;
  };
}

export const JugadorPerfil = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user: currentUser, updateUserFields } = useAuthStore();

  const [player, setPlayer] = useState<UserProfile | null>(null);
  const [recentMatches, setRecentMatches] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const [editModalOpened, setEditModalOpened] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editData, setEditData] = useState({ name: '', surname: '', nickname: '', avatarUrl: '' });
  const [trainings, setTrainings] = useState<any[]>([]);

  const isOwnProfile = currentUser?.id === id;
  const isAdmin = currentUser?.role === 'SuperAdmin' || currentUser?.role === 'AdminClub';
  const canViewTrainings = isOwnProfile || isAdmin;

  const fetchPlayerInfo = async () => {
    try {
      const [playerRes, matchesRes] = await Promise.all([
        api.get(ENDPOINTS.USERS.BY_ID(id!)),
        api.get(ENDPOINTS.MATCHES.BASE),
      ]);

      const playerData = playerRes.data.data || playerRes.data;
      setPlayer(playerData);

      const allMatches = matchesRes.data;
      const userMatches = allMatches
        .filter(
          (m: any) => (m.playerOneId === id || m.playerTwoId === id) && m.status === 'Completado',
        )
        .sort(
          (a: any, b: any) => new Date(b.dateStart).getTime() - new Date(a.dateStart).getTime(),
        );

      setRecentMatches(userMatches.slice(0, 10));

      if (isOwnProfile || currentUser?.role === 'AdminClub' || currentUser?.role === 'SuperAdmin') {
        const trainRes = await api.get(ENDPOINTS.TRAININGS.BY_PLAYER(id!));
        setTrainings(trainRes.data.data);
      }
    } catch (error) {
      console.error('Error cargando perfil del jugador:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPlayerInfo();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const handleOpenEdit = () => {
    if (player) {
      setEditData({
        name: player.name || '',
        surname: player.surname || '',
        nickname: player.nickname || '',
        avatarUrl: player.avatarUrl || '',
      });
      setEditModalOpened(true);
    }
  };

  const handleSaveProfile = async () => {
    setSaving(true);
    try {
      await api.put(ENDPOINTS.USERS.ME, editData);
      setEditModalOpened(false);
      updateUserFields({
        name: editData.name,
        surname: editData.surname,
        nickname: editData.nickname,
        avatarUrl: editData.avatarUrl,
      });
      await fetchPlayerInfo();
    } catch (error) {
      console.error('Error actualizando el perfil:', error);
    } finally {
      setSaving(false);
    }
  };

  const handleDeletePlan = (planId: string) => {
    openAppConfirmModal({
      title: 'Eliminar Plan de Entrenamiento',
      icon: <IconTrash size={18} />,
      color: 'red',
      description: '¿Estás seguro de que deseas eliminar este plan completo?',
      highlightText: 'Esta acción no se puede deshacer',
      confirmLabel: 'Sí, eliminar plan',
      onConfirm: async () => {
        try {
          await api.delete(ENDPOINTS.TRAININGS.DELETE_PLAN(planId));
          await fetchPlayerInfo();
        } catch (error) {
          console.error('Error al eliminar el plan:', error);
        }
      },
    });
  };

  if (loading) {
    return (
      <Center h={400}>
        <Loader color="blue" type="bars" />
      </Center>
    );
  }

  if (!player) {
    return (
      <Center h={400}>
        <Text c="dimmed">Jugador no encontrado.</Text>
      </Center>
    );
  }

  // --- 1. CÁLCULO DE DATOS PARA EL RADAR ---
  const s = player.stats;
  const totalMatches = (s?.matchWon || 0) + (s?.matchLost || 0);
  const totalSets = (s?.setWon || 0) + (s?.setLost || 0);
  const totalPoints = (s?.pointWon || 0) + (s?.pointLost || 0);
  const totalTournaments = (s?.tournamentWon || 0) + (s?.tournamentLost || 0);

  const matchWinRate = totalMatches > 0 ? Math.round(((s?.matchWon || 0) / totalMatches) * 100) : 0;

  // Transformamos los datos a una escala 0-100 para que el radar se vea simétrico
  const radarData =
    totalMatches > 0
      ? [
          {
            metric: 'Partidos',
            Victorias: matchWinRate,
            Derrotas: totalMatches > 0 ? Math.round(((s?.matchLost || 0) / totalMatches) * 100) : 0,
          },
          {
            metric: 'Sets',
            Victorias: totalSets > 0 ? Math.round(((s?.setWon || 0) / totalSets) * 100) : 0,
            Derrotas: totalSets > 0 ? Math.round(((s?.setLost || 0) / totalSets) * 100) : 0,
          },
          {
            metric: 'Puntos',
            Victorias: totalPoints > 0 ? Math.round(((s?.pointWon || 0) / totalPoints) * 100) : 0,
            Derrotas: totalPoints > 0 ? Math.round(((s?.pointLost || 0) / totalPoints) * 100) : 0,
          },
          {
            metric: 'Torneos',
            Victorias:
              totalTournaments > 0
                ? Math.round(((s?.tournamentWon || 0) / totalTournaments) * 100)
                : 0,
            Derrotas:
              totalTournaments > 0
                ? Math.round(((s?.tournamentLost || 0) / totalTournaments) * 100)
                : 0,
          },
        ]
      : [];

  // --- 2. EXTRACCIÓN DEL ÚLTIMO PLAN (DATOS CUALITATIVOS) ---
  const latestPlan = trainings.length > 0 ? trainings[0] : null;

  return (
    <Stack gap="xl">
      <div>
        <Button
          variant="subtle"
          leftSection={<IconArrowLeft size={16} />}
          onClick={() => navigate(APP_ROUTES.JUGADORES.LIST)}
        >
          Volver a Jugadores
        </Button>
      </div>

      {/* Cabecera del Perfil */}
      <Card shadow="sm" padding="xl" radius="md" withBorder>
        <Group align="flex-start" justify="space-between">
          <Group gap="lg">
            <Avatar
              src={getPlayerAvatar(player.name, player.avatarUrl)}
              size={100}
              radius={100}
              color="blue"
            />
            <div>
              <Title order={1}>
                {player.name} {player.surname}
              </Title>
              {player.nickname && (
                <Text c="dimmed" size="md" fs="italic">
                  "{player.nickname}"
                </Text>
              )}
              <Text c="dimmed" size="lg">
                {player.email}
              </Text>
              <Badge
                mt="sm"
                size="lg"
                color={s?.elo && s.elo >= 1000 ? 'green' : s?.elo && s.elo >= 750 ? 'blue' : 'gray'}
                variant="filled"
              >
                {s?.elo || 500} ELO
              </Badge>
            </div>
          </Group>

          <Stack align="flex-end">
            {isOwnProfile && (
              <Button
                variant="light"
                color="blue"
                leftSection={<IconEdit size={16} />}
                onClick={handleOpenEdit}
              >
                Editar Perfil
              </Button>
            )}
          </Stack>
        </Group>
      </Card>

      {/* 👇 NUEVO: SECCIÓN DE ANÁLISIS DE RENDIMIENTO */}
      <Title order={3}>Perfil de Rendimiento</Title>

      <SimpleGrid cols={{ base: 1, md: 2 }} spacing="lg">
        {/* GRÁFICO DE RADAR */}
        <Card withBorder radius="md" shadow="sm" p="lg">
          <Group gap="xs" mb="lg">
            <ThemeIcon color="blue" variant="light">
              <IconTarget size={18} />
            </ThemeIcon>
            <Title order={4}>Radar de Eficiencia</Title>
          </Group>
          {totalMatches > 0 ? (
            <Center h={250}>
              <RadarChart
                h={300}
                w="100%"
                data={radarData}
                dataKey="metric"
                withPolarGrid
                withPolarAngleAxis
                withPolarRadiusAxis
                withLegend // 👈 Muestra la leyenda de colores debajo
                series={[
                  { name: 'Victorias', color: 'blue.4', opacity: 0.5 }, // 👈 Capa Azul
                  { name: 'Derrotas', color: 'red.4', opacity: 0.5 }, // 👈 Capa Roja
                ]}
              />
            </Center>
          ) : (
            <Center
              h={200}
              bg="var(--mantine-color-gray-0)"
              style={{ borderRadius: 8, darkHidden: true }}
            >
              <Stack align="center" gap="xs">
                <IconChartBar size={40} color="var(--mantine-color-gray-4)" />
                <Text c="dimmed" size="sm" ta="center">
                  Juega tu primer partido para
                  <br />
                  desbloquear tu radar de estadísticas.
                </Text>
              </Stack>
            </Center>
          )}
        </Card>

        {/* ANÁLISIS TÉCNICO CUALITATIVO */}
        {canViewTrainings && (
          <Card withBorder radius="md" shadow="sm" p="lg">
            <Group gap="xs" mb="md">
              <ThemeIcon color="orange" variant="light">
                <IconClipboardList size={18} />
              </ThemeIcon>
              <Title order={4}>Último Análisis Técnico</Title>
            </Group>

            {latestPlan ? (
              <Stack gap="sm">
                <Paper
                  withBorder
                  p="sm"
                  bg="var(--mantine-color-gray-0)"
                  style={{ darkHidden: true }}
                >
                  <Group gap="xs" mb={4}>
                    <IconTrendingUp size={16} color="var(--mantine-color-green-6)" />
                    <Text fw={600} size="sm">
                      Fortalezas
                    </Text>
                  </Group>
                  <Text size="sm" c="dimmed">
                    {latestPlan.strengths}
                  </Text>
                </Paper>

                <Paper
                  withBorder
                  p="sm"
                  bg="var(--mantine-color-gray-0)"
                  style={{ darkHidden: true }}
                >
                  <Group gap="xs" mb={4}>
                    <IconTrendingDown size={16} color="var(--mantine-color-red-6)" />
                    <Text fw={600} size="sm">
                      A Mejorar
                    </Text>
                  </Group>
                  <Text size="sm" c="dimmed">
                    {latestPlan.weaknesses}
                  </Text>
                </Paper>
              </Stack>
            ) : (
              <Center
                h={200}
                bg="var(--mantine-color-gray-0)"
                style={{ borderRadius: 8, darkHidden: true }}
              >
                <Stack align="center" gap="xs">
                  <IconClipboardList size={40} color="var(--mantine-color-gray-4)" />
                  <Text c="dimmed" size="sm" ta="center">
                    El entrenador aún no ha creado
                    <br />
                    un macrociclo para ti.
                  </Text>
                </Stack>
              </Center>
            )}
          </Card>
        )}
      </SimpleGrid>

      {/* ESTADÍSTICAS TRADICIONALES (El Grid de siempre) */}
      <SimpleGrid cols={{ base: 1, sm: 2, md: 4 }} spacing="lg" mt="md">
        <Paper withBorder p="md" radius="md" shadow="sm">
          <Group justify="space-between">
            <Text size="xs" c="dimmed" fw={700} tt="uppercase">
              Partidos
            </Text>
            <ThemeIcon color="blue" variant="light" size={38} radius="md">
              <IconPingPong size={24} />
            </ThemeIcon>
          </Group>
          <Group align="flex-end" gap="xs" mt={25}>
            <Text size="xl" fw={700}>
              {s?.matchWon || 0}V - {s?.matchLost || 0}D
            </Text>
          </Group>
          <Text size="sm" c="dimmed" mt={7}>
            {matchWinRate}% de Victorias
          </Text>
        </Paper>

        <Paper withBorder p="md" radius="md" shadow="sm">
          <Group justify="space-between">
            <Text size="xs" c="dimmed" fw={700} tt="uppercase">
              Torneos Jugados
            </Text>
            <ThemeIcon color="yellow" variant="light" size={38} radius="md">
              <IconTrophy size={24} />
            </ThemeIcon>
          </Group>
          <Group align="flex-end" gap="xs" mt={25}>
            <Text size="xl" fw={700}>
              {(s?.tournamentWon || 0) + (s?.tournamentLost || 0)}
            </Text>
          </Group>
          <Text size="sm" c="dimmed" mt={7}>
            <Text component="span" c="green" fw={500}>
              {s?.tournamentWon || 0} Ganados
            </Text>
          </Text>
        </Paper>

        <Paper withBorder p="md" radius="md" shadow="sm">
          <Group justify="space-between">
            <Text size="xs" c="dimmed" fw={700} tt="uppercase">
              Balance de Sets
            </Text>
            <ThemeIcon color="grape" variant="light" size={38} radius="md">
              <IconChartBar size={24} />
            </ThemeIcon>
          </Group>
          <Group align="flex-end" gap="xs" mt={25}>
            <Text size="xl" fw={700}>
              {s?.setWon || 0} - {s?.setLost || 0}
            </Text>
          </Group>
          <Text size="sm" c="dimmed" mt={7}>
            Diferencia: {(s?.setWon || 0) - (s?.setLost || 0)}
          </Text>
        </Paper>

        <Paper withBorder p="md" radius="md" shadow="sm">
          <Group justify="space-between">
            <Text size="xs" c="dimmed" fw={700} tt="uppercase">
              Puntos Totales
            </Text>
            <ThemeIcon color="teal" variant="light" size={38} radius="md">
              <IconMathSymbols size={24} />
            </ThemeIcon>
          </Group>
          <Group align="flex-end" gap="xs" mt={25}>
            <Text size="xl" fw={700}>
              <Text component="span" c="green">
                {s?.pointWon || 0}
              </Text>{' '}
              /{' '}
              <Text component="span" c="red">
                {s?.pointLost || 0}
              </Text>
            </Text>
          </Group>
          <Text size="sm" c="dimmed" mt={7}>
            Ratio: {s?.pointLost ? ((s.pointWon || 0) / s.pointLost).toFixed(2) : 0}
          </Text>
        </Paper>
      </SimpleGrid>

      {/* Historial de Partidos */}
      <Card shadow="sm" padding="lg" radius="md" withBorder mt="md">
        <Group gap="sm" mb="md">
          <IconHistory size={20} color="var(--mantine-color-blue-6)" />
          <Title order={4}>Últimos Partidos Jugados</Title>
        </Group>

        <ScrollArea>
          <Table striped highlightOnHover verticalSpacing="sm">
            <Table.Thead>
              <Table.Tr>
                <Table.Th>Fecha</Table.Th>
                <Table.Th>Torneo</Table.Th>
                <Table.Th>Resultado</Table.Th>
                <Table.Th>Oponente</Table.Th>
                <Table.Th>Marcador (Sets)</Table.Th>
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {recentMatches.map((m) => {
                const isPlayerOne = m.playerOneId === id;
                const opponent = isPlayerOne ? m.playerTwo : m.playerOne;

                let p1Sets = 0;
                let p2Sets = 0;
                const sets = [
                  [m.setOnePlayerOne, m.setOnePlayerTwo],
                  [m.setTwoPlayerOne, m.setTwoPlayerTwo],
                  [m.setThreePlayerOne, m.setThreePlayerTwo],
                  [m.setFourPlayerOne, m.setFourPlayerTwo],
                  [m.setFivePlayerOne, m.setFivePlayerTwo],
                ];

                sets.forEach(([s1, s2]) => {
                  if (s1 !== null && s2 !== null && !(s1 === 0 && s2 === 0)) {
                    if (s1 > s2) p1Sets++;
                    else if (s2 > s1) p2Sets++;
                  }
                });

                const didWin = isPlayerOne ? p1Sets > p2Sets : p2Sets > p1Sets;
                const setScore = isPlayerOne ? `${p1Sets} - ${p2Sets}` : `${p2Sets} - ${p1Sets}`;

                return (
                  <Table.Tr key={m.id}>
                    <Table.Td>
                      {new Date(m.dateStart).toLocaleDateString('es-ES', {
                        day: '2-digit',
                        month: 'short',
                        year: 'numeric',
                      })}
                    </Table.Td>
                    <Table.Td>
                      <Text size="sm" fw={500} truncate w={150}>
                        {m.tournament?.name || 'Amistoso'}
                      </Text>
                    </Table.Td>
                    <Table.Td>
                      <Badge color={didWin ? 'green' : 'red'} variant="light">
                        {didWin ? 'Victoria' : 'Derrota'}
                      </Badge>
                    </Table.Td>
                    <Table.Td>
                      <Group gap="xs">
                        <Avatar
                          src={getPlayerAvatar(opponent.name, opponent.avatarUrl)}
                          radius="xl"
                          size="sm"
                        />
                        <Text size="sm">
                          {opponent?.name} {opponent?.surname || ''}
                        </Text>
                      </Group>
                    </Table.Td>
                    <Table.Td>
                      <Text fw={700} size="sm" c="dimmed">
                        {setScore}
                      </Text>
                    </Table.Td>
                  </Table.Tr>
                );
              })}
              {recentMatches.length === 0 && (
                <Table.Tr>
                  <Table.Td colSpan={5}>
                    <Center py="md">
                      <Text c="dimmed">No hay historial de partidos registrados.</Text>
                    </Center>
                  </Table.Td>
                </Table.Tr>
              )}
            </Table.Tbody>
          </Table>
        </ScrollArea>
      </Card>

      {/* SECCIÓN DE HISTORIAL DE MACROCICLOS */}
      {canViewTrainings && (
        <Card shadow="sm" padding="lg" radius="md" withBorder mt="md">
          <Group justify="space-between" mb="md">
            <Group gap="sm">
              <IconClipboardList size={20} color="var(--mantine-color-orange-6)" />
              <Title order={4}>Historial de Macrociclos</Title>
            </Group>
            {isAdmin && (
              <Button
                size="xs"
                color="orange"
                onClick={() => navigate(APP_ROUTES.ENTRENAMIENTOS.NEW(player.id))}
              >
                + Crear Plan
              </Button>
            )}
          </Group>

          {trainings.length === 0 ? (
            <Center py="md">
              <Text c="dimmed">No hay planes de entrenamiento asignados.</Text>
            </Center>
          ) : (
            <SimpleGrid cols={{ base: 1, sm: 2 }}>
              {trainings.map((plan) => (
                <Card key={plan.id} withBorder shadow="sm" radius="md" p="md">
                  <Group justify="space-between" mb="xs" align="flex-start">
                    <Text fw={700}>Plan de {plan.weeks} Semanas</Text>
                    <Group gap="xs">
                      <Badge color="orange" variant="light">
                        {plan._count?.sessions || 0} Sesiones
                      </Badge>
                      {isAdmin && (
                        <ActionIcon
                          color="red"
                          variant="subtle"
                          size="sm"
                          onClick={() => handleDeletePlan(plan.id)}
                        >
                          <IconTrash size={16} />
                        </ActionIcon>
                      )}
                    </Group>
                  </Group>
                  <Text size="sm" c="dimmed" mb="md">
                    Inicio: {new Date(plan.startDate).toLocaleDateString('es-ES')}
                  </Text>
                  <Button
                    variant="light"
                    color="blue"
                    fullWidth
                    onClick={() => navigate(APP_ROUTES.ENTRENAMIENTOS.DETAILS(plan.id))}
                  >
                    Ver Macrociclo
                  </Button>
                </Card>
              ))}
            </SimpleGrid>
          )}
        </Card>
      )}

      {/* MODAL DE EDICIÓN */}
      <Modal
        opened={editModalOpened}
        onClose={() => setEditModalOpened(false)}
        title={<Title order={4}>Editar Mis Datos</Title>}
        centered
      >
        <Stack gap="md">
          <TextInput
            label="Nombre"
            required
            value={editData.name}
            onChange={(e) => setEditData({ ...editData, name: e.currentTarget.value })}
          />
          <TextInput
            label="Apellidos"
            value={editData.surname}
            onChange={(e) => setEditData({ ...editData, surname: e.currentTarget.value })}
          />
          <TextInput
            label="Nickname / Mote (Opcional)"
            placeholder="Ej. El Muro"
            value={editData.nickname}
            onChange={(e) => setEditData({ ...editData, nickname: e.currentTarget.value })}
          />
          <TextInput
            label="URL de Foto de Perfil (Opcional)"
            placeholder="https://ejemplo.com/mi-foto.jpg"
            value={editData.avatarUrl || ''}
            onChange={(e) => setEditData({ ...editData, avatarUrl: e.currentTarget.value })}
          />
          <Button color="blue" fullWidth mt="md" loading={saving} onClick={handleSaveProfile}>
            Guardar Cambios
          </Button>
        </Stack>
      </Modal>
    </Stack>
  );
};

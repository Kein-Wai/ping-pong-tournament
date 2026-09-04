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
  Select,
  Box,
  Progress,
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
  IconSwords,
} from '@tabler/icons-react';
import { RadarChart, BarChart } from '@mantine/charts';
import { api } from '../../api/axios';
import { ENDPOINTS } from '../../api/endpoints';
import { APP_ROUTES } from '../../constants/routes';
import { useAuthStore } from '../../store/authStore';
import { getPlayerAvatar } from '../../utils/avatar';
import { openAppConfirmModal } from '../../utils/modals';

interface UserProfile {
  id: string;
  email: string;
  name: string;
  surname?: string;
  nickname?: string;
  avatarUrl?: string | null;
  dominantHand?: 'Diestro' | 'Zurdo' | null;
  playstyle?: 'Ofensivo' | 'Defensivo' | null;
  level?: string | null;
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
  skills?: {
    derechaPlano: number;
    revesPlano: number;
    topspinDerecha: number;
    topspinReves: number;
    corte: number;
    bloqueoDerecha: number;
    bloqueoReves: number;
    servicio: number;
    recepcion: number;
    movilidad: number;
    fortalezaMental: number;
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
  const [editData, setEditData] = useState({
    name: '',
    surname: '',
    nickname: '',
    avatarUrl: '',
    dominantHand: '',
    playstyle: '',
  });
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
        dominantHand: player.dominantHand || '',
        playstyle: player.playstyle || '',
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

  // --- 1. CÁLCULO DE DATOS (Eficiencia) ---
  const s = player.stats;
  const totalMatches = (s?.matchWon || 0) + (s?.matchLost || 0);
  const totalSets = (s?.setWon || 0) + (s?.setLost || 0);
  const totalPoints = (s?.pointWon || 0) + (s?.pointLost || 0);
  const totalTournaments = (s?.tournamentWon || 0) + (s?.tournamentLost || 0);

  const matchWinRate = totalMatches > 0 ? Math.round(((s?.matchWon || 0) / totalMatches) * 100) : 0;

  const rivalStats = {
    Diestro: { win: 0, loss: 0 },
    Zurdo: { win: 0, loss: 0 },
    Ofensivo: { win: 0, loss: 0 },
    Defensivo: { win: 0, loss: 0 },
  };

  recentMatches.forEach((m) => {
    const isPlayerOne = m.playerOneId === id;
    const opponent = isPlayerOne ? m.playerTwo : m.playerOne;

    let p1Sets = 0,
      p2Sets = 0;
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

    if (opponent.dominantHand === 'Diestro') {
      didWin ? rivalStats.Diestro.win++ : rivalStats.Diestro.loss++;
    } else if (opponent.dominantHand === 'Zurdo') {
      didWin ? rivalStats.Zurdo.win++ : rivalStats.Zurdo.loss++;
    }

    if (opponent.playstyle === 'Ofensivo') {
      didWin ? rivalStats.Ofensivo.win++ : rivalStats.Ofensivo.loss++;
    } else if (opponent.playstyle === 'Defensivo') {
      didWin ? rivalStats.Defensivo.win++ : rivalStats.Defensivo.loss++;
    }
  });

  const chartDataMano = [
    { Rasgo: 'vs Diestros', Victorias: rivalStats.Diestro.win, Derrotas: rivalStats.Diestro.loss },
    { Rasgo: 'vs Zurdos', Victorias: rivalStats.Zurdo.win, Derrotas: rivalStats.Zurdo.loss },
  ];

  const chartDataEstilo = [
    {
      Rasgo: 'vs Ofensivos',
      Victorias: rivalStats.Ofensivo.win,
      Derrotas: rivalStats.Ofensivo.loss,
    },
    {
      Rasgo: 'vs Defensivos',
      Victorias: rivalStats.Defensivo.win,
      Derrotas: rivalStats.Defensivo.loss,
    },
  ];

  // AHORA ESTE DATA VA A UN BARCHART APILADO HORIZONTAL
  const efficiencyData =
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

  // --- 2. CÁLCULO DE DATOS RPG (SKILLS) ---
  const skillsData = player.skills
    ? [
        { attribute: 'Plano Derecha', value: player.skills.derechaPlano },
        { attribute: 'Plano Revés', value: player.skills.revesPlano },
        { attribute: 'Top Derecha', value: player.skills.topspinDerecha },
        { attribute: 'Top Revés', value: player.skills.topspinReves },
        { attribute: 'Corte', value: player.skills.corte },
        { attribute: 'Bloqueo Der.', value: player.skills.bloqueoDerecha },
        { attribute: 'Bloqueo Rev.', value: player.skills.bloqueoReves },
        { attribute: 'Servicio', value: player.skills.servicio },
        { attribute: 'Recepción', value: player.skills.recepcion },
        { attribute: 'Movilidad', value: player.skills.movilidad },
        { attribute: 'Mentalidad', value: player.skills.fortalezaMental },
      ]
    : [];

  const getSkillColor = (val: number) => {
    if (val < 30) return 'red';
    if (val < 60) return 'yellow';
    if (val < 80) return 'blue';
    return 'green';
  };

  const latestPlan = trainings.length > 0 ? trainings[0] : null;

  return (
    <Stack gap="xl">
      {!isOwnProfile && (
        <div>
          <Button
            variant="subtle"
            leftSection={<IconArrowLeft size={16} />}
            onClick={() => navigate(APP_ROUTES.JUGADORES.LIST)}
          >
            Volver a Jugadores
          </Button>
        </div>
      )}

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
              <Group gap="xs" mt="sm">
                <Badge
                  size="lg"
                  color={
                    s?.elo && s.elo >= 1000 ? 'green' : s?.elo && s.elo >= 750 ? 'blue' : 'gray'
                  }
                  variant="filled"
                >
                  {s?.elo || 500} ELO
                </Badge>
                {player.level && (
                  <Badge size="lg" variant="light" color="grape">
                    {player.level}
                  </Badge>
                )}
              </Group>
              <Group gap="xs" mt="xs">
                {player.dominantHand && (
                  <Badge variant="outline" color="gray" tt="none">
                    🖐️ {player.dominantHand}
                  </Badge>
                )}
                {player.playstyle && (
                  <Badge variant="outline" color="orange" tt="none">
                    ⚔️ {player.playstyle}
                  </Badge>
                )}
              </Group>
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

      {/* 👇 NUEVA SECCIÓN: PERFIL TÉCNICO RPG */}
      <Title order={3}>Perfil Técnico (Atributos)</Title>

      <SimpleGrid cols={{ base: 1, md: 2 }} spacing="lg">
        {/* CAJA 1: BARRAS DE PROGRESO INDIVIDUALES */}
        <Card withBorder radius="md" shadow="sm" p="lg">
          <Group gap="xs" mb="md">
            <ThemeIcon color="orange" variant="light">
              <IconSwords size={18} />
            </ThemeIcon>
            <Title order={4}>Desglose de Habilidades</Title>
          </Group>

          {skillsData.length > 0 ? (
            <ScrollArea h={320} offsetScrollbars>
              <Stack gap="xs" pr="sm">
                {skillsData.map((skill) => (
                  <Box key={skill.attribute}>
                    <Group justify="space-between" mb={2}>
                      <Text size="sm" fw={600}>
                        {skill.attribute}
                      </Text>
                      <Text size="sm" fw={700} c={getSkillColor(skill.value)}>
                        {skill.value} / 100
                      </Text>
                    </Group>
                    <Progress
                      value={skill.value}
                      color={getSkillColor(skill.value)}
                      size="md"
                      radius="xl"
                    />
                  </Box>
                ))}
              </Stack>
            </ScrollArea>
          ) : (
            <Center
              h={200}
              bg="var(--mantine-color-gray-0)"
              style={{ borderRadius: 8, darkHidden: true }}
            >
              <Text c="dimmed" size="sm" ta="center">
                Sin habilidades registradas.
              </Text>
            </Center>
          )}
        </Card>

        {/* CAJA 2: RADAR CHART */}
        <Card withBorder radius="md" shadow="sm" p="lg">
          <Group gap="xs" mb="lg">
            <ThemeIcon color="grape" variant="light">
              <IconTarget size={18} />
            </ThemeIcon>
            <Title order={4}>Radar de Juego</Title>
          </Group>
          {skillsData.length > 0 ? (
            <Center h={320}>
              <RadarChart
                h={300}
                w="100%"
                data={skillsData}
                dataKey="attribute"
                withPolarGrid
                withPolarAngleAxis
                withPolarRadiusAxis
                series={[{ name: 'value', color: 'grape.5', opacity: 0.5 }]}
              />
            </Center>
          ) : (
            <Center
              h={200}
              bg="var(--mantine-color-gray-0)"
              style={{ borderRadius: 8, darkHidden: true }}
            >
              <Text c="dimmed" size="sm" ta="center">
                Sin habilidades registradas.
              </Text>
            </Center>
          )}
        </Card>
      </SimpleGrid>

      {/* SECCIÓN DE ANÁLISIS DE RENDIMIENTO */}
      <Title order={3} mt="md">
        Estadísticas Competitivas
      </Title>

      <SimpleGrid cols={{ base: 1, md: 2 }} spacing="lg">
        {/* GRÁFICO BARRAS APILADAS: EFICIENCIA */}
        <Card withBorder radius="md" shadow="sm" p="lg">
          <Group gap="xs" mb="lg">
            <ThemeIcon color="blue" variant="light">
              <IconChartBar size={18} />
            </ThemeIcon>
            <Title order={4}>Balance General (Win Rate %)</Title>
          </Group>
          {totalMatches > 0 ? (
            <Box mt="md">
              <BarChart
                h={250}
                data={efficiencyData}
                dataKey="metric"
                type="stacked"
                orientation="vertical"
                series={[
                  { name: 'Victorias', color: 'green.5' },
                  { name: 'Derrotas', color: 'red.5' },
                ]}
              />
            </Box>
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
                  desbloquear tus estadísticas.
                </Text>
              </Stack>
            </Center>
          )}
        </Card>

        {/* GRÁFICO BARRAS APILADAS: VS RIVALES */}
        <Card withBorder radius="md" shadow="sm" p="lg">
          <Group gap="xs" mb="lg">
            <ThemeIcon color="orange" variant="light">
              <IconPingPong size={18} />
            </ThemeIcon>
            <Title order={4}>Desempeño vs Rivales</Title>
          </Group>
          {totalMatches > 0 ? (
            <Stack gap="xl">
              <Box>
                <Text size="sm" c="dimmed" fw={600} mb="xs">
                  Según Mano Dominante
                </Text>
                <BarChart
                  h={120}
                  data={chartDataMano}
                  dataKey="Rasgo"
                  type="stacked"
                  orientation="vertical"
                  series={[
                    { name: 'Victorias', color: 'green.5' },
                    { name: 'Derrotas', color: 'red.5' },
                  ]}
                />
              </Box>
              <Box>
                <Text size="sm" c="dimmed" fw={600} mb="xs">
                  Según Estilo de Juego
                </Text>
                <BarChart
                  h={120}
                  data={chartDataEstilo}
                  dataKey="Rasgo"
                  type="stacked"
                  orientation="vertical"
                  series={[
                    { name: 'Victorias', color: 'green.5' },
                    { name: 'Derrotas', color: 'red.5' },
                  ]}
                />
              </Box>
            </Stack>
          ) : (
            <Center
              h={200}
              bg="var(--mantine-color-gray-0)"
              style={{ borderRadius: 8, darkHidden: true }}
            >
              <Text c="dimmed" size="sm" ta="center">
                Sin datos de enfrentamientos.
              </Text>
            </Center>
          )}
        </Card>

        {/* ANÁLISIS TÉCNICO CUALITATIVO (PLANES) */}
        {canViewTrainings && (
          <Card withBorder radius="md" shadow="sm" p="lg" style={{ gridColumn: '1 / -1' }}>
            <Group gap="xs" mb="md">
              <ThemeIcon color="orange" variant="light">
                <IconClipboardList size={18} />
              </ThemeIcon>
              <Title order={4}>Último Análisis Técnico</Title>
            </Group>

            {latestPlan ? (
              <SimpleGrid cols={{ base: 1, md: 2 }} spacing="md">
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
              </SimpleGrid>
            ) : (
              <Center
                h={100}
                bg="var(--mantine-color-gray-0)"
                style={{ borderRadius: 8, darkHidden: true }}
              >
                <Text c="dimmed" size="sm" ta="center">
                  El entrenador aún no ha creado un macrociclo para ti.
                </Text>
              </Center>
            )}
          </Card>
        )}
      </SimpleGrid>

      {/* ESTADÍSTICAS TRADICIONALES */}
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
          <SimpleGrid cols={2}>
            <Select
              label="Mano Dominante"
              data={['Diestro', 'Zurdo']}
              value={editData.dominantHand}
              onChange={(val) => setEditData({ ...editData, dominantHand: val || '' })}
            />
            <Select
              label="Estilo de Juego"
              data={['Ofensivo', 'Defensivo']}
              value={editData.playstyle}
              onChange={(val) => setEditData({ ...editData, playstyle: val || '' })}
            />
          </SimpleGrid>
          <Button color="blue" fullWidth mt="md" loading={saving} onClick={handleSaveProfile}>
            Guardar Cambios
          </Button>
        </Stack>
      </Modal>
    </Stack>
  );
};

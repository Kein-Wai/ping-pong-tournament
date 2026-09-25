import { useEffect, useState } from 'react';
import {
  Card,
  Title,
  Table,
  Badge,
  Center,
  Loader,
  Stack,
  Avatar,
  Group,
  Text,
  ThemeIcon,
  ScrollArea,
  Pagination,
  SimpleGrid,
} from '@mantine/core';
import {
  IconMedal,
  IconTrophy,
  IconChartBar,
  IconPingPong,
  IconTrendingUp,
  IconCalendarEvent,
  IconCake,
  IconUsers,
} from '@tabler/icons-react';

import { BarChart, DonutChart } from '@mantine/charts'; // 👈 Importamos los gráficos
import { api } from '../../api/axios';
import { ENDPOINTS } from '../../api/endpoints';
import { getPlayerAvatar } from '../../utils/avatar';
import { PodioHonor } from '../../components/common/PodioHonor';
import { returnEloColor } from '../../utils/helpers';

interface PlayerStats {
  id: string;
  name: string;
  surname: string | null;
  avatarUrl: string | null;
  clubStatus: string;
  stats: {
    elo: number;
    matchWon: number;
    matchLost: number;
    setWon: number;
    setLost: number;
  };
}

const ITEMS_PER_PAGE = 10;

export const Estadisticas = () => {
  const [players, setPlayers] = useState<PlayerStats[]>([]);
  const [matches, setMatches] = useState<any[]>([]);
  const [trainings, setTrainings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        // Traemos Jugadores y Partidos al mismo tiempo
        const [resUsers, resMatches, resTrainings] = await Promise.all([
          api.get(ENDPOINTS.USERS.BASE),
          api.get(ENDPOINTS.MATCHES.BASE),
          api.get(ENDPOINTS.GENERAL_TRAININGS.BASE),
        ]);

        let data: PlayerStats[] = resUsers.data.data || resUsers.data;
        data = data
          .filter((p) => p.stats !== null)
          .sort((a, b) => {
            const sA = Array.isArray(a.stats) ? a.stats[0] : a.stats;
            const sB = Array.isArray(b.stats) ? b.stats[0] : b.stats;
            return (sB?.elo || 0) - (sA?.elo || 0);
          });

        setPlayers(data);
        setMatches(resMatches.data);
        setTrainings(resTrainings.data.data);
      } catch (error) {
        console.error('Error cargando estadísticas:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, []);

  const totalPages = Math.ceil(players.length / ITEMS_PER_PAGE);
  const paginatedPlayers = players.slice((page - 1) * ITEMS_PER_PAGE, page * ITEMS_PER_PAGE);

  if (loading) {
    return (
      <Center h={400}>
        <Loader color="blue" type="bars" />
      </Center>
    );
  }

  // --- 1. CÁLCULO DE DATOS PARA EL GRÁFICO DE BARRAS (Distribución ELO) ---
  const eloSegments = { novice: 0, intermediate: 0, advanced: 0, expert: 0 };
  players.forEach((p) => {
    const s = Array.isArray(p.stats) ? p.stats[0] : p.stats;
    const elo = s?.elo || 500;
    if (elo < 500) eloSegments.novice++;
    else if (elo < 750) eloSegments.intermediate++;
    else if (elo < 1000) eloSegments.advanced++;
    else eloSegments.expert++;
  });

  const chartDataElo = [
    { Nivel: 'Aficionado (<500)', Jugadores: eloSegments.novice },
    { Nivel: 'Intermedio (500-749)', Jugadores: eloSegments.intermediate },
    { Nivel: 'Avanzado (750-999)', Jugadores: eloSegments.advanced },
    { Nivel: 'Experto (1000+)', Jugadores: eloSegments.expert },
  ];

  // --- 2. CÁLCULO DE DATOS PARA EL GRÁFICO DE ANILLO (Salud del Club) ---
  let completedMatches = 0;
  let pendingMatches = 0;
  let cancelledMatches = 0;

  matches.forEach((m) => {
    if (m.status === 'Completado') completedMatches++;
    else if (m.status === 'Cancelado') cancelledMatches++;
    else pendingMatches++;
  });

  const chartDataMatches = [
    { name: 'Completados', value: completedMatches, color: 'teal.6' },
    { name: 'Pendientes', value: pendingMatches, color: 'blue.6' },
    { name: 'Cancelados', value: cancelledMatches, color: 'red.6' },
  ];

  const attendanceCount: Record<string, number> = {};
  const scheduleStats: Record<string, { total: number; count: number }> = {};

  trainings.forEach((t: any) => {
    // Media por horario
    if (t.schedule?.name) {
      const name = t.schedule.name;
      if (!scheduleStats[name]) scheduleStats[name] = { total: 0, count: 0 };
      scheduleStats[name].count += 1;
      scheduleStats[name].total += t.attendances?.length || 0;
    }

    // Top asistencias
    t.attendances?.forEach((a: any) => {
      if (a.attended) {
        attendanceCount[a.playerId] = (attendanceCount[a.playerId] || 0) + 1;
      }
    });
  });

  const top10Asistencias = Object.entries(attendanceCount)
    .map(([id, count]) => {
      const p = players.find((user) => user.id === id);
      return {
        id,
        name: p ? `${p.name} ${p.surname || ''}` : 'Desconocido',
        avatarUrl: p?.avatarUrl,
        count: count as number,
      };
    })
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);

  const chartDataSchedules = Object.entries(scheduleStats).map(([name, stat]) => ({
    Horario: name,
    Media: Number((stat.total / stat.count).toFixed(1)),
  }));

  const getRankBadge = (index: number, page: number) => {
    if (page == 1) {
      if (index === 0)
        return (
          <ThemeIcon color="yellow" size="lg" radius="xl">
            <IconTrophy size={16} />
          </ThemeIcon>
        );
      if (index === 1)
        return (
          <ThemeIcon color="gray" size="lg" radius="xl">
            <IconMedal size={16} />
          </ThemeIcon>
        );
      if (index === 2)
        return (
          <ThemeIcon color="orange" size="lg" radius="xl">
            <IconMedal size={16} />
          </ThemeIcon>
        );
    }
    return (
      <Badge color="gray" variant="light" size="lg">
        {(page - 1) * 10 + index + 1}º
      </Badge>
    );
  };

  // --- CÁLCULO DE DEMOGRAFÍA ---
  let totalAge = 0;
  let validAgesCount = 0;
  const ageRanges = { '< 18': 0, '18-25': 0, '26-35': 0, '36-50': 0, '50+': 0 };

  const today = new Date();

  players.forEach((u: any) => {
    if (u.birthDate) {
      const birthDate = new Date(u.birthDate);
      let age = today.getFullYear() - birthDate.getFullYear();
      if (
        today.getMonth() < birthDate.getMonth() ||
        (today.getMonth() === birthDate.getMonth() && today.getDate() < birthDate.getDate())
      ) {
        age--;
      }
      if (age >= 0) {
        totalAge += age;
        validAgesCount++;
        if (age < 18) ageRanges['< 18']++;
        else if (age <= 25) ageRanges['18-25']++;
        else if (age <= 35) ageRanges['26-35']++;
        else if (age <= 50) ageRanges['36-50']++;
        else ageRanges['50+']++;
      }
    }
  });

  const avgAge = validAgesCount > 0 ? Math.round(totalAge / validAgesCount) : 0;
  const chartData = Object.entries(ageRanges).map(([range, count]) => ({
    Rango: range,
    Jugadores: count,
  }));

  // --- TOP TORNEOS ---
  const topTorneos = players
    .map((p) => {
      const s = Array.isArray(p.stats) ? p.stats[0] : p.stats;
      return {
        id: p.id,
        name: `${p.name} ${p.surname || ''}`,
        avatarUrl: p.avatarUrl,
        count: s?.tournamentPart || 0,
      };
    })
    .filter((p) => p.count > 0)
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);

  return (
    <Stack gap="lg">
      <Group gap="sm" align="center" mb="md">
        <ThemeIcon size={50} radius="md" color="blue" variant="light">
          <IconChartBar size={28} />
        </ThemeIcon>
        <div>
          <Title order={2}>Centro de Estadísticas</Title>
          <Text c="dimmed" size="sm">
            Rendimiento global de los jugadores y salud del club.
          </Text>
        </div>
      </Group>

      {/* R1: PODIO Y DISTRIBUCIÓN DE ELO */}
      <SimpleGrid cols={{ base: 1, md: 2 }} spacing="lg">
        <Card withBorder padding="lg" radius="md" shadow="sm">
          <Group gap="sm" mb="md">
            <ThemeIcon color="yellow" variant="light" size="lg" radius="md">
              <IconTrophy size={20} />
            </ThemeIcon>
            <Title order={4}>Podio de Honor</Title>
          </Group>
          {players.length > 0 ? (
            <Center h={220}>
              <PodioHonor players={players} />
            </Center>
          ) : (
            <Center h={220}>
              <Text c="dimmed">No hay jugadores suficientes</Text>
            </Center>
          )}
        </Card>

        <Card withBorder padding="lg" radius="md" shadow="sm">
          <Group gap="sm" mb="md">
            <ThemeIcon color="blue" variant="light" size="lg" radius="md">
              <IconTrendingUp size={20} />
            </ThemeIcon>
            <Title order={4}>Distribución de Nivel (ELO)</Title>
          </Group>
          <BarChart
            h={220}
            data={chartDataElo}
            dataKey="Nivel"
            series={[{ name: 'Jugadores', color: 'blue.6' }]}
            tickLine="y"
          />
        </Card>
      </SimpleGrid>

      {/* R2: ACTIVIDAD COMPETITIVA */}
      <Title order={3} mt="sm">
        Actividad Competitiva
      </Title>
      <SimpleGrid cols={{ base: 1, md: 2 }} spacing="lg">
        <Card withBorder padding="lg" radius="md" shadow="sm">
          <Group gap="sm" mb="md">
            <ThemeIcon color="teal" variant="light" size="lg" radius="md">
              <IconPingPong size={20} />
            </ThemeIcon>
            <Title order={4}>Volumen de Partidos</Title>
          </Group>
          {matches.length === 0 ? (
            <Center h={220}>
              <Text c="dimmed">No hay partidos registrados aún.</Text>
            </Center>
          ) : (
            <Group justify="center" h={220}>
              <DonutChart
                data={chartDataMatches}
                withLabelsLine
                withLabels
                size={160}
                thickness={20}
              />
            </Group>
          )}
        </Card>

        <Card withBorder padding="lg" radius="md" shadow="sm">
          <Group gap="sm" mb="md">
            <ThemeIcon color="orange" variant="light" size="lg" radius="md">
              <IconMedal size={20} />
            </ThemeIcon>
            <Title order={4}>Afluencia a Torneos (Top 5)</Title>
          </Group>
          <ScrollArea h={220} offsetScrollbars>
            <Stack gap="sm">
              {topTorneos.length === 0 ? (
                <Text c="dimmed" ta="center" mt="md">
                  No hay participaciones registradas aún.
                </Text>
              ) : (
                topTorneos.map((p, idx) => (
                  <Group key={p.id} justify="space-between" wrap="nowrap">
                    <Group gap="sm">
                      <Badge
                        color={idx < 3 ? 'orange' : 'gray'}
                        variant={idx < 3 ? 'filled' : 'light'}
                      >
                        {idx + 1}º
                      </Badge>
                      <Avatar src={getPlayerAvatar(p.name, p.avatarUrl)} radius="xl" size="sm" />
                      <Text size="sm" fw={600} truncate maw={150}>
                        {p.name}
                      </Text>
                    </Group>
                    <Text size="sm" fw={700} c="orange">
                      {p.count} Torneos
                    </Text>
                  </Group>
                ))
              )}
            </Stack>
          </ScrollArea>
        </Card>
      </SimpleGrid>

      {/* R3: DEMOGRAFÍA */}
      <Title order={3} mt="sm">
        Demografía del Club
      </Title>
      <SimpleGrid cols={{ base: 1, md: 2 }} spacing="lg">
        <Card withBorder padding="lg" radius="md" shadow="sm">
          <Group gap="sm" mb="md">
            <ThemeIcon color="grape" variant="light" size="lg" radius="md">
              <IconCake size={20} />
            </ThemeIcon>
            <Title order={4}>Edad Media Global</Title>
          </Group>
          <Center h={220}>
            <Stack align="center" gap={4}>
              <Text fz={48} fw={900} c="grape.6">
                {avgAge > 0 ? `${avgAge} años` : 'Sin datos'}
              </Text>
              <Text size="sm" c="dimmed">
                Calculado sobre {validAgesCount} jugadores
              </Text>
            </Stack>
          </Center>
        </Card>

        <Card withBorder padding="lg" radius="md" shadow="sm">
          <Group gap="sm" mb="md">
            <ThemeIcon color="grape" variant="light" size="lg" radius="md">
              <IconUsers size={20} />
            </ThemeIcon>
            <Title order={4}>Distribución por Edades</Title>
          </Group>
          {validAgesCount > 0 ? (
            <BarChart
              h={220}
              data={chartData}
              dataKey="Rango"
              series={[{ name: 'Jugadores', color: 'grape.5' }]}
              tickLine="y"
            />
          ) : (
            <Center h={220}>
              <Text c="dimmed">No hay suficientes datos registrados.</Text>
            </Center>
          )}
        </Card>
      </SimpleGrid>

      {/* R4: ENTRENAMIENTOS GRUPALES */}
      <Title order={3} mt="sm">
        Rendimiento en Entrenamientos Grupales
      </Title>
      <SimpleGrid cols={{ base: 1, md: 2 }} spacing="lg">
        <Card shadow="sm" padding="lg" radius="md" withBorder>
          <Group gap="sm" mb="md">
            <ThemeIcon color="cyan" variant="light" size="lg" radius="md">
              <IconCalendarEvent size={20} />
            </ThemeIcon>
            <Title order={4}>Top 10 Asistencias (Ironmans)</Title>
          </Group>
          <ScrollArea h={220} offsetScrollbars>
            <Stack gap="sm">
              {top10Asistencias.length === 0 ? (
                <Text c="dimmed" ta="center" mt="md">
                  No hay datos de asistencia aún.
                </Text>
              ) : (
                top10Asistencias.map((p, idx) => (
                  <Group key={p.id} justify="space-between" wrap="nowrap">
                    <Group gap="sm">
                      <Badge
                        color={idx < 3 ? 'cyan' : 'gray'}
                        variant={idx < 3 ? 'filled' : 'light'}
                      >
                        {idx + 1}º
                      </Badge>
                      <Avatar src={getPlayerAvatar(p.name, p.avatarUrl)} radius="xl" size="sm" />
                      <Text size="sm" fw={600} truncate maw={150}>
                        {p.name}
                      </Text>
                    </Group>
                    <Text size="sm" fw={700} c="cyan.7">
                      {p.count} Sesiones
                    </Text>
                  </Group>
                ))
              )}
            </Stack>
          </ScrollArea>
        </Card>

        <Card shadow="sm" padding="lg" radius="md" withBorder>
          <Group gap="sm" mb="md">
            <ThemeIcon color="cyan" variant="light" size="lg" radius="md">
              <IconChartBar size={20} />
            </ThemeIcon>
            <Title order={4}>Afluencia Media por Horario</Title>
          </Group>
          {chartDataSchedules.length === 0 ? (
            <Center h={220}>
              <Text c="dimmed">No hay clases registradas aún.</Text>
            </Center>
          ) : (
            <BarChart
              h={220}
              data={chartDataSchedules}
              dataKey="Horario"
              series={[{ name: 'Media', color: 'cyan.6' }]}
              tickLine="y"
            />
          )}
        </Card>
      </SimpleGrid>

      {/* R5: RANKING GLOBAL */}
      <Title order={3} mt="sm">
        Ranking Oficial
      </Title>
      <Card shadow="sm" padding="lg" radius="md" withBorder>
        <Group gap="sm" mb="md">
          <ThemeIcon color="dark" variant="light" size="lg" radius="md">
            <IconTrophy size={20} />
          </ThemeIcon>
          <Title order={4}>Clasificación del Club</Title>
        </Group>
        <ScrollArea>
          <Table striped highlightOnHover verticalSpacing="md" miw={700}>
            <Table.Thead>
              <Table.Tr>
                <Table.Th w={80}>Rank</Table.Th>
                <Table.Th>Jugador</Table.Th>
                <Table.Th>Puntuación ELO</Table.Th>
                <Table.Th ta="center">Win Rate</Table.Th>
                <Table.Th ta="center">Partidos (V-D)</Table.Th>
                <Table.Th ta="center">Dif. Sets</Table.Th>
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {paginatedPlayers.map((p, index) => {
                const s = Array.isArray(p.stats) ? p.stats[0] : p.stats;
                const totalMatches = (s?.matchWon || 0) + (s?.matchLost || 0);
                const winRate =
                  totalMatches > 0 ? Math.round(((s?.matchWon || 0) / totalMatches) * 100) : 0;
                const setDiff = (s?.setWon || 0) - (s?.setLost || 0);

                return (
                  <Table.Tr key={p.id}>
                    <Table.Td>{getRankBadge(index, page)}</Table.Td>
                    <Table.Td>
                      <Group gap="sm">
                        <Avatar src={getPlayerAvatar(p.name, p.avatarUrl)} radius="xl" size="sm" />
                        <Text fw={index < 3 ? 700 : 500} size={index < 3 ? 'md' : 'sm'}>
                          {p.name} {p.surname || ''}
                        </Text>
                      </Group>
                    </Table.Td>
                    <Table.Td>
                      <Badge
                        size={index < 3 ? 'lg' : 'md'}
                        color={s?.elo ? returnEloColor(s?.elo) : 'gray'}
                        variant={index < 3 ? 'filled' : 'light'}
                      >
                        {s?.elo}
                      </Badge>
                    </Table.Td>
                    <Table.Td ta="center">
                      <Text fw={600} c={winRate >= 50 ? 'green.6' : 'red.6'}>
                        {winRate}%
                      </Text>
                    </Table.Td>
                    <Table.Td ta="center">
                      <Text size="sm">
                        <Text component="span" c="green" fw={600}>
                          {s?.matchWon || 0}
                        </Text>{' '}
                        -{' '}
                        <Text component="span" c="red" fw={600}>
                          {s?.matchLost || 0}
                        </Text>
                      </Text>
                    </Table.Td>
                    <Table.Td ta="center">
                      <Badge
                        color={setDiff > 0 ? 'teal' : setDiff < 0 ? 'red' : 'gray'}
                        variant="dot"
                      >
                        {setDiff > 0 ? `+${setDiff}` : setDiff}
                      </Badge>
                    </Table.Td>
                  </Table.Tr>
                );
              })}
              {players.length === 0 && (
                <Table.Tr>
                  <Table.Td colSpan={6}>
                    <Center py="xl">
                      <Text c="dimmed">No hay jugadores con estadísticas registradas.</Text>
                    </Center>
                  </Table.Td>
                </Table.Tr>
              )}
            </Table.Tbody>
          </Table>
        </ScrollArea>
        {totalPages > 1 && (
          <Center mt="md">
            <Pagination total={totalPages} value={page} onChange={setPage} color="blue" withEdges />
          </Center>
        )}
      </Card>
    </Stack>
  );
};

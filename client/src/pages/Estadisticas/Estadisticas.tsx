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
  Paper,
} from '@mantine/core';
import {
  IconMedal,
  IconTrophy,
  IconChartBar,
  IconPingPong,
  IconTrendingUp,
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
  const [matches, setMatches] = useState<any[]>([]); // 👈 Guardaremos los partidos aquí
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        // Traemos Jugadores y Partidos al mismo tiempo
        const [resUsers, resMatches] = await Promise.all([
          api.get(ENDPOINTS.USERS.BASE),
          api.get(ENDPOINTS.MATCHES.BASE),
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

  return (
    <Stack gap="lg">
      <Group gap="sm" align="center">
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

      {/* PODIO DE HONOR */}
      {players.length > 0 && <PodioHonor players={players} />}

      {/* GRÁFICOS VISUALES */}
      <SimpleGrid cols={{ base: 1, md: 2 }} spacing="lg">
        {/* Gráfico de Barras */}
        <Paper withBorder p="lg" radius="md" shadow="sm">
          <Group gap="xs" mb="xl">
            <ThemeIcon color="blue" variant="light">
              <IconTrendingUp size={18} />
            </ThemeIcon>
            <Title order={4}>Distribución de Nivel (ELO)</Title>
          </Group>
          <BarChart
            h={250}
            data={chartDataElo}
            dataKey="Nivel"
            series={[{ name: 'Jugadores', color: 'blue.6' }]}
            tickLine="y"
          />
        </Paper>

        {/* Gráfico de Anillo */}
        <Paper withBorder p="lg" radius="md" shadow="sm">
          <Group gap="xs" mb="xl">
            <ThemeIcon color="teal" variant="light">
              <IconPingPong size={18} />
            </ThemeIcon>
            <Title order={4}>Volumen de Partidos</Title>
          </Group>
          {matches.length === 0 ? (
            <Center h={250}>
              <Text c="dimmed">No hay partidos registrados aún.</Text>
            </Center>
          ) : (
            <Group justify="center" h={250}>
              <DonutChart
                data={chartDataMatches}
                withLabelsLine
                withLabels
                size={180}
                thickness={25}
              />
            </Group>
          )}
        </Paper>
      </SimpleGrid>

      {/* RANKING GLOBAL (LA TABLA) */}
      <Title order={3} mt="md">
        Ranking Oficial
      </Title>
      <Card shadow="sm" padding="lg" radius="md" withBorder>
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

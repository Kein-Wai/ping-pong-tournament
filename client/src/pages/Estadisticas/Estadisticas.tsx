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
} from '@mantine/core';
import { IconMedal, IconTrophy, IconChartBar } from '@tabler/icons-react';
import { api } from '../../api/axios';
import { ENDPOINTS } from '../../api/endpoints';
import { getPlayerAvatar } from '../../utils/avatar';

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
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  useEffect(() => {
    const fetchRanking = async () => {
      try {
        const response = await api.get(ENDPOINTS.USERS.BASE);
        let data: PlayerStats[] = response.data.data || response.data;

        // Filtramos solo los jugadores con estadísticas y los ordenamos por ELO
        data = data
          .filter((p) => p.stats !== null)
          .sort((a, b) => (b.stats?.elo || 0) - (a.stats?.elo || 0));

        setPlayers(data);
      } catch (error) {
        console.error('Error cargando estadísticas:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchRanking();
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
          <Title order={2}>Ranking Global (ELO)</Title>
          <Text c="dimmed" size="sm">
            Clasificación oficial basada en el rendimiento histórico.
          </Text>
        </div>
      </Group>

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
                const totalMatches = (p.stats.matchWon || 0) + (p.stats.matchLost || 0);
                const winRate =
                  totalMatches > 0 ? Math.round(((p.stats.matchWon || 0) / totalMatches) * 100) : 0;
                const setDiff = (p.stats.setWon || 0) - (p.stats.setLost || 0);

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
                        color={p.stats.elo >= 1000 ? 'green' : p.stats.elo >= 750 ? 'blue' : 'gray'}
                        variant={index < 3 ? 'filled' : 'light'}
                      >
                        {p.stats.elo}
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
                          {p.stats.matchWon || 0}
                        </Text>{' '}
                        -{' '}
                        <Text component="span" c="red" fw={600}>
                          {p.stats.matchLost || 0}
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

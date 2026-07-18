import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Table,
  Title,
  Card,
  Avatar,
  Group,
  Text,
  Badge,
  Center,
  Loader,
  ScrollArea,
  TextInput,
  Pagination,
  Stack,
  Tooltip,
  ActionIcon,
} from '@mantine/core';
import { IconSearch, IconEye } from '@tabler/icons-react';
import { api } from '../../api/axios';
import { ENDPOINTS } from '../../api/endpoints';

interface User {
  id: string;
  email: string;
  name: string;
  surname?: string;
  nickname?: string;
  userTypeId: string;
  stats?: {
    elo: number;
    matchWon: number;
    matchLost: number;
    setWon: number;
    setLost: number;
  };
}

const COLORS = ['red', 'green', 'blue', 'yellow', 'orange'];

const ITEMS_PER_PAGE = 10;

export const Jugadores = () => {
  const navigate = useNavigate();
  const [players, setPlayers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);

  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);

  useEffect(() => {
    const fetchPlayers = async () => {
      try {
        const response = await api.get(ENDPOINTS.PLAYERS.BASE);
        const data = response.data.data || response.data;

        if (Array.isArray(data)) {
          setPlayers(data);
        }
      } catch (error) {
        console.error('Error cargando jugadores:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchPlayers();
  }, []);

  const filteredPlayers = players.filter((player) => {
    const fullName = `${player.name} ${player.surname || ''}`.toLowerCase();
    return fullName.includes(search.toLowerCase());
  });

  const totalPages = Math.ceil(filteredPlayers.length / ITEMS_PER_PAGE);
  const paginatedPlayers = filteredPlayers.slice(
    (page - 1) * ITEMS_PER_PAGE,
    page * ITEMS_PER_PAGE,
  );

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearch(e.currentTarget.value);
    setPage(1);
  };

  const returnEloColor = (elo: number) => {
    if (elo < 500) {
      return 'red';
    } else if (elo >= 500 && elo < 750) {
      return 'yellow';
    } else if (elo >= 750 && elo < 1000) {
      return 'blue';
    } else if (elo >= 1000) {
      return 'green';
    }
    console.log('no salgo!');
  };

  if (loading) {
    return (
      <Center h={400}>
        <Loader color="blue" type="bars" />
      </Center>
    );
  }
  const rows = paginatedPlayers.map((player) => {
    if (!player) return null;

    const totalMatches = (player.stats?.matchWon || 0) + (player.stats?.matchLost || 0);
    const winRate =
      totalMatches > 0 ? Math.round(((player.stats?.matchWon || 0) / totalMatches) * 100) : 0;

    return (
      <Table.Tr key={player.id}>
        <Table.Td>
          <Group gap="sm">
            <Avatar color={COLORS[Math.round(Math.random() * (COLORS.length - 1) + 0)]} radius="xl">
              {player?.name?.charAt(0)?.toUpperCase() || 'U'}
            </Avatar>
            <div>
              <Text fz="sm" fw={500}>
                {player?.name || 'Anónimo'} {player?.surname || ''}
              </Text>
              <Text fz="sm" fw={500}>
                {player?.nickname || 'Sin mote'}
              </Text>
              <Text c="dimmed" fz="xs" visibleFrom="sm">
                {player?.email || 'Sin correo'}
              </Text>
            </div>
          </Group>
        </Table.Td>

        <Table.Td>
          <Badge
            color={player.stats?.elo ? returnEloColor(player.stats?.elo) : 'black'}
            variant="light"
          >
            {player.stats?.elo || 'N/A'}
          </Badge>
        </Table.Td>

        <Table.Td visibleFrom="sm">
          <Badge color="green" variant="dot">
            Player
          </Badge>
        </Table.Td>

        <Table.Td visibleFrom="sm">
          <Text fz="sm" fw={500}>
            <Text component="span" c="green">
              {player.stats?.matchWon || 0}V
            </Text>{' '}
            -{' '}
            <Text component="span" c="red">
              {player.stats?.matchLost || 0}D
            </Text>
          </Text>
          <Text fz="xs" c="dimmed">
            {winRate}% Win Rate
          </Text>
        </Table.Td>
        <Table.Td>
          <Tooltip label="Ver perfil completo">
            <ActionIcon
              variant="light"
              color="blue"
              onClick={() => navigate(`/jugadores/${player.id}`)}
            >
              <IconEye size={18} />
            </ActionIcon>
          </Tooltip>
        </Table.Td>
      </Table.Tr>
    );
  });

  return (
    <Stack gap="md">
      <Card shadow="sm" padding="lg" radius="md" withBorder>
        <Group justify="space-between" mb="md">
          <Title order={2}>Plantilla de Jugadores</Title>
          <TextInput
            placeholder="Buscar jugador..."
            leftSection={<IconSearch size={16} />}
            value={search}
            onChange={handleSearchChange}
            style={{ flexGrow: 1, maxWidth: 300 }}
          />
        </Group>

        <ScrollArea>
          <Table verticalSpacing="sm" striped highlightOnHover>
            <Table.Thead>
              <Table.Tr>
                <Table.Th>Jugador</Table.Th>
                <Table.Th>ELO</Table.Th>
                <Table.Th visibleFrom="sm">Rol</Table.Th>
                <Table.Th visibleFrom="sm">Récord</Table.Th>
                <Table.Th>Acción</Table.Th>
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {rows.length > 0 ? (
                rows
              ) : (
                <Table.Tr>
                  <Table.Td colSpan={4}>
                    <Center py="xl">
                      <Text c="dimmed">No se han encontrado jugadores.</Text>
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

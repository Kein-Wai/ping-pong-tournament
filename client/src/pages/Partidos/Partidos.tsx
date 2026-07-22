import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Table,
  Title,
  Card,
  Group,
  Text,
  Center,
  Loader,
  ScrollArea,
  TextInput,
  Pagination,
  Stack,
  Tooltip,
  ActionIcon,
} from '@mantine/core';
import {
  IconSearch,
  IconTrophy,
  IconCalendar,
  IconPencilCheck,
  IconPingPong,
  IconUsersGroup,
} from '@tabler/icons-react';
import { api } from '../../api/axios';
import { ENDPOINTS } from '../../api/endpoints';

interface Tournament {
  id: string;
  name: string;
  dateStart: string;
  numPlayers: number;
  typeTournament: string | null;
  levelTournament: string | null;
  rounds: string | null;
  status: string | null;
  typeKnockout: string | null;
}

interface Club {
  id: string;
  name: string;
  city: string;
}

export interface Match {
  id: string;
  dateStart: string;
  tournamentId: string | null;
  groupId: string | null;
  knockoutId: string | null;
  leagueId: string | null;
  matchOrder: number | null;
  playerOneId: string;
  playerTwoId: string;

  setOnePlayerOne: number | null;
  setOnePlayerTwo: number | null;
  setTwoPlayerOne: number | null;
  setTwoPlayerTwo: number | null;
  setThreePlayerOne: number | null;
  setThreePlayerTwo: number | null;
  setFourPlayerOne: number | null;
  setFourPlayerTwo: number | null;
  setFivePlayerOne: number | null;
  setFivePlayerTwo: number | null;
  setSixPlayerOne: number | null;
  setSixPlayerTwo: number | null;
  setSevenPlayerOne: number | null;
  setSevenPlayerTwo: number | null;

  status: string | null;
  winnerGoesToMatchId: string | null;
  loserGoesToMatchId: string | null;

  playerOne?: {
    id: string;
    name: string;
    surname: string | null;
    club: Club | null;
  } | null;

  playerTwo?: {
    id: string;
    name: string;
    surname: string | null;
    club: Club | null;
  } | null;

  group?: {
    id: string;
    group: number;
  } | null;

  tournament?: Tournament;
}

const ITEMS_PER_PAGE = 10;

export const Partidos = () => {
  const navigate = useNavigate();
  const [matches, setMatches] = useState<Match[]>([]);
  const [loading, setLoading] = useState(true);

  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);

  useEffect(() => {
    const fetchPlayers = async () => {
      try {
        const response = await api.get(ENDPOINTS.MATCHES.BASE);
        const data = response.data.sort((a: Match, b: Match) =>
          a.dateStart > b.dateStart ? 1 : -1,
        );

        if (Array.isArray(data)) {
          setMatches(data);
        }
      } catch (error) {
        console.error('Error cargando jugadores:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchPlayers();
  }, []);

  const filteredPlayers = matches.filter((match) => {
    const fullMatch =
      `${match.tournament?.name} ${match.playerOne?.name} ${match.playerOne?.surname || ''} ${match.playerTwo?.name} ${match.playerTwo?.surname || ''}`.toLowerCase();
    return fullMatch.includes(search.toLowerCase());
  });

  const totalPages = Math.ceil(filteredPlayers.length / ITEMS_PER_PAGE);
  const paginatedMatches = filteredPlayers.slice(
    (page - 1) * ITEMS_PER_PAGE,
    page * ITEMS_PER_PAGE,
  );

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearch(e.currentTarget.value);
    setPage(1);
  };

  if (loading) {
    return (
      <Center h={400}>
        <Loader color="blue" type="bars" />
      </Center>
    );
  }
  const rows = paginatedMatches.map((match) => {
    if (!match) return null;

    return (
      <Table.Tr key={match.id}>
        <Table.Td>
          <Group gap="sm">
            <IconTrophy size={16} stroke={1.5} color="orange" />
            <div>
              <Text fz="sm" fw={500}>
                {match?.tournament?.name || ''}
              </Text>
            </div>
          </Group>
        </Table.Td>
        <Table.Td>
          <Group gap="sm">
            <IconCalendar size={16} stroke={1.5} color="blue" />
            <div>
              <Text fz="sm" fw={500}>
                {new Date(match?.dateStart).toLocaleDateString('es-ES', {
                  year: 'numeric',
                  month: 'short',
                  day: 'numeric',
                })}
              </Text>
            </div>
          </Group>
        </Table.Td>
        <Table.Td>
          <Group gap="sm">
            <IconUsersGroup size={16} stroke={1.5} color="red" />
            <div>
              <Text fz="sm" fw={500}>
                {match?.playerOne?.club?.name}
              </Text>
            </div>
          </Group>
        </Table.Td>
        <Table.Td>
          <Group gap="sm">
            <div>
              <Text fz="sm" fw={500}>
                {match?.playerOne?.name} {match?.playerOne?.surname}
              </Text>
            </div>
            <IconPingPong size={16} stroke={1.5} color="green" />
          </Group>
        </Table.Td>
        <Table.Td> VS </Table.Td>
        <Table.Td>
          <Group gap="sm">
            <IconPingPong size={16} stroke={1.5} color="black" />
            <div>
              <Text fz="sm" fw={500}>
                {match?.playerTwo?.name} {match?.playerTwo?.surname}
              </Text>
            </div>
          </Group>
        </Table.Td>
        <Table.Td>
          <Group gap="sm">
            <IconUsersGroup size={16} stroke={1.5} color="red" />
            <div>
              <Text fz="sm" fw={500}>
                {match?.playerTwo?.club?.name}
              </Text>
            </div>
          </Group>
        </Table.Td>
        <Table.Td></Table.Td>
        <Table.Td>
          <Tooltip label="Ver perfil completo">
            <ActionIcon
              variant="light"
              color="blue"
              onClick={() => navigate(`/matches/${match.id}`)}
            >
              <IconPencilCheck size={18} />
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
          <Title order={2}>Historial de Partidas</Title>
          <TextInput
            placeholder="Buscar partido..."
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
                <Table.Th>Torneo</Table.Th>
                <Table.Th>Dia Partido</Table.Th>
                <Table.Th visibleFrom="sm">Club Jugador 1</Table.Th>
                <Table.Th>Jugador 1</Table.Th>
                <Table.Th></Table.Th>
                <Table.Th>Jugador 2</Table.Th>
                <Table.Th visibleFrom="sm">Club Jugador 2</Table.Th>
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

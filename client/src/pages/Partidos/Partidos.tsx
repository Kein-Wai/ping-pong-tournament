import { useEffect, useState } from 'react';
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
  Modal,
  Avatar,
  Badge,
  Paper,
} from '@mantine/core';
import {
  IconSearch,
  IconTrophy,
  IconCalendar,
  IconPingPong,
  IconUsersGroup,
  IconEye,
} from '@tabler/icons-react';
import { api } from '../../api/axios';
import { ENDPOINTS } from '../../api/endpoints';
import { getPlayerAvatar } from '../../utils/avatar';

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
    avatarUrl?: string | null; // Añadimos soporte para el avatar
    club: Club | null;
  } | null;

  playerTwo?: {
    id: string;
    name: string;
    surname: string | null;
    avatarUrl?: string | null; // Añadimos soporte para el avatar
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
  const [matches, setMatches] = useState<Match[]>([]);
  const [loading, setLoading] = useState(true);

  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);

  // Estado para el modal de detalles
  const [selectedMatch, setSelectedMatch] = useState<Match | null>(null);

  useEffect(() => {
    const fetchMatches = async () => {
      try {
        const response = await api.get(ENDPOINTS.MATCHES.BASE);
        const data = response.data.sort(
          (a: Match, b: Match) => (a.dateStart > b.dateStart ? -1 : 1), // Cambiado para mostrar los más recientes primero
        );

        if (Array.isArray(data)) {
          setMatches(data);
        }
      } catch (error) {
        console.error('Error cargando partidos:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchMatches();
  }, []);

  const filteredMatches = matches.filter((match) => {
    const fullMatch =
      `${match.tournament?.name} ${match.playerOne?.name} ${match.playerOne?.surname || ''} ${match.playerTwo?.name} ${match.playerTwo?.surname || ''}`.toLowerCase();
    return fullMatch.includes(search.toLowerCase());
  });

  const totalPages = Math.ceil(filteredMatches.length / ITEMS_PER_PAGE);
  const paginatedMatches = filteredMatches.slice(
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
              <Text fz="sm" fw={500} truncate w={150}>
                {match?.tournament?.name || 'Amistoso'}
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
        <Table.Td visibleFrom="sm">
          <Group gap="sm">
            <IconUsersGroup size={16} stroke={1.5} color="gray" />
            <div>
              <Text fz="sm" fw={500} truncate w={100}>
                {match?.playerOne?.club?.name || 'Libre'}
              </Text>
            </div>
          </Group>
        </Table.Td>
        <Table.Td>
          <Group gap="sm">
            <Avatar
              src={getPlayerAvatar(match.playerOne?.name || 'P1', match.playerOne?.avatarUrl)}
              radius="xl"
              size="sm"
            />
            <div>
              <Text fz="sm" fw={500}>
                {match?.playerOne?.name} {match?.playerOne?.surname || ''}
              </Text>
            </div>
          </Group>
        </Table.Td>
        <Table.Td>
          <Badge variant="light" color="gray">
            VS
          </Badge>
        </Table.Td>
        <Table.Td>
          <Group gap="sm">
            <div>
              <Text fz="sm" fw={500} ta="right">
                {match?.playerTwo?.name} {match?.playerTwo?.surname || ''}
              </Text>
            </div>
            <Avatar
              src={getPlayerAvatar(match.playerTwo?.name || 'P2', match.playerTwo?.avatarUrl)}
              radius="xl"
              size="sm"
            />
          </Group>
        </Table.Td>
        <Table.Td visibleFrom="sm">
          <Group gap="sm">
            <IconUsersGroup size={16} stroke={1.5} color="gray" />
            <div>
              <Text fz="sm" fw={500} truncate w={100}>
                {match?.playerTwo?.club?.name || 'Libre'}
              </Text>
            </div>
          </Group>
        </Table.Td>
        <Table.Td>
          <Tooltip label="Ver resultado del partido">
            <ActionIcon variant="light" color="blue" onClick={() => setSelectedMatch(match)}>
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
          <Title order={2}>Historial de Partidas</Title>
          <TextInput
            placeholder="Buscar por jugador o torneo..."
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
                <Table.Th>Fecha</Table.Th>
                <Table.Th visibleFrom="sm">Club</Table.Th>
                <Table.Th>Jugador 1</Table.Th>
                <Table.Th></Table.Th>
                <Table.Th>Jugador 2</Table.Th>
                <Table.Th visibleFrom="sm">Club</Table.Th>
                <Table.Th>Acción</Table.Th>
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {rows.length > 0 ? (
                rows
              ) : (
                <Table.Tr>
                  <Table.Td colSpan={8}>
                    <Center py="xl">
                      <Text c="dimmed">No se han encontrado partidos con este filtro.</Text>
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

      {/* MODAL DE RESULTADO DEL PARTIDO */}
      <Modal
        opened={!!selectedMatch}
        onClose={() => setSelectedMatch(null)}
        title={<Text fw={700}>Detalles del Encuentro</Text>}
        centered
        size="lg"
      >
        {selectedMatch && (
          <Stack align="center" gap="md">
            <Badge color={selectedMatch.status === 'Completado' ? 'green' : 'gray'} mb="xs">
              {selectedMatch.status || 'Desconocido'}
            </Badge>

            <Paper
              withBorder
              p="xl"
              radius="md"
              w="100%"
              bg="var(--mantine-color-gray-0)"
              style={{ darkHidden: true }}
            >
              <Group w="100%" justify="space-between" align="center">
                <Stack align="center" gap="sm" style={{ flex: 1 }}>
                  <Avatar
                    src={getPlayerAvatar(
                      selectedMatch.playerOne?.name || 'P1',
                      selectedMatch.playerOne?.avatarUrl,
                    )}
                    radius="xl"
                    size="lg"
                  />
                  <Text fw={600} size="md" ta="center">
                    {selectedMatch.playerOne?.name} {selectedMatch.playerOne?.surname || ''}
                  </Text>
                </Stack>

                <Stack align="center" gap={0} mx="md">
                  <IconPingPong size={32} stroke={1.5} color="var(--mantine-color-blue-filled)" />
                  <Text fw={900} size="lg" c="dimmed" mt="xs">
                    VS
                  </Text>
                </Stack>

                <Stack align="center" gap="sm" style={{ flex: 1 }}>
                  <Avatar
                    src={getPlayerAvatar(
                      selectedMatch.playerTwo?.name || 'P2',
                      selectedMatch.playerTwo?.avatarUrl,
                    )}
                    radius="xl"
                    size="lg"
                  />
                  <Text fw={600} size="md" ta="center">
                    {selectedMatch.playerTwo?.name} {selectedMatch.playerTwo?.surname || ''}
                  </Text>
                </Stack>
              </Group>
            </Paper>

            <Text fw={700} size="sm" mt="md" c="dimmed" tt="uppercase">
              Marcador por Sets
            </Text>

            <Stack gap="xs" align="center" w="100%">
              {selectedMatch.setOnePlayerOne !== null && (
                <Badge
                  size="xl"
                  variant="light"
                  color="blue"
                  w="60%"
                  style={{ justifyContent: 'center' }}
                >
                  Set 1: {selectedMatch.setOnePlayerOne} - {selectedMatch.setOnePlayerTwo}
                </Badge>
              )}
              {selectedMatch.setTwoPlayerOne !== null && (
                <Badge
                  size="xl"
                  variant="light"
                  color="blue"
                  w="60%"
                  style={{ justifyContent: 'center' }}
                >
                  Set 2: {selectedMatch.setTwoPlayerOne} - {selectedMatch.setTwoPlayerTwo}
                </Badge>
              )}
              {selectedMatch.setThreePlayerOne !== null && (
                <Badge
                  size="xl"
                  variant="light"
                  color="blue"
                  w="60%"
                  style={{ justifyContent: 'center' }}
                >
                  Set 3: {selectedMatch.setThreePlayerOne} - {selectedMatch.setThreePlayerTwo}
                </Badge>
              )}
              {selectedMatch.setFourPlayerOne !== null && selectedMatch.setFourPlayerOne !== 0 && (
                <Badge
                  size="xl"
                  variant="light"
                  color="blue"
                  w="60%"
                  style={{ justifyContent: 'center' }}
                >
                  Set 4: {selectedMatch.setFourPlayerOne} - {selectedMatch.setFourPlayerTwo}
                </Badge>
              )}
              {selectedMatch.setFivePlayerOne !== null && selectedMatch.setFivePlayerOne !== 0 && (
                <Badge
                  size="xl"
                  variant="light"
                  color="blue"
                  w="60%"
                  style={{ justifyContent: 'center' }}
                >
                  Set 5: {selectedMatch.setFivePlayerOne} - {selectedMatch.setFivePlayerTwo}
                </Badge>
              )}
              {selectedMatch.setSixPlayerOne !== null && selectedMatch.setSixPlayerOne !== 0 && (
                <Badge
                  size="xl"
                  variant="light"
                  color="blue"
                  w="60%"
                  style={{ justifyContent: 'center' }}
                >
                  Set 6: {selectedMatch.setSixPlayerOne} - {selectedMatch.setSixPlayerTwo}
                </Badge>
              )}
              {selectedMatch.setSevenPlayerOne !== null &&
                selectedMatch.setSevenPlayerOne !== 0 && (
                  <Badge
                    size="xl"
                    variant="light"
                    color="blue"
                    w="60%"
                    style={{ justifyContent: 'center' }}
                  >
                    Set 7: {selectedMatch.setSevenPlayerOne} - {selectedMatch.setSevenPlayerTwo}
                  </Badge>
                )}

              {selectedMatch.setOnePlayerOne === null && (
                <Text c="dimmed" fs="italic">
                  No hay resultados registrados todavía.
                </Text>
              )}
            </Stack>
          </Stack>
        )}
      </Modal>
    </Stack>
  );
};

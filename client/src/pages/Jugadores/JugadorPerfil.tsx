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
  TextInput, // 👈 Añadido para el formulario
} from '@mantine/core';
import {
  IconArrowLeft,
  IconTrophy,
  IconPingPong,
  IconChartBar,
  IconMathSymbols,
  IconHistory,
  IconEdit, // 👈 Añadido icono
} from '@tabler/icons-react';
import { api } from '../../api/axios';
import { ENDPOINTS } from '../../api/endpoints';
import { APP_ROUTES } from '../../constants/routes';
import { useAuthStore } from '../../store/authStore'; // 👈 Añadido para verificar identidad

interface UserProfile {
  id: string;
  email: string;
  name: string;
  surname?: string;
  nickname?: string; // 👈 Añadido nickname
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
  const { user: currentUser } = useAuthStore(); // Para saber si es nuestro propio perfil

  const [player, setPlayer] = useState<UserProfile | null>(null);
  const [recentMatches, setRecentMatches] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Estados de edición
  const [editModalOpened, setEditModalOpened] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editData, setEditData] = useState({ name: '', surname: '', nickname: '' });

  const isOwnProfile = currentUser?.id === id;

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
    } catch (error) {
      console.error('Error cargando perfil del jugador:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPlayerInfo();
  }, [id]);

  const handleOpenEdit = () => {
    if (player) {
      setEditData({
        name: player.name || '',
        surname: player.surname || '',
        nickname: player.nickname || '',
      });
      setEditModalOpened(true);
    }
  };

  const handleSaveProfile = async () => {
    setSaving(true);
    try {
      await api.put(ENDPOINTS.USERS.ME, editData);
      setEditModalOpened(false);
      await fetchPlayerInfo(); // Recargamos para ver los cambios
    } catch (error) {
      console.error('Error actualizando el perfil:', error);
    } finally {
      setSaving(false);
    }
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

  const s = player.stats;
  const matchWinRate =
    (s?.matchWon || 0) + (s?.matchLost || 0) > 0
      ? Math.round(((s?.matchWon || 0) / ((s?.matchWon || 0) + (s?.matchLost || 0))) * 100)
      : 0;

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
            <Avatar size={100} radius={100} color="blue">
              {player.name.charAt(0).toUpperCase()}
            </Avatar>
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

          {/* Botón condicional si eres el dueño de la cuenta */}
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
        </Group>
      </Card>

      <Title order={3}>Estadísticas Completas</Title>

      {/* Grid de Tarjetas de Estadísticas */}
      <SimpleGrid cols={{ base: 1, sm: 2, md: 4 }} spacing="lg">
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
                        <Avatar color="gray" radius="xl" size="xs">
                          {opponent?.name?.charAt(0)}
                        </Avatar>
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
          <Button color="blue" fullWidth mt="md" loading={saving} onClick={handleSaveProfile}>
            Guardar Cambios
          </Button>
        </Stack>
      </Modal>
    </Stack>
  );
};

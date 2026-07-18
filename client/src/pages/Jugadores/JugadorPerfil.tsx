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
} from '@mantine/core';
import {
  IconArrowLeft,
  IconTrophy,
  IconPingPong,
  IconChartBar,
  IconMathSymbols,
} from '@tabler/icons-react';
import { api } from '../../api/axios';

interface UserProfile {
  id: string;
  email: string;
  name: string;
  surname?: string;
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

  const [player, setPlayer] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchPlayerInfo = async () => {
      try {
        const response = await api.get(`/users/${id}`);

        const data = response.data.data || response.data;
        setPlayer(data);
      } catch (error) {
        console.error('Error cargando perfil del jugador:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchPlayerInfo();
  }, [id]);

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
      {/* Botón para volver atrás */}
      <div>
        <Button
          variant="subtle"
          leftSection={<IconArrowLeft size={16} />}
          onClick={() => navigate(-1)}
        >
          Volver a Jugadores
        </Button>
      </div>

      {/* Cabecera del Perfil */}
      <Card shadow="sm" padding="xl" radius="md" withBorder maw={600}>
        <Group align="flex-start" justify="space-between">
          <Group gap="lg">
            <Avatar size={100} radius={100} color="blue">
              {player.name.charAt(0).toUpperCase()}
            </Avatar>
            <div>
              <Title order={1}>
                {player.name} {player.surname}
              </Title>
              <Text c="dimmed" size="lg">
                {player.email}
              </Text>
              <Badge
                mt="sm"
                size="lg"
                color={s?.elo && s.elo > 600 ? 'green' : 'blue'}
                variant="light"
              >
                {s?.elo || 500} ELO
              </Badge>
            </div>
          </Group>
        </Group>
      </Card>

      <Title order={3}>Estadísticas Completas</Title>

      {/* Grid de Tarjetas de Estadísticas */}
      <SimpleGrid cols={{ base: 1, sm: 2, md: 4 }} spacing="lg">
        {/* Tarjeta 1: Partidos */}
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

        {/* Tarjeta 2: Torneos */}
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

        {/* Tarjeta 3: Sets */}
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

        {/* Tarjeta 4: Puntos */}
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
    </Stack>
  );
};

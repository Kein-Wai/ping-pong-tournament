import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Card,
  SimpleGrid,
  Title,
  Text,
  Badge,
  Button,
  Group,
  Center,
  Loader,
  Stack,
  ThemeIcon,
} from '@mantine/core';
import { IconShield, IconPlus, IconUsers, IconTrophy } from '@tabler/icons-react';
import { api } from '../../api/axios';
import { ENDPOINTS } from '../../api/endpoints';
import { APP_ROUTES } from '../../constants/routes';
import { useAuthStore } from '../../store/authStore';

export const Equipos = () => {
  const { user } = useAuthStore();
  const navigate = useNavigate();
  const [teams, setTeams] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const canCreate = user?.role === 'AdminClub' || user?.role === 'SuperAdmin';

  useEffect(() => {
    if (user?.clubId) {
      api
        .get(ENDPOINTS.TEAMS.BY_CLUB(user.clubId))
        .then((res) => setTeams(res.data.data))
        .catch(console.error)
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, [user]);

  if (loading)
    return (
      <Center h={400}>
        <Loader color="blue" />
      </Center>
    );

  return (
    <Stack gap="lg">
      <Group justify="space-between" align="center">
        <Group gap="sm">
          <ThemeIcon size={40} radius="md" color="blue" variant="light">
            <IconShield size={24} />
          </ThemeIcon>
          <Title order={2}>Equipos del Club</Title>
        </Group>
        {canCreate && (
          <Button
            leftSection={<IconPlus size={16} />}
            color="blue"
            onClick={() => navigate(APP_ROUTES.EQUIPOS.NEW)}
          >
            Crear Equipo
          </Button>
        )}
      </Group>

      {teams.length === 0 ? (
        <Center py="xl">
          <Text c="dimmed">Tu club aún no ha registrado ningún equipo para ligas.</Text>
        </Center>
      ) : (
        <SimpleGrid cols={{ base: 1, sm: 2, md: 3 }} spacing="lg">
          {teams.map((team) => (
            <Card
              key={team.id}
              withBorder
              radius="md"
              p="lg"
              className="hover-card"
              onClick={() => navigate(APP_ROUTES.EQUIPOS.DETAILS(team.id))}
            >
              <Group justify="space-between" mb="xs">
                <Text fw={700} size="lg">
                  {team.name}
                </Text>
                <Badge color="blue" variant="light">
                  {team.category}
                </Badge>
              </Group>

              <Group gap="xs" mt="md">
                <IconTrophy size={16} color="var(--mantine-color-orange-5)" />
                <Text size="sm" c="dimmed">
                  Nivel Base: <strong>{team.level}</strong>
                </Text>
              </Group>

              <Group gap="xs" mt="xs">
                <IconUsers size={16} color="var(--mantine-color-gray-5)" />
                <Text size="sm" c="dimmed">
                  Plantilla: {team._count?.players || 0} Jugadores
                </Text>
              </Group>
            </Card>
          ))}
        </SimpleGrid>
      )}
    </Stack>
  );
};

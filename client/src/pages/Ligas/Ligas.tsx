import { useEffect, useState } from 'react';
import {
  Button,
  Card,
  Center,
  Group,
  Loader,
  SimpleGrid,
  Stack,
  Text,
  TextInput,
  ThemeIcon,
  Title,
} from '@mantine/core';
import { IconCalendar, IconPlus, IconSearch, IconTrophy, IconUsers } from '@tabler/icons-react';
import { useNavigate } from 'react-router-dom';
import { leaguesService } from '../../api/services/leagues';
import { LeagueStatusBadge } from '../../components/league/LeagueStatusBadge';
import { usePermissions } from '../../hooks/usePermissions';
import { APP_ROUTES } from '../../constants/routes';
import { formatDate } from '../../utils/dates';
import { bestOfLabel } from '../../utils/leagueView';
import type { League } from '../../types/league';

export const Ligas = () => {
  const [leagues, setLeagues] = useState<League[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const navigate = useNavigate();
  const { isAdminClub: canCreateLeague } = usePermissions();

  useEffect(() => {
    const fetchLeagues = async () => {
      try {
        const data = await leaguesService.list();
        if (Array.isArray(data)) {
          setLeagues(data);
        }
      } catch (error) {
        console.error('Error cargando ligas:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchLeagues();
  }, []);

  const filteredLeagues = leagues.filter((league) =>
    league.name.toLowerCase().includes(search.toLowerCase()),
  );

  if (loading) {
    return (
      <Center h={400}>
        <Loader color="blue" type="bars" />
      </Center>
    );
  }

  return (
    <Stack gap="lg">
      <Group justify="space-between" align="center">
        <Group gap="sm">
          <ThemeIcon size={40} radius="md" color="blue" variant="light">
            <IconTrophy size={24} />
          </ThemeIcon>
          <Title order={2}>Ligas</Title>
        </Group>
        {canCreateLeague && (
          <Button
            leftSection={<IconPlus size={16} />}
            color="blue"
            onClick={() => navigate(APP_ROUTES.LIGAS.NEW)}
          >
            Crear Liga
          </Button>
        )}
      </Group>

      <TextInput
        placeholder="Buscar por nombre..."
        leftSection={<IconSearch size={16} />}
        value={search}
        onChange={(e) => setSearch(e.currentTarget.value)}
        style={{ maxWidth: 400 }}
      />

      {filteredLeagues.length === 0 ? (
        <Center py="xl">
          <Text c="dimmed">No se han encontrado ligas.</Text>
        </Center>
      ) : (
        <SimpleGrid cols={{ base: 1, sm: 2, md: 3, lg: 4 }} spacing="lg">
          {filteredLeagues.map((league) => (
            <Card
              key={league.id}
              shadow="sm"
              padding="lg"
              radius="md"
              withBorder
              className="hover-card"
              onClick={() => navigate(APP_ROUTES.LIGAS.DETAILS(league.id))}
            >
              <Card.Section withBorder inheritPadding py="xs">
                <Group justify="space-between" wrap="nowrap">
                  <Text fw={500} truncate title={league.name} style={{ flex: 1 }}>
                    {league.name}
                  </Text>
                  <LeagueStatusBadge status={league.status} />
                </Group>
              </Card.Section>

              <Stack gap="xs" mt="md">
                <Group gap="xs">
                  <IconCalendar size={16} stroke={1.5} color="var(--mantine-color-dimmed)" />
                  <Text size="sm" c="dimmed">
                    {formatDate(league.dateStart, {
                      year: 'numeric',
                      month: 'short',
                      day: 'numeric',
                    })}
                  </Text>
                </Group>
                <Group gap="xs">
                  <IconUsers size={16} stroke={1.5} color="var(--mantine-color-dimmed)" />
                  <Text size="sm" c="dimmed">
                    {league._count?.participants ?? 0} jugadores
                  </Text>
                </Group>
                <Group gap="xs">
                  <IconTrophy size={16} stroke={1.5} color="var(--mantine-color-dimmed)" />
                  <Text size="sm" c="dimmed">
                    {bestOfLabel(league.setsToWin)} ·{' '}
                    {league.doubleRound ? 'Ida y vuelta' : 'Una vuelta'}
                  </Text>
                </Group>
              </Stack>
            </Card>
          ))}
        </SimpleGrid>
      )}
    </Stack>
  );
};

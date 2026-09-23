import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Title,
  Text,
  Button,
  Card,
  Stack,
  Group,
  Badge,
  ThemeIcon,
  Alert,
  SimpleGrid,
  Paper,
  Center,
  Loader,
} from '@mantine/core';
import { useAuthStore } from '../store/authStore';
import { api } from '../api/axios';
import { ENDPOINTS } from '../api/endpoints';
import { WidgetEntrenamientos } from '../components/common/WidgetEntrenamientos';
import { WidgetTorneos } from '../components/common/WidgetTorneos';
import {
  IconBuildingCommunity,
  IconClock,
  IconTrophy,
  IconAlertCircle,
  IconShield,
  IconChartBar,
  IconPingPong,
  IconUsers,
} from '@tabler/icons-react';
import { APP_ROUTES } from '../constants/routes';

export const Dashboard = () => {
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();

  const isPlayer = user?.role === 'Player';
  const isAdminClub = user?.role === 'AdminClub';
  const hasApprovedClub = user?.clubStatus === 'Aprobado' && user?.clubId;
  const isPendingClub = user?.clubStatus === 'Pendiente';

  const [currentSeason, setCurrentSeason] = useState<any>(null);
  const [clubDetails, setClubDetails] = useState<any>(null);
  const [playerData, setPlayerData] = useState<any>(null);
  const [adminTeams, setAdminTeams] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadDashboardData = async () => {
      try {
        // 1. Cargar Temporada Actual
        const seasonRes = await api.get(ENDPOINTS.SEASONS.BASE);
        const activeS = seasonRes.data.data.find((s: any) => s.isCurrent);
        setCurrentSeason(activeS);

        // 2. Cargar datos específicos según rol
        if (isAdminClub && user?.clubId) {
          const [clubRes, teamsRes] = await Promise.all([
            api.get(ENDPOINTS.CLUBS.BY_ID(user.clubId)),
            api.get(ENDPOINTS.TEAMS.BY_CLUB(user.clubId)),
          ]);
          setClubDetails(clubRes.data.data);
          setAdminTeams(teamsRes.data.data);
        } else if (isPlayer && user?.id) {
          const playerRes = await api.get(ENDPOINTS.USERS.BY_ID(user.id));
          setPlayerData(playerRes.data.data || playerRes.data);
        }
      } catch (error) {
        console.error('Error cargando dashboard:', error);
      } finally {
        setLoading(false);
      }
    };
    loadDashboardData();
  }, [isAdminClub, isPlayer, user?.clubId, user?.id]);

  if (loading) {
    return (
      <Center h={400}>
        <Loader color="blue" type="bars" />
      </Center>
    );
  }

  // Cálculos para el Jugador
  const s = Array.isArray(playerData?.stats) ? playerData.stats[0] : playerData?.stats;
  const allTeamMatches =
    playerData?.teams?.flatMap((t: any) =>
      t.matches.map((m: any) => ({ ...m, teamName: t.name })),
    ) || [];
  const upcomingMatches = allTeamMatches
    .filter(
      (m: any) => m.status === 'Programado' && new Date(m.date).getTime() >= new Date().getTime(),
    )
    .sort((a: any, b: any) => new Date(a.date).getTime() - new Date(b.date).getTime());
  const nextMatch = upcomingMatches[0];

  return (
    <Stack gap="lg">
      {/* 1. TARJETA PRINCIPAL DE BIENVENIDA */}
      <Card withBorder padding="xl" radius="md" shadow="sm">
        <Group justify="space-between" align="center">
          <Stack gap={4}>
            <Title order={2}>
              ¡Bienvenido de nuevo,{' '}
              {user?.nickname ? user?.nickname : `${user?.name} ${user?.surname || ''}`}!
            </Title>
            <Group gap="xs" mt={4}>
              <Badge variant="light" color={isAdminClub ? 'orange' : 'blue'}>
                {user?.role}
              </Badge>
              {currentSeason && (
                <Badge variant="dot" color="grape">
                  {currentSeason.name}
                </Badge>
              )}
            </Group>
          </Stack>

          <Button
            color="red"
            variant="subtle"
            size="sm"
            onClick={() => {
              logout();
              navigate('/login');
            }}
          >
            Cerrar Sesión
          </Button>
        </Group>
      </Card>

      {/* 2. AVISOS DE PERFIL INCOMPLETO (ADMIN) */}
      {isAdminClub && clubDetails && !clubDetails.address && (
        <Alert
          variant="light"
          color="orange"
          title="Tu sede necesita un toque extra"
          icon={<IconAlertCircle />}
          radius="md"
        >
          <Text size="sm" mb="sm">
            Hemos registrado tu club en <strong>{clubDetails.city}</strong>, pero los jugadores
            agradecerán saber la dirección exacta de las mesas y la fecha de fundación para daros
            más prestigio.
          </Text>
          <Button
            variant="filled"
            color="orange"
            size="xs"
            onClick={() => navigate(APP_ROUTES.MI_CLUB)}
          >
            Completar perfil del Club
          </Button>
        </Alert>
      )}

      {/* 3. VISTA PARA ENTRENADORES / ADMINS */}
      {isAdminClub && clubDetails && (
        <>
          <Title order={4} mt="sm">
            Resumen Operativo de la Sede
          </Title>
          <SimpleGrid cols={{ base: 1, sm: 3 }} mb="md">
            <Paper withBorder p="md" radius="md" bg="blue.0">
              <Group justify="space-between">
                <Text c="blue.9" size="sm" tt="uppercase" fw={700}>
                  Miembros Activos
                </Text>
                <IconUsers size={20} color="var(--mantine-color-blue-6)" />
              </Group>
              <Text fz={36} fw={900} c="blue.9">
                {clubDetails?._count?.users || 0}
              </Text>
            </Paper>
            <Paper withBorder p="md" radius="md" bg="orange.0">
              <Group justify="space-between">
                <Text c="orange.9" size="sm" tt="uppercase" fw={700}>
                  Equipos en Liga
                </Text>
                <IconShield size={20} color="var(--mantine-color-orange-6)" />
              </Group>
              <Text fz={36} fw={900} c="orange.9">
                {adminTeams.length}
              </Text>
            </Paper>
            <Paper withBorder p="md" radius="md" bg="grape.0">
              <Group justify="space-between">
                <Text c="grape.9" size="sm" tt="uppercase" fw={700}>
                  Estado del Club
                </Text>
                <IconBuildingCommunity size={20} color="var(--mantine-color-grape-6)" />
              </Group>
              <Badge color="green" size="xl" mt="sm">
                Operativa
              </Badge>
            </Paper>
          </SimpleGrid>
        </>
      )}

      {/* 4. VISTA PARA JUGADORES */}
      {isPlayer && !hasApprovedClub && !isPendingClub && (
        <Card withBorder padding="lg" radius="md" bg="blue.0" c="blue.9">
          <Group align="flex-start" wrap="nowrap">
            <ThemeIcon color="blue" size="xl" radius="md" variant="light">
              <IconBuildingCommunity size={24} />
            </ThemeIcon>
            <Stack gap="xs" style={{ flex: 1 }}>
              <Text fw={700} size="lg">
                Estatus: Jugador Libre
              </Text>
              <Text size="sm">
                Actualmente no perteneces a ningún club. Puedes navegar por la pestaña de
                **Torneos** para registrarte en eventos de formato abierto, o buscar un club local
                para unirte a su ranking interno.
              </Text>
              <Button
                variant="filled"
                color="blue"
                w="max-content"
                size="sm"
                mt="xs"
                onClick={() => navigate(APP_ROUTES.CLUB_SELECTION)}
              >
                Explorar Lista de Clubes
              </Button>
            </Stack>
          </Group>
        </Card>
      )}

      {isPlayer && isPendingClub && (
        <Card withBorder padding="lg" radius="md" bg="yellow.0" c="yellow.9">
          <Group align="flex-start" wrap="nowrap">
            <ThemeIcon color="yellow" size="xl" radius="md" variant="light">
              <IconClock size={24} />
            </ThemeIcon>
            <Stack gap="xs" style={{ flex: 1 }}>
              <Text fw={700} size="lg">
                Solicitud en revisión
              </Text>
              <Text size="sm">
                Has enviado una petición de unión a un club. El administrador está verificando tus
                datos. Mientras tanto, puedes inscribirte en torneos abiertos globales.
              </Text>
            </Stack>
          </Group>
        </Card>
      )}

      {isPlayer && hasApprovedClub && (
        <>
          <Title order={4} mt="sm">
            Mi Rendimiento ({currentSeason?.name})
          </Title>
          <SimpleGrid cols={{ base: 1, sm: 3 }} mb="md">
            <Paper withBorder p="md" radius="md">
              <Group justify="space-between">
                <Text c="dimmed" size="sm" tt="uppercase" fw={700}>
                  Nivel ELO
                </Text>
                <IconChartBar size={20} color="var(--mantine-color-blue-5)" />
              </Group>
              <Text fz={36} fw={900} c="blue.6">
                {s?.elo || 500}
              </Text>
            </Paper>
            <Paper withBorder p="md" radius="md">
              <Group justify="space-between">
                <Text c="dimmed" size="sm" tt="uppercase" fw={700}>
                  Récord Global
                </Text>
                <IconPingPong size={20} color="var(--mantine-color-teal-5)" />
              </Group>
              <Text fz={36} fw={900}>
                <Text span c="green.6">
                  {s?.matchWon || 0}
                </Text>{' '}
                -{' '}
                <Text span c="red.6">
                  {s?.matchLost || 0}
                </Text>
              </Text>
            </Paper>
            <Paper withBorder p="md" radius="md">
              <Group justify="space-between">
                <Text c="dimmed" size="sm" tt="uppercase" fw={700}>
                  Torneos Jugados
                </Text>
                <IconTrophy size={20} color="var(--mantine-color-orange-5)" />
              </Group>
              <Text fz={36} fw={900} c="orange.6">
                {s?.tournamentPart || 0}
              </Text>
            </Paper>
          </SimpleGrid>

          {/* PRÓXIMO PARTIDO DE EQUIPO DESTACADO */}
          {nextMatch && (
            <Card
              withBorder
              shadow="sm"
              radius="md"
              p="lg"
              bg="blue.0"
              mb="md"
              style={{ borderColor: 'var(--mantine-color-blue-4)', borderWidth: 2 }}
            >
              <Group gap="sm" mb="xs">
                <IconShield size={20} color="var(--mantine-color-blue-7)" />
                <Text fw={700} c="blue.9" tt="uppercase" size="sm">
                  Próximo Partido de Liga
                </Text>
              </Group>
              <Text fw={800} size="xl" c="blue.9">
                {nextMatch.isHome ? nextMatch.teamName : nextMatch.rivalName}
                <Text span c="blue.5" mx="sm">
                  VS
                </Text>
                {nextMatch.isHome ? nextMatch.rivalName : nextMatch.teamName}
              </Text>
              <Text size="sm" c="blue.8" mt="xs" fw={600}>
                📅{' '}
                {new Date(nextMatch.date).toLocaleString('es-ES', {
                  dateStyle: 'full',
                  timeStyle: 'short',
                })}
              </Text>
            </Card>
          )}

          <SimpleGrid cols={{ base: 1, sm: 2 }}>
            <WidgetEntrenamientos />
            <WidgetTorneos />
          </SimpleGrid>
        </>
      )}
    </Stack>
  );
};

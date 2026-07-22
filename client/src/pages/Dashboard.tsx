import { useEffect, useState } from 'react'; // 👈 Añade useEffect y useState
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
} from '@mantine/core'; // 👈 Añade Alert
import { useAuthStore } from '../store/authStore';
import { useNavigate } from 'react-router-dom';
import {
  IconBuildingCommunity,
  IconClock,
  IconTrophy,
  IconUserCheck,
  IconAlertCircle,
} from '@tabler/icons-react';
import { api } from '../api/axios';
import { ENDPOINTS } from '../api/endpoints';

export const Dashboard = () => {
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();

  // Atajos de roles y estados
  const isPlayer = user?.role === 'Player';
  const isAdminClub = user?.role === 'AdminClub';
  const hasApprovedClub = user?.clubStatus === 'Aprobado' && user?.clubId;
  const isPendingClub = user?.clubStatus === 'Pendiente';

  // Estado para guardar los datos de la sede del Admin
  const [clubDetails, setClubDetails] = useState<any>(null);

  useEffect(() => {
    // Si es un AdminClub y tiene sede asignada, nos bajamos sus detalles
    if (isAdminClub && user?.clubId) {
      api
        .get(ENDPOINTS.CLUBS.BY_ID(user.clubId))
        .then((res) => setClubDetails(res.data.data))
        .catch((err) => console.error('Error obteniendo detalles del club:', err));
    }
  }, [isAdminClub, user?.clubId]);
  console.log(user);
  return (
    <Stack gap="lg">
      {/* Tarjeta Principal de Bienvenida */}
      <Card withBorder padding="xl" radius="md" shadow="sm">
        <Group justify="space-between" align="center">
          <Stack gap={4}>
            <Title order={2}>
              ¡Bienvenido de nuevo,{' '}
              {user?.nickname ? user?.nickname : `${user?.name} ${user?.surname || ''}`}!
            </Title>
            <Group gap="xs" mt={4}>
              <Text c="dimmed" size="sm">
                Rol de sistema:
              </Text>
              <Badge variant="light" color={isAdminClub ? 'orange' : 'blue'}>
                {user?.role}
              </Badge>
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

      {/* 🔥 NUEVO: BANNER PARA ADMINS CON PERFIL INCOMPLETO */}
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
          <Button variant="filled" color="orange" size="xs" onClick={() => navigate('/mi-club')}>
            Completar perfil del Club
          </Button>
        </Alert>
      )}

      {/* CASO A: Player libre o rechazado */}
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
                para unirte a su ranking interno de ELO y estadísticas.
              </Text>
              <Button
                variant="filled"
                color="blue"
                w="max-content"
                size="sm"
                mt="xs"
                onClick={() => navigate('/club-selection')}
              >
                Explorar Lista de Clubes
              </Button>
            </Stack>
          </Group>
        </Card>
      )}

      {/* CASO B: Player con solicitud pendiente */}
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
                datos. Mientras tanto, puedes explorar el historial de partidas generales o
                inscribirte en torneos abiertos globales.
              </Text>
            </Stack>
          </Group>
        </Card>
      )}

      {/* CASO C: Player verificado, Admin o SuperAdmin */}
      {(!isPlayer || hasApprovedClub) && (
        <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="lg" mt="md">
          <Card withBorder radius="md" p="lg" shadow="xs">
            <Group gap="sm">
              <ThemeIcon variant="light" color="green" size="lg">
                <IconUserCheck size={20} />
              </ThemeIcon>
              <Text fw={600}>Acceso Verificado</Text>
            </Group>
            <Text size="sm" c="dimmed" mt="xs">
              Tu cuenta se encuentra totalmente activa en el ecosistema de competición. Tienes pleno
              acceso a los listados de jugadores y rankings.
            </Text>
          </Card>

          <Card withBorder radius="md" p="lg" shadow="xs">
            <Group gap="sm">
              <ThemeIcon variant="light" color="orange" size="lg">
                <IconTrophy size={20} />
              </ThemeIcon>
              <Text fw={600}>Competiciones Activas</Text>
            </Group>
            <Text size="sm" c="dimmed" mt="xs">
              Consulta la cartelera para conocer los torneos que están jugándose en este momento en
              tu club y no te quedes fuera del cuadro clasificatorio.
            </Text>
            <Button
              size="xs"
              variant="light"
              color="orange"
              mt="md"
              onClick={() => navigate('/torneos')}
            >
              Ir a Torneos
            </Button>
          </Card>
        </SimpleGrid>
      )}
    </Stack>
  );
};

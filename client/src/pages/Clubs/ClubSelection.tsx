import { useEffect, useState } from 'react';
import {
  Card,
  Title,
  Text,
  SimpleGrid,
  Button,
  Center,
  Loader,
  Stack,
  Container,
  Group,
  ThemeIcon,
  Badge,
} from '@mantine/core';
import { IconBuildingCommunity, IconCheck, IconX, IconClock, IconUsers } from '@tabler/icons-react';
import { notifications } from '@mantine/notifications';
import { api } from '../../api/axios';
import { useAuthStore } from '../../store/authStore';
import { openAppConfirmModal } from '../../utils/modals';
import { ENDPOINTS } from '../../api/endpoints';

interface Club {
  id: string;
  name: string;
  city: string;
  address?: string;
  memberCount: number;
  createdAt: string;
  foundedAt?: string;
}

export const ClubSelection = () => {
  const { user, updateUserFields, logout } = useAuthStore();
  const [clubs, setClubs] = useState<Club[]>([]);
  const [loading, setLoading] = useState(true);
  const [submittingId, setSubmittingId] = useState<string | null>(null);

  useEffect(() => {
    const fetchClubs = async () => {
      try {
        const response = await api.get(ENDPOINTS.CLUBS.BASE);
        if (response.data.success) {
          setClubs(response.data.data);
        }
      } catch (error) {
        notifications.show({
          title: 'Error de conexión',
          message: 'No se pudieron cargar los clubes disponibles.',
          color: 'red',
          icon: <IconX size={16} />,
        });
      } finally {
        setLoading(false);
      }
    };
    fetchClubs();
  }, []);

  const handleJoinClub = (clubId: string, clubName: string) => {
    openAppConfirmModal({
      title: 'Confirmar solicitud de acceso',
      icon: <IconBuildingCommunity size={18} />,
      color: 'blue',
      description: 'Estás a punto de enviar una solicitud para unirte a:',
      highlightText: clubName,
      warningText:
        'Tu cuenta pasará a estar vinculada a este club una vez aprobada por el administrador.',
      confirmLabel: 'Enviar solicitud',
      cancelLabel: 'Volver atrás',
      onConfirm: async () => {
        setSubmittingId(clubId);
        try {
          const response = await api.post(ENDPOINTS.CLUBS.JOIN(clubId));
          if (response.data.success) {
            updateUserFields({ clubId, clubStatus: 'Pendiente' });
          }
        } catch (error) {
          console.error(error);
        } finally {
          setSubmittingId(null);
        }
      },
    });
  };

  if (loading) {
    return (
      <Center h="100vh">
        <Loader color="blue" type="bars" />
      </Center>
    );
  }

  return (
    <Container size="md" py={50}>
      <Stack gap="xl">
        {/* Cabecera informativa */}
        <Card withBorder padding="xl" radius="md" shadow="sm" ta="center">
          <Title order={2}>
            <Text
              component="span"
              inherit
              variant="gradient"
              gradient={{ from: 'blue', to: 'cyan', deg: 90 }}
            >
              ¡Bienvenido a la comunidad, {user?.name}!
            </Text>
          </Title>

          {user?.clubStatus === 'Pendiente' ? (
            <Stack align="center" gap="xs" mt="md">
              <Badge color="yellow" size="lg" variant="light" leftSection={<IconClock size={14} />}>
                Solicitud Pendiente de Aprobación
              </Badge>
              <Text c="dimmed" size="sm" maw={500}>
                Ya has mandado una solicitud. Mientras el administrador de tu club la revisa, los
                accesos a los torneos privados están pausados.
              </Text>
            </Stack>
          ) : (
            <Text c="dimmed" mt="sm">
              Actualmente eres un **jugador libre**. Selecciona un club a continuación para unirte a
              su ecosistema, competir en sus rankings de ELO y participar en sus torneos internos.
            </Text>
          )}

          <Group justify="center" mt="xl">
            <Button variant="subtle" color="red" size="xs" onClick={logout}>
              Salir / Cerrar sesión
            </Button>
          </Group>
        </Card>

        <Title order={3} ff="monospace">
          Clubes Disponibles
        </Title>

        {/* Grid de Clubes */}
        {clubs.length === 0 ? (
          <Card withBorder p="xl" radius="md" ta="center">
            <Text c="dimmed">No hay clubes registrados o activos en el sistema actualmente.</Text>
          </Card>
        ) : (
          <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="lg">
            {clubs.map((club) => {
              const isCurrentRequest = user?.clubId === club.id;
              const hasAnyPending = user?.clubStatus === 'Pendiente';

              return (
                <Card
                  key={club.id}
                  shadow="sm"
                  padding="lg"
                  radius="md"
                  withBorder
                  display="flex"
                  style={{ flexDirection: 'column' }}
                >
                  <Stack gap="xs" style={{ flex: 1 }}>
                    <Group justify="space-between" wrap="nowrap">
                      <Group gap="sm">
                        <ThemeIcon variant="light" size="lg" color="blue">
                          <IconBuildingCommunity size={20} />
                        </ThemeIcon>
                        <Text fw={700} size="lg">
                          {club.name}
                        </Text>
                      </Group>
                      <Badge color="teal" variant="light" leftSection={<IconUsers size={12} />}>
                        {club.memberCount} miembros
                      </Badge>
                    </Group>

                    {/* Datos de Localización Geográfica */}
                    <Group gap={6} mt={4}>
                      <Text size="sm" fw={600} c="dimmed">
                        📍 {club.city}
                      </Text>
                      {club.address && (
                        <Text size="xs" c="dimmed" fs="italic">
                          ({club.address})
                        </Text>
                      )}
                    </Group>

                    <Text size="xs" c="dimmed" mt="auto">
                      Fundado el:{' '}
                      {club.foundedAt
                        ? new Date(club.foundedAt).toLocaleDateString()
                        : new Date(club.createdAt).toLocaleDateString()}
                    </Text>
                  </Stack>

                  <Button
                    fullWidth
                    mt="md"
                    color={isCurrentRequest ? 'yellow' : 'blue'}
                    variant={isCurrentRequest ? 'light' : 'outline'}
                    loading={submittingId === club.id}
                    disabled={hasAnyPending && !isCurrentRequest}
                    leftSection={
                      isCurrentRequest ? <IconClock size={16} /> : <IconCheck size={16} />
                    }
                    onClick={() => handleJoinClub(club.id, club.name)}
                  >
                    {isCurrentRequest ? 'Esperando Aprobación' : 'Solicitar Acceso'}
                  </Button>
                </Card>
              );
            })}
          </SimpleGrid>
        )}
      </Stack>
    </Container>
  );
};

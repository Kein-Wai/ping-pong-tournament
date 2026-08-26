import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, Title, Text, Group, Button, Stack, ThemeIcon } from '@mantine/core';
import { IconTrophy, IconSearch } from '@tabler/icons-react';
import { api } from '../../api/axios';
import { ENDPOINTS } from '../../api/endpoints';
import { APP_ROUTES } from '../../constants/routes';
import { useAuthStore } from '../../store/authStore';

export const WidgetTorneos = () => {
  const { user } = useAuthStore();
  const navigate = useNavigate();
  const [activeTournaments, setActiveTournaments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user?.id) {
      api
        .get(ENDPOINTS.TOURNAMENTS.ENROLLED(user.id))
        .then((res) => {
          setActiveTournaments(res.data.data.slice(0, 3));
        })
        .catch((err) => console.error('Error cargando torneos', err))
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, [user]);

  // 👇 Ahora SOLO ocultamos el widget si está cargando. Si está vacío, sigue bajando.
  if (loading) return null;

  return (
    <Card
      shadow="sm"
      radius="md"
      withBorder
      style={{ borderColor: 'var(--mantine-color-orange-5)', borderWidth: 2 }}
    >
      <Group justify="space-between" mb="md">
        <Group gap="sm">
          <ThemeIcon size="lg" radius="md" color="orange" variant="light">
            <IconTrophy size={20} />
          </ThemeIcon>
          <Title order={4}>Mis Torneos Activos</Title>
        </Group>
      </Group>

      {/* 👇 ESTADO VACÍO (Empty State) */}
      {activeTournaments.length === 0 ? (
        <Stack align="center" gap="sm" py="sm">
          <Text size="sm" c="dimmed" ta="center">
            No estás inscrito en ningún torneo activo actualmente.
          </Text>
          <Button
            variant="light"
            color="orange"
            size="xs"
            leftSection={<IconSearch size={16} />}
            // Asumo que la ruta general de torneos es '/torneos'. Cámbiala por tu APP_ROUTES si es distinta.
            onClick={() => navigate(APP_ROUTES.TORNEOS.LIST)}
          >
            Buscar Torneos
          </Button>
        </Stack>
      ) : (
        /* 👇 ESTADO CON DATOS (Lista de Torneos) */
        <Stack gap="sm">
          {activeTournaments.map((tournament) => (
            <Group
              key={tournament.id}
              justify="space-between"
              wrap="nowrap"
              bg="var(--mantine-color-gray-0)"
              p="xs"
              style={{ borderRadius: 8, darkHidden: true }}
            >
              <Group gap="sm">
                <div>
                  <Text size="sm" fw={600} truncate maw={200}>
                    {tournament.name}
                  </Text>
                  <Text size="xs" c="dimmed">
                    Fase: {tournament.status}
                  </Text>
                </div>
              </Group>

              <Button
                size="xs"
                variant="light"
                color="orange"
                onClick={() => navigate(APP_ROUTES.TORNEOS.DETAILS(tournament.id))}
              >
                Ver Cuadro
              </Button>
            </Group>
          ))}
        </Stack>
      )}
    </Card>
  );
};

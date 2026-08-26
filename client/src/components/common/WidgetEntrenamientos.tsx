import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, Title, Text, Group, Button, Stack, ThemeIcon } from '@mantine/core';
import { IconBarbell, IconCalendarEvent } from '@tabler/icons-react';
import { api } from '../../api/axios';
import { ENDPOINTS } from '../../api/endpoints';
import { APP_ROUTES } from '../../constants/routes';
import { useAuthStore } from '../../store/authStore';

export const WidgetEntrenamientos = () => {
  const { user } = useAuthStore();
  const navigate = useNavigate();
  const [upcoming, setUpcoming] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user?.id && user?.role === 'Player') {
      api
        .get(ENDPOINTS.TRAININGS.UPCOMING(user.id))
        .then((res) => setUpcoming(res.data.data))
        .catch((err) => console.error('Error cargando avisos de entrenamiento', err))
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, [user]);

  if (loading || upcoming.length === 0) return null; // Si no hay entrenos, no mostramos nada y no estorbamos

  return (
    <Card
      shadow="sm"
      radius="md"
      withBorder
      style={{ borderColor: 'var(--mantine-color-blue-5)', borderWidth: 2 }}
    >
      <Group justify="space-between" mb="md">
        <Group gap="sm">
          <ThemeIcon size="lg" radius="md" color="blue" variant="light">
            <IconBarbell size={20} />
          </ThemeIcon>
          <Title order={4}>Entrenamientos Pendientes</Title>
        </Group>
      </Group>

      <Stack gap="sm">
        {upcoming.map((session, index) => {
          // Calculamos cuántos ha hecho
          const completedCount = (session.exercises || []).filter((e: any) => e.completed).length;
          const totalCount = session._count.exercises;

          return (
            <Group
              key={session.id}
              justify="space-between"
              wrap="nowrap"
              bg="var(--mantine-color-gray-0)"
              p="xs"
              style={{ borderRadius: 8, darkHidden: true }}
            >
              <Group gap="sm">
                <IconCalendarEvent size={18} color="var(--mantine-color-gray-6)" />
                <div>
                  <Text size="sm" fw={600}>
                    {index === 0 ? 'Siguiente Sesión' : 'Sesión en Cola'}
                  </Text>
                  <Text size="xs" c="dimmed">
                    Progreso: {completedCount} / {totalCount} ejercicios
                  </Text>
                </div>
              </Group>

              <Button
                size="xs"
                variant="light"
                color="blue"
                onClick={() => navigate(APP_ROUTES.ENTRENAMIENTOS.SESSION(session.id))}
              >
                {completedCount > 0 ? 'Continuar' : 'Empezar'}
              </Button>
            </Group>
          );
        })}
      </Stack>
    </Card>
  );
};

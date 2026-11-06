import { Card, Group, SimpleGrid, Stack, Text, ThemeIcon, Title, UnstyledButton } from '@mantine/core';
import { IconBolt, IconFlame, IconReportAnalytics } from '@tabler/icons-react';
import type { ComponentType } from 'react';
import { useNavigate } from 'react-router-dom';
import { usePermissions } from '../../hooks/usePermissions';
import { APP_ROUTES } from '../../constants/routes';
import { useAuthStore } from '../../store/authStore';
import { useSyncStore } from '../../store/syncStore';

interface OfflineShortcut {
  label: string;
  description: string;
  path: string;
  icon: ComponentType<{ size?: number }>;
  show: boolean;
}

/** Inicio sin conexión: solo los accesos a lo que funciona y el contador de pendientes. */
export const OfflineHome = () => {
  const navigate = useNavigate();
  const user = useAuthStore((state) => state.user);
  const { isPlayer, isAdminClub } = usePermissions();
  const pending = useSyncStore((state) => state.pending + state.needsAttention);

  const shortcuts: OfflineShortcut[] = [
    {
      label: 'Análisis Pro',
      description: 'Registra un partido; se enviará al volver la conexión.',
      path: APP_ROUTES.ANALISIS.LIST,
      icon: IconReportAnalytics,
      show: isPlayer || isAdminClub,
    },
    {
      label: 'Calentamiento',
      description: 'Tus rutinas de calentamiento.',
      path: APP_ROUTES.CALENTAMIENTO,
      icon: IconFlame,
      show: isPlayer,
    },
    {
      label: 'Juegos de Reflejo',
      description: 'Entrena tus reflejos.',
      path: APP_ROUTES.JUEGOS_REFLEJO.LIST,
      icon: IconBolt,
      show: isPlayer,
    },
  ];

  return (
    <Stack gap="lg">
      <Stack gap={4}>
        <Title order={2}>Hola{user?.name ? `, ${user.name}` : ''}</Title>
        <Text c="dimmed">
          Estás sin conexión. Esto es lo que puedes hacer ahora
          {pending > 0 ? `; tienes ${pending} ${pending === 1 ? 'pendiente' : 'pendientes'} de enviar.` : '.'}
        </Text>
      </Stack>
      <SimpleGrid cols={{ base: 1, sm: 3 }}>
        {shortcuts
          .filter((shortcut) => shortcut.show)
          .map(({ label, description, path, icon: Icon }) => (
            <UnstyledButton key={label} onClick={() => navigate(path)} aria-label={label}>
              <Card withBorder radius="md" padding="lg" h="100%">
                <Group wrap="nowrap" align="flex-start">
                  <ThemeIcon size={40} radius="md" variant="light">
                    <Icon size={22} />
                  </ThemeIcon>
                  <Stack gap={2}>
                    <Text fw={700}>{label}</Text>
                    <Text size="sm" c="dimmed">
                      {description}
                    </Text>
                  </Stack>
                </Group>
              </Card>
            </UnstyledButton>
          ))}
      </SimpleGrid>
    </Stack>
  );
};

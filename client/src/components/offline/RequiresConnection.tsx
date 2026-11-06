import { Button, Center, Stack, Text, ThemeIcon, Title } from '@mantine/core';
import { IconWifiOff } from '@tabler/icons-react';
import { useNavigate } from 'react-router-dom';
import { APP_ROUTES } from '../../constants/routes';

interface RequiresConnectionProps {
  message?: string;
}

/** Pantalla que sustituye a las secciones que no funcionan sin conexión. */
export const RequiresConnection = ({
  message = 'Esta sección necesita conexión a internet. Puedes seguir usando Análisis Pro, Calentamiento y Juegos de Reflejo.',
}: RequiresConnectionProps) => {
  const navigate = useNavigate();

  return (
    <Center mih={320}>
      <Stack align="center" gap="sm" maw={420} ta="center">
        <ThemeIcon size={64} radius="xl" variant="light" color="gray">
          <IconWifiOff size={34} />
        </ThemeIcon>
        <Title order={3}>Requiere conexión</Title>
        <Text c="dimmed">{message}</Text>
        <Button variant="light" onClick={() => navigate(APP_ROUTES.HOME)}>
          Ir al inicio
        </Button>
      </Stack>
    </Center>
  );
};

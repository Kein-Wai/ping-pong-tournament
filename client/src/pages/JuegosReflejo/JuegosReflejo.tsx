import { Badge, Button, Card, SimpleGrid, Stack, Text, Title } from '@mantine/core';
import { Link } from 'react-router-dom';
import { APP_ROUTES } from '../../constants/routes';
import { REFLEX_GAMES } from '../../constants/reflexGames';
import { useAuthStore } from '../../store/authStore';
import { getRecord } from '../../utils/reflex/reflexRecords';

export const JuegosReflejo = () => {
  const userId = useAuthStore((state) => state.user?.id) ?? '';

  return (
    <Stack gap="lg">
      <Title order={2}>Juegos de Reflejo</Title>
      <Text c="dimmed" size="sm">
        Los récords se guardan solo en este dispositivo: si borras los datos del navegador, se pierden.
      </Text>
      <SimpleGrid cols={{ base: 1, sm: 2, lg: 3 }}>
        {REFLEX_GAMES.map((game) => {
          const record = getRecord(userId, game.slug);
          return (
            <Card key={game.slug} withBorder padding="lg" radius="md">
              <Stack gap="sm">
                <Title order={3}>{game.name}</Title>
                <Text size="sm">{game.description}</Text>
                <Badge variant="light" color={record === null ? 'gray' : 'teal'}>
                  {record === null ? 'Sin récord' : `Récord: ${game.formatScore(record)}`}
                </Badge>
                <Button
                  component={Link}
                  to={APP_ROUTES.JUEGOS_REFLEJO.PLAY(game.slug)}
                  aria-label={`Jugar ${game.name}`}
                >
                  Jugar
                </Button>
              </Stack>
            </Card>
          );
        })}
      </SimpleGrid>
    </Stack>
  );
};

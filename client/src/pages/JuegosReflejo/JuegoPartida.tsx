import { useEffect } from 'react';
import { Button, Stack, Text, Title } from '@mantine/core';
import { Link, useParams } from 'react-router-dom';
import { TilesGame } from '../../components/reflex/TilesGame';
import { findReflexGame, type ReflexGame } from '../../constants/reflexGames';
import { APP_ROUTES } from '../../constants/routes';
import { useFeedbackSound } from '../../hooks/useFeedbackSound';
import { useGameSession } from '../../hooks/useGameSession';
import { useAuthStore } from '../../store/authStore';
import { createReflexSound } from '../../utils/reflex/reflexSound';

const BackLink = () => (
  <Button component={Link} to={APP_ROUTES.JUEGOS_REFLEJO.LIST} variant="default">
    Volver a los juegos
  </Button>
);

const GameRound = ({ game }: { game: ReflexGame }) => {
  const userId = useAuthStore((state) => state.user?.id) ?? '';
  const session = useGameSession(userId, game);
  const sound = useFeedbackSound(createReflexSound);
  const { phase, countdown, result, record } = session;

  useEffect(() => {
    if (phase === 'countdown') sound.play('tick');
    if (phase === 'playing') sound.play('go');
  }, [phase, countdown, sound]);

  // «Empezar» es el gesto del usuario que los navegadores exigen para poder sonar.
  const handleStart = () => {
    sound.unlock();
    session.start();
  };

  return (
    <Stack gap="lg">
      <Title order={2}>{game.name}</Title>
      {phase === 'instructions' && (
        <Stack gap="md">
          <Text>{game.instructions}</Text>
          <Text c="dimmed" size="sm">
            {record === null ? 'Aún no tienes récord.' : `Tu récord: ${game.formatScore(record)}`}
          </Text>
          <Button onClick={handleStart}>Empezar</Button>
          <BackLink />
        </Stack>
      )}
      {phase === 'countdown' && (
        <Title order={1} ta="center" aria-live="assertive">
          {countdown}
        </Title>
      )}
      {phase === 'playing' && (
        <TilesGame onFinish={session.finish} onCue={sound.play} />
      )}
      {phase === 'result' && result !== null && (
        <Stack gap="md" align="center">
          <Title order={3}>Resultado</Title>
          <Text size="xl" fw={700}>{game.formatScore(result.score)}</Text>
          {result.isNewRecord && result.score === 0 && (
            <Text c="dimmed">Mala suerte, vuelve a intentarlo.</Text>
          )}
          {result.isNewRecord && result.score !== 0 && (
            <Text c="teal" fw={600}>
              ¡Nuevo récord!
            </Text>
          )}
          {!result.isNewRecord && (
            <Text c="dimmed">{`Tu récord: ${game.formatScore(result.record)}`}</Text>
          )}
          <Button onClick={handleStart}>Jugar otra vez</Button>
          <BackLink />
        </Stack>
      )}
    </Stack>
  );
};

export const JuegoPartida = () => {
  const { juego } = useParams();
  const game = findReflexGame(juego);

  if (game === undefined) {
    return (
      <Stack gap="md">
        <Title order={2}>Juego no encontrado</Title>
        <BackLink />
      </Stack>
    );
  }

  return <GameRound key={game.slug} game={game} />;
};

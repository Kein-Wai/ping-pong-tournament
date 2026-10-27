import { useCallback, useEffect, useRef, useState } from 'react';
import { Group, Stack, Text } from '@mantine/core';
import { useLatestRef } from '../../hooks/useLatestRef';
import type { ReflexGameProps } from '../../types/reflex';
import { remainingSecOf } from '../../utils/reflex/clock';
import {
  CELL_COUNT,
  GAME_DURATION_MS,
  advance,
  createGoNoGoGame,
  isGoNoGoOver,
  scoreOf,
  tapCell,
  type CircleColor,
  type GoNoGoState,
} from '../../utils/reflex/goNoGoEngine';
import { PressButton } from './PressButton';
import { SquareBoard } from './SquareBoard';

// Con un intervalo más largo un círculo podría aparecer o desaparecer hasta esa fracción de segundo tarde.
const TICK_MS = 25;
const BOARD_COLUMNS = 3;

const CIRCLE_COLORS: Record<CircleColor, string> = {
  go: 'var(--mantine-color-green-6)',
  nogo: 'var(--mantine-color-red-6)',
};
// El círculo ocupa el 70 % de la casilla y su borde tiene un pequeño degradado para no verse dentado.
const circleBackground = (circle: CircleColor) =>
  `radial-gradient(circle closest-side at 50% 50%, ${CIRCLE_COLORS[circle]} 0 69%, transparent 71%)`;

const errorsOf = (game: GoNoGoState) => game.wrongTaps + game.missed;
const remainingSecOfGame = (game: GoNoGoState, now: number) =>
  remainingSecOf(game.startedAt, GAME_DURATION_MS, now);

export const GoNoGoGame = ({ onFinish, onCue }: ReflexGameProps) => {
  const [view, setView] = useState(() => {
    const game = createGoNoGoGame(Date.now());
    return { game, remainingSec: remainingSecOfGame(game, game.startedAt) };
  });
  const gameRef = useRef<GoNoGoState>(view.game);
  const finishedRef = useRef(false);
  // Los avisos van en refs para que el bucle no se reinicie si el padre pasa funciones nuevas.
  const onCueRef = useLatestRef(onCue);
  const onFinishRef = useLatestRef(onFinish);

  // El motor vive en una ref para poder avisar (sonido, fin) sin efectos secundarios dentro de setState.
  const apply = useCallback((next: GoNoGoState, now: number) => {
    const previous = gameRef.current;
    gameRef.current = next;
    if (next.hits > previous.hits) onCueRef.current('hit');
    if (errorsOf(next) > errorsOf(previous)) onCueRef.current('miss');
    if (isGoNoGoOver(next, now) && !finishedRef.current) {
      finishedRef.current = true;
      onCueRef.current('finish');
      onFinishRef.current(scoreOf(next));
    }
    // El reloj corre a 40 ticks por segundo pero solo cambia algo visible al mover un círculo o un segundo.
    const remainingSec = remainingSecOfGame(next, now);
    setView((current) =>
      current.game === next && current.remainingSec === remainingSec
        ? current
        : { game: next, remainingSec }
    );
  }, [onCueRef, onFinishRef]);

  useEffect(() => {
    const interval = setInterval(() => {
      const now = Date.now();
      apply(advance(gameRef.current, now, Math.random), now);
    }, TICK_MS);
    return () => clearInterval(interval);
  }, [apply]);

  const handlePress = useCallback(
    (cell: number) => {
      const now = Date.now();
      apply(tapCell(gameRef.current, cell, now), now);
    },
    [apply]
  );

  return (
    <Stack gap="md">
      <Group justify="space-between">
        <Text fw={600}>{`Puntos: ${scoreOf(view.game)}`}</Text>
        <Text fw={600}>{`Errores: ${errorsOf(view.game)}`}</Text>
        <Text fw={600}>{`Tiempo: ${view.remainingSec} s`}</Text>
      </Group>
      <SquareBoard columns={BOARD_COLUMNS} label="Tablero de círculos">
        {Array.from({ length: CELL_COUNT }, (_, cell) => {
          const circle = view.game.cell === cell ? view.game.color : null;
          return (
            <PressButton
              key={cell}
              aria-label={`Casilla ${cell + 1}`}
              data-circle={circle ?? 'none'}
              color="gray"
              variant="light"
              onPress={() => handlePress(cell)}
              // El círculo es el fondo de la propia casilla: dentro del botón de Mantine un hijo con
              // ancho en porcentaje se queda en 0 y no se vería.
              style={{
                height: '100%',
                padding: 0,
                touchAction: 'manipulation',
                backgroundImage: circle === null ? undefined : circleBackground(circle),
              }}
            />
          );
        })}
      </SquareBoard>
    </Stack>
  );
};

import { useCallback, useEffect, useRef, useState } from 'react';
import { Button, Group, SimpleGrid, Stack, Text } from '@mantine/core';
import type { ReflexCue } from '../../utils/reflex/reflexSound';
import {
  GAME_DURATION_MS,
  TILE_COUNT,
  advance,
  createTilesGame,
  isTilesOver,
  scoreOf,
  tapTile,
  type TilesState,
} from '../../utils/reflex/tilesEngine';

interface TilesGameProps {
  onFinish: (score: number) => void;
  onCue: (cue: ReflexCue) => void;
}

// Con un intervalo más largo una teja podría encenderse hasta esa fracción de segundo tarde.
const TICK_MS = 25;

const remainingSecOf = (game: TilesState, now: number) =>
  Math.max(0, Math.ceil((GAME_DURATION_MS - (now - game.startedAt)) / 1000));

export const TilesGame = ({ onFinish, onCue }: TilesGameProps) => {
  const [view, setView] = useState(() => {
    const game = createTilesGame(Date.now());
    return { game, remainingSec: remainingSecOf(game, game.startedAt) };
  });
  const gameRef = useRef<TilesState>(view.game);
  const finishedRef = useRef(false);
  // Los avisos van en refs para que el intervalo no se reinicie si el padre pasa funciones nuevas.
  const onCueRef = useRef(onCue);
  const onFinishRef = useRef(onFinish);
  useEffect(() => {
    onCueRef.current = onCue;
    onFinishRef.current = onFinish;
  }, [onCue, onFinish]);

  // El motor vive en una ref para poder avisar (sonido, fin) sin efectos secundarios dentro de setState.
  const apply = useCallback((next: TilesState, now: number) => {
    const previous = gameRef.current;
    gameRef.current = next;
    if (next.hits > previous.hits) onCueRef.current('hit');
    if (next.misses > previous.misses) onCueRef.current('miss');
    if (isTilesOver(next, now) && !finishedRef.current) {
      finishedRef.current = true;
      onCueRef.current('finish');
      onFinishRef.current(scoreOf(next));
    }
    // El reloj corre a 40 ticks por segundo pero solo cambia algo visible al mover una teja o un segundo.
    const remainingSec = remainingSecOf(next, now);
    setView((current) =>
      current.game === next && current.remainingSec === remainingSec
        ? current
        : { game: next, remainingSec }
    );
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      const now = Date.now();
      apply(advance(gameRef.current, now, Math.random), now);
    }, TICK_MS);
    return () => clearInterval(interval);
  }, [apply]);

  const handleTap = useCallback(
    (tile: number) => {
      const now = Date.now();
      apply(tapTile(gameRef.current, tile, now), now);
    },
    [apply]
  );

  return (
    <Stack gap="md">
      <Group justify="space-between">
        <Text fw={600}>{`Puntos: ${scoreOf(view.game)}`}</Text>
        <Text fw={600}>{`Fallos: ${view.game.misses}`}</Text>
        <Text fw={600}>{`Tiempo: ${view.remainingSec} s`}</Text>
      </Group>
      <SimpleGrid cols={4} spacing="xs">
        {Array.from({ length: TILE_COUNT }, (_, tile) => {
          const lit = view.game.litTile === tile;
          return (
            <Button
              key={tile}
              aria-label={`Teja ${tile + 1}`}
              data-lit={lit}
              color={lit ? 'orange' : 'gray'}
              variant={lit ? 'filled' : 'light'}
              onClick={() => handleTap(tile)}
              // Sin esto el móvil espera ~300 ms antes de registrar el toque.
              style={{ height: 'auto', aspectRatio: '1', touchAction: 'manipulation' }}
            />
          );
        })}
      </SimpleGrid>
    </Stack>
  );
};

import { useCallback, useEffect, useRef, useState } from 'react';
import { Box, Group, Stack, Text } from '@mantine/core';
import { useLatestRef } from '../../hooks/useLatestRef';
import type { ReflexGameProps } from '../../types/reflex';
import {
  BALLS,
  advance,
  averageDeviationMs,
  createTimingGame,
  scoreOf,
  tap,
  type ShotQuality,
  type ShotResult,
  type TimingState,
} from '../../utils/reflex/timingEngine';
import { fitWidth } from './fitWidth';

// Campo en proporción 3:4, igual que el de Ping Pong: el motor no depende de los píxeles.
const FIELD_WIDTH = 0.75;
const FIELD_HEIGHT = 1;
const MAX_FIELD_WIDTH_PX = 420;
const BALL_RADIUS = 0.03;
const RACKET_Y = 0.88;
const RACKET_WIDTH = 0.22;
const RACKET_THICKNESS = 0.03;
/** Altura máxima que alcanza la pelota sobre la raqueta, en alturas del campo. */
const PEAK_HEIGHT = 0.7;
const REST_Y = RACKET_Y - BALL_RADIUS;

const QUALITY_LABEL: Record<ShotQuality, string> = {
  perfect: 'Perfecto',
  good: 'Bueno',
  early: 'Pronto',
  late: 'Tarde',
  'too-early': 'Demasiado pronto',
  'too-late': 'Demasiado tarde',
};

const QUALITY_COLOR: Record<ShotQuality, string> = {
  perfect: 'var(--mantine-color-teal-4)',
  good: 'var(--mantine-color-green-5)',
  early: 'var(--mantine-color-yellow-5)',
  late: 'var(--mantine-color-yellow-5)',
  'too-early': 'var(--mantine-color-red-5)',
  'too-late': 'var(--mantine-color-red-5)',
};

/** Con el signo explícito para distinguir pronto de tarde: «−130 ms», «+75 ms», «0 ms». */
const formatDeviation = (ms: number) => `${ms > 0 ? '+' : ms < 0 ? '−' : ''}${Math.abs(ms)} ms`;

const describeShot = (shot: ShotResult) =>
  shot.deviationMs === null
    ? QUALITY_LABEL[shot.quality]
    : `${QUALITY_LABEL[shot.quality]} · ${formatDeviation(shot.deviationMs)}`;

/** La pelota sube en parábola desde la raqueta y vuelve a ella justo en el instante del impacto. */
function ballYAt(game: TimingState, now: number): number {
  if (game.phase !== 'flying') return REST_Y;
  const progress = Math.min(1, Math.max(0, (now - game.launchAt) / (game.impactAt - game.launchAt)));
  return REST_Y - 4 * progress * (1 - progress) * PEAK_HEIGHT;
}

export const TimingGame = ({ onFinish, onCue }: ReflexGameProps) => {
  const [view, setView] = useState(() => {
    const now = Date.now();
    return { game: createTimingGame(now), now };
  });
  const gameRef = useRef<TimingState>(view.game);
  const finishedRef = useRef(false);
  // Los avisos van en refs para que el bucle no se reinicie si el padre pasa funciones nuevas.
  const onCueRef = useLatestRef(onCue);
  const onFinishRef = useLatestRef(onFinish);

  // El motor vive en una ref para poder avisar (sonido, fin) sin efectos secundarios dentro de setState.
  const apply = useCallback((next: TimingState, now: number) => {
    const previous = gameRef.current;
    gameRef.current = next;

    if (next.results.length > previous.results.length) {
      const shot = next.results[next.results.length - 1];
      onCueRef.current(shot.points >= 6 ? 'hit' : 'miss');
    }
    if (next.phase === 'done' && !finishedRef.current) {
      finishedRef.current = true;
      onCueRef.current('finish');
      const average = averageDeviationMs(next.results);
      onFinishRef.current(
        scoreOf(next),
        average === null ? undefined : `Desviación media: ${average} ms`
      );
    }
    setView({ game: next, now });
  }, [onCueRef, onFinishRef]);

  useEffect(() => {
    let frameId = 0;
    const frame = () => {
      const now = Date.now();
      const next = advance(gameRef.current, now);
      // Durante la pausa que muestra el resultado nada se mueve: no hace falta repintar 60 veces por segundo.
      if (next !== gameRef.current || next.phase === 'flying') apply(next, now);
      if (gameRef.current.phase !== 'done') frameId = requestAnimationFrame(frame);
    };
    frameId = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(frameId);
  }, [apply]);

  const handlePress = useCallback(() => {
    const now = Date.now();
    apply(tap(gameRef.current, now), now);
  }, [apply]);

  // En la ventana y no en la zona: nada tiene el foco al empezar la partida, y el espacio también
  // desplazaría la página si no se cancela.
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key !== ' ' && event.key !== 'Enter') return;
      event.preventDefault();
      if (!event.repeat) handlePress();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handlePress]);

  const { game, now } = view;
  const lastShot = game.phase === 'shown' ? game.results[game.results.length - 1] : null;

  return (
    <Stack gap="md">
      <Group justify="space-between">
        <Text fw={600}>{`Pelota ${game.ball} de ${BALLS}`}</Text>
        <Text fw={600}>{`Puntos: ${scoreOf(game)}`}</Text>
      </Group>
      <Box
        role="button"
        tabIndex={0}
        aria-label="Zona de golpeo"
        // Se golpea al pulsar, no al soltar: el clic llega ~100 ms más tarde y falsearía la desviación.
        onPointerDown={handlePress}
        style={{
          position: 'relative',
          width: fitWidth(FIELD_WIDTH / FIELD_HEIGHT, MAX_FIELD_WIDTH_PX),
          aspectRatio: `${FIELD_WIDTH} / ${FIELD_HEIGHT}`,
          marginInline: 'auto',
          touchAction: 'manipulation',
          userSelect: 'none',
          cursor: 'pointer',
          background: 'var(--mantine-color-dark-8)',
          borderRadius: 8,
        }}
      >
        <svg
          viewBox={`0 0 ${FIELD_WIDTH} ${FIELD_HEIGHT}`}
          width="100%"
          height="100%"
          aria-hidden="true"
        >
          <rect
            data-testid="racket-handle"
            x={FIELD_WIDTH / 2 - 0.015}
            y={RACKET_Y + RACKET_THICKNESS}
            width={0.03}
            height={0.08}
            rx={0.012}
            fill="var(--mantine-color-gray-6)"
          />
          <rect
            data-testid="racket"
            x={FIELD_WIDTH / 2 - RACKET_WIDTH / 2}
            y={RACKET_Y}
            width={RACKET_WIDTH}
            height={RACKET_THICKNESS}
            rx={RACKET_THICKNESS / 2}
            fill={lastShot === null ? 'var(--mantine-color-gray-4)' : QUALITY_COLOR[lastShot.quality]}
          />
          <circle
            data-testid="ball"
            cx={FIELD_WIDTH / 2}
            cy={ballYAt(game, now)}
            r={BALL_RADIUS}
            fill="var(--mantine-color-orange-5)"
          />
        </svg>
        {lastShot !== null && (
          <Box
            style={{
              position: 'absolute',
              inset: 0,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              pointerEvents: 'none',
            }}
          >
            <Text fw={700} size="xl" c="white" ta="center" aria-live="polite">
              {describeShot(lastShot)}
            </Text>
          </Box>
        )}
      </Box>
    </Stack>
  );
};

import { useCallback, useEffect, useRef, useState, type PointerEvent } from 'react';
import { Box, Stack, Text } from '@mantine/core';
import { useLatestRef } from '../../hooks/useLatestRef';
import type { ReflexGameProps } from '../../types/reflex';
import {
  BALL_RADIUS,
  BAR_THICKNESS,
  BAR_WIDTH,
  BAR_Y,
  FIELD_HEIGHT,
  FIELD_WIDTH,
  clampBarX,
  createPingPongGame,
  step,
} from '../../utils/reflex/pingPongEngine';
import { fitWidth } from './fitWidth';

const MAX_FIELD_WIDTH_PX = 420;
// Unidades del campo (que mide 0,75 de ancho) que se desplaza la barra por segundo con las flechas.
const KEY_SPEED = 1;

export const PingPongGame = ({ onFinish, onCue }: ReflexGameProps) => {
  const [view, setView] = useState(() => ({
    ball: createPingPongGame(Math.random),
    barX: FIELD_WIDTH / 2,
  }));
  const ballRef = useRef(view.ball);
  const barXRef = useRef(view.barX);
  const keysRef = useRef({ left: false, right: false });
  const finishedRef = useRef(false);
  // Los avisos van en refs para que el bucle no se reinicie si el padre pasa funciones nuevas.
  const onCueRef = useLatestRef(onCue);
  const onFinishRef = useLatestRef(onFinish);

  useEffect(() => {
    let lastTime: number | null = null;
    let frameId = 0;

    const frame = (time: number) => {
      const dtMs = lastTime === null ? 0 : time - lastTime;
      lastTime = time;

      const direction = Number(keysRef.current.right) - Number(keysRef.current.left);
      if (direction !== 0) {
        barXRef.current = clampBarX(barXRef.current + (direction * KEY_SPEED * dtMs) / 1000);
      }

      const previous = ballRef.current;
      const next = step(previous, dtMs, barXRef.current);
      ballRef.current = next;

      if (next.bounces > previous.bounces) onCueRef.current('hit');
      if (next.over && !finishedRef.current) {
        finishedRef.current = true;
        onCueRef.current('miss');
        onCueRef.current('finish');
        onFinishRef.current(next.bounces);
      }
      setView({ ball: next, barX: barXRef.current });

      if (!next.over) frameId = requestAnimationFrame(frame);
    };

    frameId = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(frameId);
  }, [onCueRef, onFinishRef]);

  useEffect(() => {
    const setKey = (key: string, pressed: boolean) => {
      if (key === 'ArrowLeft') keysRef.current.left = pressed;
      if (key === 'ArrowRight') keysRef.current.right = pressed;
    };
    const handleDown = (event: KeyboardEvent) => {
      setKey(event.key, true);
      // Sin esto las flechas desplazan la página si desborda en horizontal.
      if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') event.preventDefault();
    };
    const handleUp = (event: KeyboardEvent) => setKey(event.key, false);
    // Si la ventana pierde el foco con una flecha pulsada, el navegador no avisa de que se soltó.
    const releaseAll = () => {
      keysRef.current = { left: false, right: false };
    };
    window.addEventListener('keydown', handleDown);
    window.addEventListener('keyup', handleUp);
    window.addEventListener('blur', releaseAll);
    document.addEventListener('visibilitychange', releaseAll);
    return () => {
      window.removeEventListener('keydown', handleDown);
      window.removeEventListener('keyup', handleUp);
      window.removeEventListener('blur', releaseAll);
      document.removeEventListener('visibilitychange', releaseAll);
    };
  }, []);

  // La barra sigue la posición horizontal del puntero dentro del campo, esté pulsado o no.
  const handlePointer = useCallback((event: PointerEvent<HTMLDivElement>) => {
    const rect = event.currentTarget.getBoundingClientRect();
    if (rect.width === 0) return;
    const barX = clampBarX(((event.clientX - rect.left) / rect.width) * FIELD_WIDTH);
    barXRef.current = barX;
    setView((current) => ({ ...current, barX }));
  }, []);

  const { ball, barX } = view;
  // La barra de arriba es una pared que acompaña a la pelota: solo adorno, nunca falla.
  const cpuBarX = clampBarX(ball.x);

  return (
    <Stack gap="md">
      <Text fw={600}>{`Rebotes: ${ball.bounces}`}</Text>
      <Box
        role="group"
        aria-label="Campo de Ping Pong"
        onPointerMove={handlePointer}
        onPointerDown={handlePointer}
        style={{
          width: fitWidth(FIELD_WIDTH / FIELD_HEIGHT, MAX_FIELD_WIDTH_PX),
          aspectRatio: `${FIELD_WIDTH} / ${FIELD_HEIGHT}`,
          marginInline: 'auto',
          // Sin esto, arrastrar el dedo por el campo desplaza la página en vez de mover la barra.
          touchAction: 'none',
          userSelect: 'none',
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
            data-testid="cpu-bar"
            x={cpuBarX - BAR_WIDTH / 2}
            y={0}
            width={BAR_WIDTH}
            height={BAR_THICKNESS}
            rx={BAR_THICKNESS / 2}
            fill="var(--mantine-color-gray-6)"
          />
          <circle
            data-testid="ball"
            cx={ball.x}
            cy={ball.y}
            r={BALL_RADIUS}
            fill="var(--mantine-color-orange-5)"
          />
          <rect
            data-testid="player-bar"
            x={barX - BAR_WIDTH / 2}
            y={BAR_Y}
            width={BAR_WIDTH}
            height={BAR_THICKNESS}
            rx={BAR_THICKNESS / 2}
            fill="var(--mantine-color-teal-4)"
          />
        </svg>
      </Box>
    </Stack>
  );
};

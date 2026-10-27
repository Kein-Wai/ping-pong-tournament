import { useCallback, useEffect, useRef, useState } from 'react';
import { Stack, Text } from '@mantine/core';
import { useLatestRef } from '../../hooks/useLatestRef';
import type { ReflexGameProps } from '../../types/reflex';
import { PressButton } from './PressButton';
import {
  ATTEMPTS,
  advance,
  averageMs,
  createReactionGame,
  tap,
  type ReactionState,
} from '../../utils/reflex/reactionEngine';

// Con un intervalo más largo la señal podría darse hasta esa fracción de segundo tarde.
const TICK_MS = 25;

const COLOR_BY_PHASE = { waiting: 'red', go: 'green', shown: 'blue', done: 'blue' } as const;

function statusOf(state: ReactionState): string {
  if (state.phase === 'waiting') return 'Espera la señal…';
  if (state.phase === 'go') return '¡Ya!';
  if (state.outcome === 'false-start') return 'Salida en falso';
  if (state.outcome === 'too-slow') return 'Demasiado lento';
  if (state.outcome === 'reaction') return `${state.lastMs} ms`;
  return '';
}

export const ReactionGame = ({ onFinish, onCue }: ReflexGameProps) => {
  const [state, setState] = useState(() => createReactionGame(Date.now(), Math.random));
  const stateRef = useRef<ReactionState>(state);
  const finishedRef = useRef(false);
  // Los avisos van en refs para que el bucle no se reinicie si el padre pasa funciones nuevas.
  const onCueRef = useLatestRef(onCue);
  const onFinishRef = useLatestRef(onFinish);

  // El motor vive en una ref para poder avisar (sonido, fin) sin efectos secundarios dentro de setState.
  const apply = useCallback((next: ReactionState) => {
    const previous = stateRef.current;
    if (next === previous) return;
    stateRef.current = next;

    if (previous.phase !== 'go' && next.phase === 'go') onCueRef.current('go');
    if (previous.phase !== 'shown' && next.phase === 'shown') {
      onCueRef.current(next.outcome === 'reaction' ? 'hit' : 'miss');
    }
    if (next.phase === 'done' && !finishedRef.current) {
      finishedRef.current = true;
      onCueRef.current('finish');
      onFinishRef.current(averageMs(next.times));
    }
    setState(next);
  }, [onCueRef, onFinishRef]);

  useEffect(() => {
    const interval = setInterval(() => {
      apply(advance(stateRef.current, Date.now(), Math.random));
    }, TICK_MS);
    return () => clearInterval(interval);
  }, [apply]);

  const handlePress = useCallback(() => {
    apply(tap(stateRef.current, Date.now(), Math.random));
  }, [apply]);

  return (
    <Stack gap="md">
      <Text fw={600}>{`Intento ${state.attempt} de ${ATTEMPTS}`}</Text>
      <PressButton
        aria-label="Zona de reacción"
        data-signal={state.phase === 'go'}
        color={COLOR_BY_PHASE[state.phase]}
        onPress={handlePress}
        style={{ height: 'auto', minHeight: '40vh', fontSize: '2rem', touchAction: 'manipulation' }}
      >
        {statusOf(state)}
      </PressButton>
    </Stack>
  );
};

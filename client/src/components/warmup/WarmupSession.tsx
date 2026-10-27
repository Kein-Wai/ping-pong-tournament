import { useState } from 'react';
import { ActionIcon, Button, Group, Stack, Text, Title } from '@mantine/core';
import {
  IconPlayerPause,
  IconPlayerPlay,
  IconPlayerSkipBack,
  IconPlayerSkipForward,
} from '@tabler/icons-react';
import { WARMUP_EXERCISES_BY_KEY } from '../../constants/warmupExercises';
import type { WarmupItem, WarmupView } from '../../utils/warmupEngine';
import { formatClock, formatDuration } from '../../utils/warmupFormat';
import { WarmupAnimation } from './WarmupAnimation';

export interface WarmupSessionProps {
  view: WarmupView;
  items: WarmupItem[];
  onPause: () => void;
  onResume: () => void;
  onHold: () => void;
  onSkip: () => void;
  onNext: () => void;
  onPrevious: () => void;
  onFinish: () => void;
}

export const WarmupSession = ({
  view,
  items,
  onPause,
  onResume,
  onHold,
  onSkip,
  onNext,
  onPrevious,
  onFinish,
}: WarmupSessionProps) => {
  const [confirmingFinish, setConfirmingFinish] = useState(false);
  const exercise = WARMUP_EXERCISES_BY_KEY[items[view.index].exerciseKey];
  const isCountdown = view.phase === 'countdown';
  const isRest = view.phase === 'rest';

  return (
    <Stack gap="md" align="center">
      {isCountdown && <Title order={3}>¡Prepárate!</Title>}
      {isRest && (
        <Text size="sm" c="dimmed">
          Prepárate para
        </Text>
      )}
      {!isCountdown && <Title order={2}>{exercise.name}</Title>}

      <WarmupAnimation exerciseKey={exercise.key} />

      <Text data-testid="reloj" fz={64} fw={700} lh={1} aria-live="off">
        {isCountdown ? view.remainingSec : formatClock(view.remainingSec)}
      </Text>

      {isCountdown && <Text c="dimmed">Empezamos con {exercise.name}</Text>}
      {!isCountdown && !isRest && (
        <Text ta="center" maw={420}>
          {exercise.description}
        </Text>
      )}
      {isRest && view.waiting && (
        <Text ta="center" c="dimmed">
          Esperando: pulsa «Ya estoy listo» cuando quieras empezar.
        </Text>
      )}
      {isRest && (
        <Group>
          <Button onClick={onSkip}>Ya estoy listo</Button>
          <Button variant="default" disabled={view.waiting} onClick={onHold}>
            Esperar
          </Button>
        </Group>
      )}

      <Text size="sm" c="dimmed">
        Ejercicio {view.index + 1} de {items.length} · quedan {formatDuration(view.totalRemainingSec)}
      </Text>

      <Group gap="sm">
        <ActionIcon
          size="xl"
          variant="default"
          aria-label="Ejercicio anterior"
          disabled={isCountdown}
          onClick={onPrevious}
        >
          <IconPlayerSkipBack />
        </ActionIcon>
        {view.paused ? (
          <Button leftSection={<IconPlayerPlay size={18} />} onClick={onResume}>
            Reanudar
          </Button>
        ) : (
          <Button variant="default" leftSection={<IconPlayerPause size={18} />} onClick={onPause}>
            Pausar
          </Button>
        )}
        <ActionIcon size="xl" variant="default" aria-label="Siguiente ejercicio" onClick={onNext}>
          <IconPlayerSkipForward />
        </ActionIcon>
      </Group>

      {confirmingFinish ? (
        <Group>
          <Text size="sm">¿Terminar el calentamiento?</Text>
          <Button color="red" size="xs" onClick={onFinish}>
            Sí, terminar
          </Button>
          <Button variant="default" size="xs" onClick={() => setConfirmingFinish(false)}>
            Seguir
          </Button>
        </Group>
      ) : (
        <Button variant="subtle" color="red" size="xs" onClick={() => setConfirmingFinish(true)}>
          Terminar
        </Button>
      )}
    </Stack>
  );
};

import { Button, Group, Stack, Text, Title } from '@mantine/core';
import { IconRepeat } from '@tabler/icons-react';
import { formatDuration } from '../../utils/warmupFormat';

export interface WarmupFinishedProps {
  totalSec: number;
  onRepeat: () => void;
  onBack: () => void;
}

export const WarmupFinished = ({ totalSec, onRepeat, onBack }: WarmupFinishedProps) => (
  <Stack gap="md" align="center" py="xl">
    <Title order={2}>¡Calentamiento terminado!</Title>
    <Text c="dimmed">Rutina de {formatDuration(totalSec)}</Text>
    <Group>
      <Button leftSection={<IconRepeat size={18} />} onClick={onRepeat}>
        Repetir
      </Button>
      <Button variant="default" onClick={onBack}>
        Volver a mi rutina
      </Button>
    </Group>
  </Stack>
);

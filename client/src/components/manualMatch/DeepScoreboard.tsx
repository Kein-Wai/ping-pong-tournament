import { ActionIcon, Badge, Button, Group, Paper, ScrollArea, Stack, Text } from '@mantine/core';
import { IconArrowBackUp, IconEdit } from '@tabler/icons-react';

interface DeepScoreboardProps {
  opponentName: string;
  currentSet: number;
  mySets: number | string;
  oppSets: number | string;
  /** Marcador del set en curso. */
  myScore: number;
  oppScore: number;
  onSelectSet: (setNumber: number) => void;
  onUndo: () => void;
  onEditRival: () => void;
}

/** Marcador del análisis profundo: selector de sets, sets ganados, deshacer y puntos del set en curso. */
export const DeepScoreboard = ({
  opponentName,
  currentSet,
  mySets,
  oppSets,
  myScore,
  oppScore,
  onSelectSet,
  onUndo,
  onEditRival,
}: DeepScoreboardProps) => (
  <Paper withBorder p="md" radius="md" bg="dark.7">
    <Group justify="space-between" mb="xs">
      <ScrollArea w={{ base: 200, sm: 300 }} type="never">
        <Group gap="xs" wrap="nowrap" pb={4}>
          {Array.from({ length: currentSet }, (_, i) => i + 1).map((setNum) => (
            <Button
              key={setNum}
              size="xs"
              variant={setNum === currentSet ? 'filled' : 'light'}
              color="blue"
              onClick={() => setNum !== currentSet && onSelectSet(setNum)}
              style={{ flexShrink: 0 }}
            >
              Set {setNum}
            </Button>
          ))}
        </Group>
      </ScrollArea>
      <Group gap="xs">
        <Badge color="gray" variant="outline">
          {mySets} Sets a {oppSets}
        </Badge>
        <ActionIcon color="red" variant="light" size="lg" onClick={onUndo}>
          <IconArrowBackUp size={20} />
        </ActionIcon>
      </Group>
    </Group>

    <Group justify="center" gap={50} my="sm">
      <Stack align="center" gap={0}>
        <Text c="dimmed" size="md" fw={600}>
          TÚ
        </Text>
        <Text fz={80} fw={900} c="green.4" style={{ lineHeight: 1 }}>
          {myScore}
        </Text>
      </Stack>
      <Text fz={50} fw={900} c="dimmed">
        -
      </Text>
      <Stack align="center" gap={0}>
        <Group gap={4} style={{ cursor: 'pointer' }} onClick={onEditRival}>
          <Text c="dimmed" size="md" fw={600}>
            {opponentName.substring(0, 10).toUpperCase()}
          </Text>
          <IconEdit size={16} color="var(--mantine-color-dimmed)" />
        </Group>
        <Text fz={80} fw={900} c="red.4" style={{ lineHeight: 1 }}>
          {oppScore}
        </Text>
      </Stack>
    </Group>
  </Paper>
);

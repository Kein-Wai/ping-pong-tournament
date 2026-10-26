import { Badge, Group, Paper, ScrollArea, Stack, Text } from '@mantine/core';

import type { TrackedPoint } from '../../types/manualMatch';

interface SetHistoryProps {
  currentSet: number;
  /** Puntos del set en curso, en orden de juego. */
  points: TrackedPoint[];
}

/** Historial del set en curso, con el último punto arriba. */
export const SetHistory = ({ currentSet, points }: SetHistoryProps) => (
  <Paper withBorder p="sm" radius="md">
    <Text fw={700} mb="sm">
      Historial del Set {currentSet}
    </Text>
    <ScrollArea h={250} offsetScrollbars>
      <Stack gap="xs">
        {points
          .slice()
          .reverse()
          .map((p, idx) => (
            <Group
              key={idx}
              justify="space-between"
              p="xs"
              bg={p.isWon ? 'green.9' : 'red.9'}
              c="white"
              style={{ borderRadius: 8 }}
            >
              <Group gap="sm">
                <Text size="sm" fw={700}>
                  #{p.pointOrder}
                </Text>
                <Badge size="xs" color="gray" variant="white">
                  {p.category || 'Rapido'}
                </Badge>
              </Group>
              <Text size="sm">
                {p.subcategory || ''} {p.placement ? `(${p.placement})` : ''}
              </Text>
            </Group>
          ))}
        {points.length === 0 && (
          <Text c="dimmed" size="sm" ta="center">
            El set acaba de empezar.
          </Text>
        )}
      </Stack>
    </ScrollArea>
  </Paper>
);

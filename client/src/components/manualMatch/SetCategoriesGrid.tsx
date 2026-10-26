import { Group, Paper, ScrollArea, SimpleGrid, Stack, Text } from '@mantine/core';

import type { SetSummary } from '../../types/manualMatch';
import { getSortedCategories } from '../../utils/manual-match';

interface CategoryColumnProps {
  title: string;
  categories: Record<string, number>;
  bg: string;
  c: string;
}

const CategoryColumn = ({ title, categories, bg, c }: CategoryColumnProps) => {
  const sorted = getSortedCategories(categories);

  return (
    <Paper p="sm" bg={bg} c={c} radius="md">
      <Text fw={700} mb="xs" ta="center">
        {title}
      </Text>
      <ScrollArea h={160} offsetScrollbars>
        <Stack gap={6}>
          {sorted.length === 0 ? (
            <Text size="xs" ta="center" c="dimmed">
              Ninguno
            </Text>
          ) : (
            sorted.map(([label, count]) => (
              <Group key={label} justify="space-between" wrap="nowrap" align="flex-start">
                <Text size="xs" fw={600} lh={1.2} style={{ flex: 1 }}>
                  {label}
                </Text>
                <Text size="sm" fw={900}>
                  {count}
                </Text>
              </Group>
            ))
          )}
        </Stack>
      </ScrollArea>
    </Paper>
  );
};

interface SetCategoriesGridProps {
  summary: SetSummary;
  wonTitle: string;
  lostTitle: string;
  mt?: string;
}

/** Dos columnas con los puntos de un set agrupados por rótulo: los que gané y los que perdí. */
export const SetCategoriesGrid = ({ summary, wonTitle, lostTitle, mt }: SetCategoriesGridProps) => (
  <SimpleGrid cols={2} w="100%" mt={mt}>
    <CategoryColumn title={wonTitle} categories={summary.wonCategories} bg="green.0" c="green.9" />
    <CategoryColumn title={lostTitle} categories={summary.lostCategories} bg="red.0" c="red.9" />
  </SimpleGrid>
);

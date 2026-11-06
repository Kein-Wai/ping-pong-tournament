import { Group, Paper, ScrollArea, SimpleGrid, Stack, Text } from '@mantine/core';

import type { SetSummary } from '../../types/manualMatch';
import { getSortedCategories, toPercent } from '../../utils/manual-match';

interface CategoryColumnProps {
  title: string;
  /** Qué mide el primer porcentaje: «ganados» o «perdidos». */
  legend: string;
  categories: Record<string, number>;
  /** Puntos de esta columna: base del primer porcentaje. */
  columnTotal: number;
  /** Puntos de ambas columnas: base del segundo porcentaje. */
  grandTotal: number;
  bg: string;
  c: string;
}

const CategoryColumn = ({
  title,
  legend,
  categories,
  columnTotal,
  grandTotal,
  bg,
  c,
}: CategoryColumnProps) => {
  const sorted = getSortedCategories(categories);

  return (
    <Paper p="sm" bg={bg} c={c} radius="md">
      <Text fw={700} ta="center">
        {title}
      </Text>
      <Text size="xs" ta="center" mb="xs" style={{ opacity: 0.7 }}>
        % de {legend} · % del total
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
                <Text size="sm" fw={900} style={{ whiteSpace: 'nowrap' }}>
                  {toPercent(count, columnTotal)}% · {toPercent(count, grandTotal)}%
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

/**
 * Dos columnas con los puntos agrupados por rótulo: los que gané y los que perdí. Cada rótulo
 * lleva su porcentaje dentro de la columna y dentro de todos los puntos.
 */
export const SetCategoriesGrid = ({ summary, wonTitle, lostTitle, mt }: SetCategoriesGridProps) => {
  const grandTotal = summary.myScore + summary.oppScore;

  return (
    <SimpleGrid cols={2} w="100%" mt={mt}>
      <CategoryColumn
        title={wonTitle}
        legend="ganados"
        categories={summary.wonCategories}
        columnTotal={summary.myScore}
        grandTotal={grandTotal}
        bg="green.0"
        c="green.9"
      />
      <CategoryColumn
        title={lostTitle}
        legend="perdidos"
        categories={summary.lostCategories}
        columnTotal={summary.oppScore}
        grandTotal={grandTotal}
        bg="red.0"
        c="red.9"
      />
    </SimpleGrid>
  );
};

import { Button, Paper, SimpleGrid, Stack, Title } from '@mantine/core';

import type { PointNode } from '../../constants/manualMatch';

interface PointSelectorProps {
  /** Quién ganó el punto en curso; `null` si todavía no se ha empezado uno. */
  isWon: boolean | null;
  /** Opciones del nivel actual del árbol de categorías. */
  nodes: PointNode[] | null;
  onStartPoint: (isWon: boolean) => void;
  onNodeClick: (node: PointNode) => void;
  onCancel: () => void;
}

/** Entrada de un punto: primero quién lo ganó y después las categorías que lo describen. */
export const PointSelector = ({
  isWon,
  nodes,
  onStartPoint,
  onNodeClick,
  onCancel,
}: PointSelectorProps) => (
  <Paper withBorder p="md" radius="md">
    {isWon === null ? (
      <SimpleGrid cols={2}>
        <Button h={140} color="green" radius="md" fz={24} onClick={() => onStartPoint(true)}>
          PUNTO MÍO
        </Button>
        <Button h={140} color="red" radius="md" fz={24} onClick={() => onStartPoint(false)}>
          PUNTO RIVAL
        </Button>
      </SimpleGrid>
    ) : (
      <Stack>
        <Title order={3} ta="center" c={isWon ? 'green' : 'red'}>
          Selecciona Categoría
        </Title>
        <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="sm">
          {nodes?.map((node, i) => (
            <Button
              key={i}
              h={70}
              variant="outline"
              color={isWon ? 'green' : 'red'}
              onClick={() => onNodeClick(node)}
            >
              {node.label}
            </Button>
          ))}
        </SimpleGrid>
        <Button variant="subtle" color="gray" mt="sm" onClick={onCancel}>
          Cancelar (Volver a Punto Mío/Rival)
        </Button>
      </Stack>
    )}
  </Paper>
);

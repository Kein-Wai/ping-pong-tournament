import { Card, Center, Group, Paper, SimpleGrid, Text, ThemeIcon, Title } from '@mantine/core';
import { IconClipboardList, IconTrendingDown, IconTrendingUp } from '@tabler/icons-react';
import type { PlayerTraining } from '../../types/api';

/**
 * Último análisis técnico de un jugador: fortalezas y puntos a mejorar de su plan
 * de entrenamiento más reciente.
 *
 * Migration: extracción de la tarjeta de análisis técnico de JugadorPerfil.
 */
export interface TechnicalAnalysisCardProps {
  latestPlan: PlayerTraining | null;
}

export const TechnicalAnalysisCard = ({ latestPlan }: TechnicalAnalysisCardProps) => (
    <Card withBorder radius="md" shadow="sm" p="lg" style={{ gridColumn: '1 / -1' }}>
      <Group gap="xs" mb="md">
        <ThemeIcon color="orange" variant="light">
          <IconClipboardList size={18} />
        </ThemeIcon>
        <Title order={4}>Último Análisis Técnico</Title>
      </Group>

      {latestPlan ? (
        <SimpleGrid cols={{ base: 1, md: 2 }} spacing="md">
          <Paper
            withBorder
            p="sm"
            bg="var(--mantine-color-gray-0)"
            style={{ darkHidden: true }}
          >
            <Group gap="xs" mb={4}>
              <IconTrendingUp size={16} color="var(--mantine-color-green-6)" />
              <Text fw={600} size="sm">
                Fortalezas
              </Text>
            </Group>
            <Text size="sm" c="dimmed">
              {latestPlan.strengths}
            </Text>
          </Paper>

          <Paper
            withBorder
            p="sm"
            bg="var(--mantine-color-gray-0)"
            style={{ darkHidden: true }}
          >
            <Group gap="xs" mb={4}>
              <IconTrendingDown size={16} color="var(--mantine-color-red-6)" />
              <Text fw={600} size="sm">
                A Mejorar
              </Text>
            </Group>
            <Text size="sm" c="dimmed">
              {latestPlan.weaknesses}
            </Text>
          </Paper>
        </SimpleGrid>
      ) : (
        <Center
          h={100}
          bg="var(--mantine-color-gray-0)"
          style={{ borderRadius: 8, darkHidden: true }}
        >
          <Text c="dimmed" size="sm" ta="center">
            El entrenador aún no ha creado un macrociclo para ti.
          </Text>
        </Center>
      )}
    </Card>
);

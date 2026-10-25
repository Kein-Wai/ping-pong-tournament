import { Box, Card, Center, Group, Stack, Text, ThemeIcon, Title } from '@mantine/core';
import { IconChartBar } from '@tabler/icons-react';
import { BarChart } from '@mantine/charts';
import type { EfficiencyRow } from '../../utils/player-profile';

/**
 * Tarjeta «Balance General (Win Rate %)» del perfil de un jugador: porcentajes de
 * victorias y derrotas en partidos, sets, puntos y torneos.
 *
 * Migration: extracción de la tarjeta de JugadorPerfil.
 */
export interface BalanceCardProps {
  hasMatches: boolean;
  efficiencyData: EfficiencyRow[];
}

export const BalanceCard = ({ hasMatches, efficiencyData }: BalanceCardProps) => (
  <Card withBorder radius="md" shadow="sm" p="lg">
    <Group gap="xs" mb="lg">
      <ThemeIcon color="blue" variant="light">
        <IconChartBar size={18} />
      </ThemeIcon>
      <Title order={4}>Balance General (Win Rate %)</Title>
    </Group>
    {hasMatches ? (
      <Box mt="md">
        <BarChart
          h={250}
          data={efficiencyData}
          dataKey="metric"
          type="stacked"
          orientation="vertical"
          series={[
            { name: 'Victorias', color: 'green.5' },
            { name: 'Derrotas', color: 'red.5' },
          ]}
        />
      </Box>
    ) : (
      <Center
        h={200}
        bg="var(--mantine-color-gray-0)"
        style={{ borderRadius: 8, darkHidden: true }}
      >
        <Stack align="center" gap="xs">
          <IconChartBar size={40} color="var(--mantine-color-gray-4)" />
          <Text c="dimmed" size="sm" ta="center">
            Juega tu primer partido para
            <br />
            desbloquear tus estadísticas.
          </Text>
        </Stack>
      </Center>
    )}
  </Card>
);

import { Box, Card, Center, Group, Stack, Text, ThemeIcon, Title } from '@mantine/core';
import { IconPingPong } from '@tabler/icons-react';
import { BarChart } from '@mantine/charts';
import type { RivalChartRow } from '../../utils/player-profile';

/**
 * Tarjeta «Desempeño vs Rivales» del perfil de un jugador: victorias y derrotas
 * según la mano dominante y el estilo de juego del rival.
 *
 * Migration: extracción de la tarjeta de JugadorPerfil.
 */
export interface RivalsCardProps {
  hasMatches: boolean;
  mano: RivalChartRow[];
  estilo: RivalChartRow[];
}

export const RivalsCard = ({ hasMatches, mano, estilo }: RivalsCardProps) => (
  <Card withBorder radius="md" shadow="sm" p="lg">
    <Group gap="xs" mb="lg">
      <ThemeIcon color="orange" variant="light">
        <IconPingPong size={18} />
      </ThemeIcon>
      <Title order={4}>Desempeño vs Rivales</Title>
    </Group>
    {hasMatches ? (
      <Stack gap="xl">
        <Box>
          <Text size="sm" c="dimmed" fw={600} mb="xs">
            Según Mano Dominante
          </Text>
          <BarChart
            h={120}
            data={mano}
            dataKey="Rasgo"
            type="stacked"
            orientation="vertical"
            series={[
              { name: 'Victorias', color: 'green.5' },
              { name: 'Derrotas', color: 'red.5' },
            ]}
          />
        </Box>
        <Box>
          <Text size="sm" c="dimmed" fw={600} mb="xs">
            Según Estilo de Juego
          </Text>
          <BarChart
            h={120}
            data={estilo}
            dataKey="Rasgo"
            type="stacked"
            orientation="vertical"
            series={[
              { name: 'Victorias', color: 'green.5' },
              { name: 'Derrotas', color: 'red.5' },
            ]}
          />
        </Box>
      </Stack>
    ) : (
      <Center
        h={200}
        bg="var(--mantine-color-gray-0)"
        style={{ borderRadius: 8, darkHidden: true }}
      >
        <Text c="dimmed" size="sm" ta="center">
          Sin datos de enfrentamientos.
        </Text>
      </Center>
    )}
  </Card>
);

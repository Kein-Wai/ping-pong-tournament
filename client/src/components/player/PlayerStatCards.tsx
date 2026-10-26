import { Group, Paper, SimpleGrid, Text, ThemeIcon } from '@mantine/core';
import {
  IconCalendarEvent,
  IconChartBar,
  IconMathSymbols,
  IconPingPong,
  IconTrendingUp,
  IconTrophy,
} from '@tabler/icons-react';
import { formatDateTime } from '../../utils/dates';
import type { PlayerStatsSummary } from '../../utils/player-profile';

/**
 * Tarjetas resumen del perfil de un jugador: partidos, torneos, sets, puntos y
 * asistencias a entrenamientos.
 *
 * Migration: extracción del bloque de tarjetas de JugadorPerfil.
 */
export interface PlayerStatCardsProps {
  stats: PlayerStatsSummary | undefined;
  matchWinRate: number;
  totalTournaments: number;
  totalAsistencias: number;
  asistenciasMes: number;
}

export const PlayerStatCards = ({
  stats: s,
  matchWinRate,
  totalTournaments,
  totalAsistencias,
  asistenciasMes,
}: PlayerStatCardsProps) => (
  <SimpleGrid cols={{ base: 1, sm: 2, md: 4 }} spacing="lg" mt="md">
    <Paper withBorder p="md" radius="md" shadow="sm">
      <Group justify="space-between">
        <Text size="xs" c="dimmed" fw={700} tt="uppercase">
          Partidos
        </Text>
        <ThemeIcon color="blue" variant="light" size={38} radius="md">
          <IconPingPong size={24} />
        </ThemeIcon>
      </Group>
      <Group align="flex-end" gap="xs" mt={25}>
        <Text size="xl" fw={700}>
          {s?.matchWon || 0}V - {s?.matchLost || 0}D
        </Text>
      </Group>
      <Text size="sm" c="dimmed" mt={7}>
        {matchWinRate}% de Victorias
      </Text>
    </Paper>

    <Paper withBorder p="md" radius="md" shadow="sm">
      <Group justify="space-between">
        <Text size="xs" c="dimmed" fw={700} tt="uppercase">
          Torneos Jugados
        </Text>
        <ThemeIcon color="yellow" variant="light" size={38} radius="md">
          <IconTrophy size={24} />
        </ThemeIcon>
      </Group>
      <Group align="flex-end" gap="xs" mt={25}>
        <Text size="xl" fw={700}>
          {totalTournaments}
        </Text>
      </Group>
      <Text size="sm" c="dimmed" mt={7}>
        <Text component="span" c="green" fw={500}>
          {s?.tournamentWon || 0} Ganados
        </Text>
      </Text>
    </Paper>

    <Paper withBorder p="md" radius="md" shadow="sm">
      <Group justify="space-between">
        <Text size="xs" c="dimmed" fw={700} tt="uppercase">
          Balance de Sets
        </Text>
        <ThemeIcon color="grape" variant="light" size={38} radius="md">
          <IconChartBar size={24} />
        </ThemeIcon>
      </Group>
      <Group align="flex-end" gap="xs" mt={25}>
        <Text size="xl" fw={700}>
          {s?.setWon || 0} - {s?.setLost || 0}
        </Text>
      </Group>
      <Text size="sm" c="dimmed" mt={7}>
        Diferencia: {(s?.setWon || 0) - (s?.setLost || 0)}
      </Text>
    </Paper>

    <Paper withBorder p="md" radius="md" shadow="sm">
      <Group justify="space-between">
        <Text size="xs" c="dimmed" fw={700} tt="uppercase">
          Puntos Totales
        </Text>
        <ThemeIcon color="teal" variant="light" size={38} radius="md">
          <IconMathSymbols size={24} />
        </ThemeIcon>
      </Group>
      <Group align="flex-end" gap="xs" mt={25}>
        <Text size="xl" fw={700}>
          <Text component="span" c="green">
            {s?.pointWon || 0}
          </Text>{' '}
          /{' '}
          <Text component="span" c="red">
            {s?.pointLost || 0}
          </Text>
        </Text>
      </Group>
      <Text size="sm" c="dimmed" mt={7}>
        Ratio: {s?.pointLost ? ((s.pointWon || 0) / s.pointLost).toFixed(2) : 0}
      </Text>
    </Paper>
    <Paper withBorder p="md" radius="md" shadow="sm">
      <Group justify="space-between">
        <Text size="xs" c="dimmed" fw={700} tt="uppercase">
          Asistencias Totales
        </Text>
        <ThemeIcon color="cyan" variant="light" size={38} radius="md">
          <IconCalendarEvent size={24} />
        </ThemeIcon>
      </Group>
      <Group align="flex-end" gap="xs" mt={25}>
        <Text size="xl" fw={700}>
          {totalAsistencias}
        </Text>
      </Group>
      <Text size="sm" c="dimmed" mt={7}>
        Clases grupales atendidas
      </Text>
    </Paper>

    <Paper withBorder p="md" radius="md" shadow="sm">
      <Group justify="space-between">
        <Text size="xs" c="dimmed" fw={700} tt="uppercase">
          Asistencias este Mes
        </Text>
        <ThemeIcon color="green" variant="light" size={38} radius="md">
          <IconTrendingUp size={24} />
        </ThemeIcon>
      </Group>
      <Group align="flex-end" gap="xs" mt={25}>
        <Text size="xl" fw={700}>
          {asistenciasMes}
        </Text>
      </Group>
      <Text size="sm" c="dimmed" mt={7}>
        En {formatDateTime(new Date(), { month: 'long' })}
      </Text>
    </Paper>
  </SimpleGrid>
);

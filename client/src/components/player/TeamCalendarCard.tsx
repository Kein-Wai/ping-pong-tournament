import { useState } from 'react';
import { Badge, Card, Center, Group, Pagination, Paper, Stack, Text, Title } from '@mantine/core';
import { IconCalendarEvent, IconMapPin } from '@tabler/icons-react';
import { formatDateTime } from '../../utils/dates';
import { getTeamMatchOutcome } from '../../utils/team-matches';
import type { TeamCalendarMatch } from '../../utils/player-profile';

const TEAM_MATCHES_PER_PAGE = 4;

/**
 * Calendario de equipos del perfil de un jugador: el siguiente compromiso destacado
 * y, debajo y paginado de cuatro en cuatro, el historial y el resto del calendario.
 *
 * Migration: extracción de la sección «Calendario de Equipos» de JugadorPerfil; la
 * página de la paginación pasa a vivir aquí.
 */
export interface TeamCalendarCardProps {
  nextMatch: TeamCalendarMatch | null;
  otherMatches: TeamCalendarMatch[];
}

export const TeamCalendarCard = ({ nextMatch, otherMatches: otherTeamMatches }: TeamCalendarCardProps) => {
  const [teamMatchPage, setTeamMatchPage] = useState(1);

  const totalTeamMatchPages = Math.ceil(otherTeamMatches.length / TEAM_MATCHES_PER_PAGE);
  const paginatedTeamMatches = otherTeamMatches.slice(
    (teamMatchPage - 1) * TEAM_MATCHES_PER_PAGE,
    teamMatchPage * TEAM_MATCHES_PER_PAGE,
  );

  return (
  <Card shadow="sm" padding="lg" radius="md" withBorder mt="md">
    <Group gap="sm" mb="md">
      <IconCalendarEvent size={20} color="var(--mantine-color-blue-6)" />
      <Title order={4}>Calendario de Equipos</Title>
    </Group>

    <Stack gap="md">
      {nextMatch && (
        <Card
          withBorder
          shadow="md"
          radius="md"
          p="md"
          bg="blue.0"
          style={{ borderColor: 'var(--mantine-color-blue-5)', borderWidth: 2 }}
        >
          <Text size="xs" fw={800} c="blue.7" tt="uppercase" mb="xs">
            🔥 Siguiente Compromiso
          </Text>
          <Group justify="space-between" align="center" wrap="nowrap">
            <Stack gap={4}>
              <Text fw={800} size="lg" c="blue.9">
                {nextMatch.isHome ? nextMatch.teamName : nextMatch.rivalName}
                <Text span c="blue.5" mx="sm">
                  vs
                </Text>
                {nextMatch.isHome ? nextMatch.rivalName : nextMatch.teamName}
              </Text>
              <Group gap="sm">
                <Text size="sm" c="blue.8" fw={600}>
                  {formatDateTime(nextMatch.date, {
                    dateStyle: 'full',
                    timeStyle: 'short',
                  })}
                </Text>
                {nextMatch.location && (
                  <Text size="sm" c="blue.8">
                    <IconMapPin
                      size={14}
                      style={{ verticalAlign: 'middle', marginRight: 4 }}
                    />
                    {nextMatch.location}
                  </Text>
                )}
              </Group>
            </Stack>
            <Badge color="blue" variant="filled" size="lg">
              {nextMatch.status}
            </Badge>
          </Group>
        </Card>
      )}

      {otherTeamMatches.length > 0 && (
        <Stack gap="sm">
          <Text size="sm" fw={700} c="dimmed" mt="sm">
            Historial y Resto del Calendario
          </Text>
          {paginatedTeamMatches.map((m) => {
            const { hasScore, statusColor } = getTeamMatchOutcome(m);

            return (
              <Paper
                key={m.id}
                withBorder
                radius="md"
                p="sm"
                bg="var(--mantine-color-gray-0)"
                style={{ darkHidden: true }}
              >
                <Group justify="space-between" align="center" wrap="nowrap">
                  <Stack gap={4}>
                    <Text fw={600} size="sm">
                      {m.isHome ? m.teamName : m.rivalName}
                      <Text span c="dimmed" mx="xs">
                        vs
                      </Text>
                      {m.isHome ? m.rivalName : m.teamName}
                    </Text>
                    <Group gap="xs">
                      <Text size="xs" c="dimmed" fw={600}>
                        {formatDateTime(m.date)}
                      </Text>
                    </Group>
                  </Stack>

                  <Group gap="xs">
                    {m.status === 'Completado' && hasScore && (
                        <Badge size="md" variant="outline" color={statusColor}>
                          {m.isHome
                            ? `${m.ourScore} - ${m.rivalScore}`
                            : `${m.rivalScore} - ${m.ourScore}`}
                        </Badge>
                      )}
                    <Badge color={statusColor} variant="light" size="sm">
                      {m.status}
                    </Badge>
                  </Group>
                </Group>
              </Paper>
            );
          })}
        </Stack>
      )}

      {totalTeamMatchPages > 1 && (
        <Center mt="sm">
          <Pagination
            total={totalTeamMatchPages}
            value={teamMatchPage}
            onChange={setTeamMatchPage}
            color="blue"
            size="sm"
            withEdges
          />
        </Center>
      )}
    </Stack>
  </Card>
  );
};

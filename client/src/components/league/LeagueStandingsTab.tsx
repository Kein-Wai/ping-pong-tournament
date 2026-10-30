import { Badge, Group, Stack, Table, Text } from '@mantine/core';
import { playerFullName } from '../../utils/leagueView';
import type { LeagueParticipant, LeagueStandings } from '../../types/league';

interface LeagueStandingsTabProps {
  standings: LeagueStandings | null;
  participants: LeagueParticipant[];
}

/** Diferencia con signo: +3, -2 o 0. */
const signed = (value: number): string => (value > 0 ? `+${value}` : String(value));

export const LeagueStandingsTab = ({ standings, participants }: LeagueStandingsTabProps) => {
  if (!standings || standings.standings.length === 0) {
    return (
      <Text c="dimmed" ta="center" py="xl">
        Todavía no hay clasificación.
      </Text>
    );
  }

  const playersById = new Map(participants.map((p) => [p.playerId, p.player]));

  return (
    <Stack gap="md">
      {standings.final && (
        <Group>
          <Badge color="green" variant="light">
            Clasificación final
          </Badge>
        </Group>
      )}
      <Table.ScrollContainer minWidth={520}>
        <Table verticalSpacing="sm" highlightOnHover>
          <Table.Thead>
            <Table.Tr>
              <Table.Th>#</Table.Th>
              <Table.Th>Jugador</Table.Th>
              <Table.Th ta="center">PJ</Table.Th>
              <Table.Th ta="center">G</Table.Th>
              <Table.Th ta="center">P</Table.Th>
              <Table.Th ta="center">Dif. sets</Table.Th>
              <Table.Th ta="center">Dif. puntos</Table.Th>
              <Table.Th ta="center">Pts</Table.Th>
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>
            {standings.standings.map((row) => (
              <Table.Tr key={row.playerId}>
                <Table.Td>{row.position}</Table.Td>
                <Table.Td>{playerFullName(playersById.get(row.playerId))}</Table.Td>
                <Table.Td ta="center">{row.played}</Table.Td>
                <Table.Td ta="center">{row.gamesWon}</Table.Td>
                <Table.Td ta="center">{row.gamesLost}</Table.Td>
                <Table.Td ta="center">{signed(row.setsWon - row.setsLost)}</Table.Td>
                <Table.Td ta="center">{signed(row.pointsWon - row.pointsLost)}</Table.Td>
                <Table.Td ta="center" fw={700}>
                  {row.pointsClas}
                </Table.Td>
              </Table.Tr>
            ))}
          </Table.Tbody>
        </Table>
      </Table.ScrollContainer>
    </Stack>
  );
};

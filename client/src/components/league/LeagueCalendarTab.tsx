import { Badge, Button, Stack, Table, Text, Title } from '@mantine/core';
import { groupMatchesByRound, matchSetsSummary, playerFullName } from '../../utils/leagueView';
import type { MatchStatus } from '../../types/enums';
import type { LeagueMatch } from '../../types/league';

interface LeagueCalendarTabProps {
  matches: LeagueMatch[];
  leagueStatus: MatchStatus | null;
  isAdmin: boolean;
  onEditMatch: (match: LeagueMatch) => void;
}

export const LeagueCalendarTab = ({
  matches,
  leagueStatus,
  isAdmin,
  onEditMatch,
}: LeagueCalendarTabProps) => {
  if (matches.length === 0) {
    return (
      <Text c="dimmed" ta="center" py="xl">
        El calendario se generará al iniciar la liga.
      </Text>
    );
  }

  const canEdit = isAdmin && leagueStatus === 'Iniciado';

  return (
    <Stack gap="lg">
      {groupMatchesByRound(matches).map(({ round, matches: roundMatches }) => (
        <Stack key={round} gap="xs">
          <Title order={5}>Jornada {round}</Title>
          <Table.ScrollContainer minWidth={420}>
            <Table verticalSpacing="sm">
              <Table.Tbody>
                {roundMatches.map((match) => (
                  <Table.Tr key={match.id}>
                    <Table.Td>
                      <Text span>{playerFullName(match.playerOne)}</Text>
                      <Text span c="dimmed">
                        {' '}
                        vs{' '}
                      </Text>
                      <Text span>{playerFullName(match.playerTwo)}</Text>
                    </Table.Td>
                    <Table.Td>
                      {match.walkover ? (
                        <Badge color="gray" variant="light">
                          {matchSetsSummary(match)}
                        </Badge>
                      ) : (
                        <Text fw={600}>{matchSetsSummary(match)}</Text>
                      )}
                    </Table.Td>
                    {canEdit && (
                      <Table.Td>
                        {!match.walkover && match.status !== 'Cancelado' && (
                          <Button size="xs" variant="light" onClick={() => onEditMatch(match)}>
                            Resultado
                          </Button>
                        )}
                      </Table.Td>
                    )}
                  </Table.Tr>
                ))}
              </Table.Tbody>
            </Table>
          </Table.ScrollContainer>
        </Stack>
      ))}
    </Stack>
  );
};

import {
  Card,
  Group,
  Text,
  Badge,
  Stack,
  Center,

  Button,
} from '@mantine/core';
import { IconEdit } from '@tabler/icons-react';
import type { CSSProperties } from 'react';
import type { GroupMatch } from '../../types/tournament';
import { formatSets } from '../../utils/match-format';

interface GroupMatchesTableProps {
  matches: GroupMatch[] | null;
  selectedGroup: string | null;
  groupOptions: Array<{ value: string; label: string }>;
  onGroupChange: (group: string | null) => void;
  isAdmin: boolean;

  tournamentStatus: string | null | undefined;
  onEditMatch: (match: GroupMatch, isKnockout: boolean) => void;
}

export const GroupMatchesTable = ({
  matches,
  selectedGroup,
  groupOptions,
  onGroupChange,
  isAdmin,

  tournamentStatus,
  onEditMatch,
}: GroupMatchesTableProps) => {
  if (!matches) {
    return (
      <Center py="xl">
        <span className="mantine-Loader-root" style={{ '--loader-color': 'var(--mantine-color-blue-filled)' } as CSSProperties} />
      </Center>
    );
  }

  const filteredMatches = selectedGroup
    ? matches.filter((m) => m.group?.group === Number(selectedGroup))
    : matches;

  if (filteredMatches.length === 0) {
    return (
      <Center py="xl">
        <Text c="dimmed">
          {selectedGroup ? `No hay partidos en el Grupo ${selectedGroup}.` : 'No hay partidos en esta fase.'}
        </Text>
      </Center>
    );
  }

  return (
    <Stack>
      <Group gap="md" mb="md">
        <Text fw={500}>Filtrar grupo:</Text>
        <select
          value={selectedGroup || ''}
          onChange={(e) => onGroupChange(e.target.value || null)}
          style={{ padding: '0.25rem 0.5rem', borderRadius: '0.25rem', border: '1px solid var(--mantine-color-gray-3)', background: 'white', fontSize: '0.875rem' }}
        >
          <option value="">Todos los grupos</option>
          {groupOptions.map((g) => (
            <option key={g.value} value={g.value}>{g.label}</option>
          ))}
        </select>
      </Group>

      <Stack gap="sm">
        {filteredMatches.map((match) => (
          <Card key={match.id} withBorder shadow="sm" radius="md" p="md">
            <Group justify="space-between" align="center" wrap="nowrap">
              <Stack gap={4}>
                <Text fw={500} size="sm">
                  {match.playerOne?.name || 'TBD'} {match.playerOne?.surname || ''}{' '}
                  <Text span c="dimmed" mx={5}>
                    vs
                  </Text>{' '}
                  {match.playerTwo?.name || 'TBD'} {match.playerTwo?.surname || ''}
                </Text>
                {formatSets(match)}
              </Stack>
              <Group justify="space-between" align="center" wrap="nowrap">
                <Badge
                  color={
                    match.status === 'Completado'
                      ? 'green'
                      : match.status === 'Programado'
                        ? 'red'
                        : 'yellow'
                  }
                  variant="dot"
                >
                  {match.status}
                </Badge>

                {isAdmin && (
                  <Button
                    variant="light"
                    size="xs"
                    leftSection={<IconEdit size={14} />}
                    onClick={() => onEditMatch(match, false)}
                    disabled={tournamentStatus !== 'Grupos'}
                  >
                    Actualizar
                  </Button>
                )}
              </Group>
            </Group>
          </Card>
        ))}
      </Stack>
    </Stack>
  );
};

export default GroupMatchesTable;

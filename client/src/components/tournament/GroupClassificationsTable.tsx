import { useMemo } from 'react';

import {
  Select,
  Title,
  Text,
  Group,
  Button,
  Center,
  Loader,
  Badge,
  Stack,
  Card,
  Table,
  ScrollArea,
} from '@mantine/core';
import { IconEdit } from '@tabler/icons-react';
import type { TournamentGroupClas, GroupMatch, BracketMatch } from '../../types/tournament';

/** Renderiza los sets de un partido o un badge de estado. */
const formatSets = (match: GroupMatch | BracketMatch) => {
  if (match.status !== 'Completado')
    return (
      <Badge color="gray" variant="light">
        {match.status}
      </Badge>
    );

  const sets = [];
  if (match.setOnePlayerOne !== null || match.setOnePlayerTwo !== null)
    sets.push(`${match.setOnePlayerOne}-${match.setOnePlayerTwo}`);
  if (match.setTwoPlayerOne !== null || match.setTwoPlayerTwo !== null)
    sets.push(`${match.setTwoPlayerOne}-${match.setTwoPlayerTwo}`);
  if (match.setThreePlayerOne !== null || match.setThreePlayerTwo !== null)
    sets.push(`${match.setThreePlayerOne}-${match.setThreePlayerTwo}`);
  if (match.setFourPlayerOne !== null || match.setFourPlayerTwo !== null)
    sets.push(`${match.setFourPlayerOne}-${match.setFourPlayerTwo}`);
  if (match.setFivePlayerOne !== null || match.setFivePlayerTwo !== null)
    sets.push(`${match.setFivePlayerOne}-${match.setFivePlayerTwo}`);

  return (
    <Text fw={600} size="sm" c="blue.7">
      {sets.filter((s) => s !== '0-0').join(' | ')}
    </Text>
  );
};

interface GroupClassificationsTableProps {
  groupsClas: TournamentGroupClas[] | null;
  groupMatches: GroupMatch[] | null;
  selectedGroup: string | null;
  groupOptions: Array<{ value: string; label: string }>;
  onGroupChange: (group: string | null) => void;
  playersKnockout: number | null;
  isAdmin: boolean;
  tournamentStatus: string | null | undefined;
  onEditMatch: (match: GroupMatch, isKnockout: boolean) => void;
}

/** Clasificación de grupo con la posición visual calculada. */
interface GroupClasWithVisual extends TournamentGroupClas {
  visualPosition: number;
}

export const GroupClassificationsTable = ({
  groupsClas,
  groupMatches,
  selectedGroup,
  groupOptions,
  onGroupChange,
  playersKnockout,
  isAdmin,
  tournamentStatus,
  onEditMatch,
}: GroupClassificationsTableProps) => {
  const currentGroupClas = useMemo(() => {
    if (!groupsClas || !selectedGroup) return [];
    const filtered = groupsClas.filter(
      (c) => String(c.tournamentGroup.group) === selectedGroup,
    );
    filtered.sort((a, b) => {
      const pointsA = a.pointsClas ?? 0;
      const pointsB = b.pointsClas ?? 0;
      if (pointsB !== pointsA) return pointsB - pointsA;
      const diffSetsA = (a.setsWon ?? 0) - (a.setsLost ?? 0);
      const diffSetsB = (b.setsWon ?? 0) - (b.setsLost ?? 0);
      if (diffSetsB !== diffSetsA) return diffSetsB - diffSetsA;
      const diffPointsA = (a.pointsWon ?? 0) - (a.pointsLost ?? 0);
      const diffPointsB = (b.pointsWon ?? 0) - (b.pointsLost ?? 0);
      if (diffPointsB !== diffPointsA) return diffPointsB - diffPointsA;
      return 0;
    });
    return filtered.map((c, index) => ({ ...c, visualPosition: index + 1 }));
  }, [groupsClas, selectedGroup]);

  const currentGroupMatches = useMemo(() => {
    if (!groupMatches || !selectedGroup) return [];
    return groupMatches.filter((m) => String(m.group?.group) === selectedGroup);
  }, [groupMatches, selectedGroup]);

  if (!groupsClas || !groupMatches) {
    return (
      <Center py="xl">
        <Loader color="blue" />
      </Center>
    );
  }

  return (
    <Stack gap="xl">
      <Group>
        <Select
          label="Selecciona un grupo"
          data={groupOptions}
          value={selectedGroup}
          onChange={(val) => onGroupChange(val)}
          allowDeselect={false}
          w={{ base: '100%', sm: 250 }}
        />
      </Group>

      <Card withBorder shadow="sm" radius="md" padding="md">
        <Title order={4} mb="md">
          Clasificación
        </Title>
        <ScrollArea>
          <Table striped verticalSpacing="sm" miw={480}>
            <Table.Thead>
              <Table.Tr>
                <Table.Th w={40}>Pos</Table.Th>
                <Table.Th>Jugador</Table.Th>
                <Table.Th>Ranking</Table.Th>
                <Table.Th ta="center">Pts Clas.</Table.Th>
                <Table.Th ta="center">V - D</Table.Th>
                <Table.Th ta="center" visibleFrom="sm">
                  Sets Ganados
                </Table.Th>
                <Table.Th ta="center" visibleFrom="sm">
                  Sets Perdidos
                </Table.Th>
                <Table.Th ta="center" visibleFrom="sm">
                  Puntos Ganados
                </Table.Th>
                <Table.Th ta="center" visibleFrom="sm">
                  Puntos Perdidos
                </Table.Th>
                <Table.Th ta="center">Diferencia Puntos</Table.Th>
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {currentGroupClas.map((clas) => {
                const typedClas = clas as GroupClasWithVisual;
                const sC = Array.isArray(clas.player?.stats)
                  ? clas.player?.stats[0]
                  : clas.player?.stats;
                return (
                  <Table.Tr key={clas.id}>
                    <Table.Td>
                      <Badge
                        color={
                          typedClas.visualPosition <= (playersKnockout || 2)
                            ? 'green'
                            : 'gray'
                        }
                        variant="filled"
                      >
                        {typedClas.visualPosition}
                      </Badge>
                    </Table.Td>
                    <Table.Td fw={500}>
                      {clas.player?.name} {clas.player?.surname || ''}
                    </Table.Td>
                    <Table.Td fw={500}>
                      <Badge color="blue" variant="light" size="lg">
                        {sC?.elo || 500}
                      </Badge>
                    </Table.Td>
                    <Table.Td ta="center" fw={700}>
                      <Badge color="green" variant="light">
                        {clas.pointsClas} pts
                      </Badge>
                    </Table.Td>
                    <Table.Td ta="center">
                      {clas.gamesWon}-{clas.gamesLost}
                    </Table.Td>
                    <Table.Td ta="center" fw={600} visibleFrom="sm">
                      <Text size="sm" c="teal.6">
                        {clas.setsWon}
                      </Text>
                    </Table.Td>
                    <Table.Td ta="center" fw={600} visibleFrom="sm">
                      <Text size="sm" c="red.6">
                        {clas.setsLost}
                      </Text>
                    </Table.Td>
                    <Table.Td ta="center" fw={600} visibleFrom="sm">
                      <Text size="sm" c="blue.6">
                        {clas.pointsWon}
                      </Text>
                    </Table.Td>
                    <Table.Td ta="center" fw={600} visibleFrom="sm">
                      <Text size="sm" c="red.6">
                        {clas.pointsLost}
                      </Text>
                    </Table.Td>
                    <Table.Td ta="center" fw={600}>
                      <Text
                        size="sm"
                        c={(clas.pointsWon ?? 0) - (clas.pointsLost ?? 0) > 0 ? 'green.6' : 'red.6'}
                      >
                        {(clas.pointsWon ?? 0) - (clas.pointsLost ?? 0)}
                      </Text>
                    </Table.Td>
                  </Table.Tr>
                );
              })}
              {currentGroupClas.length === 0 && (
                <Table.Tr>
                  <Table.Td colSpan={6} ta="center">
                    <Text c="dimmed">No hay datos para este grupo.</Text>
                  </Table.Td>
                </Table.Tr>
              )}
            </Table.Tbody>
          </Table>
        </ScrollArea>
      </Card>

      <Title order={4} mt="sm">
        Partidos del Grupo
      </Title>
      <Stack gap="sm">
        {currentGroupMatches.length === 0 ? (
          <Text c="dimmed">No hay partidos generados aún.</Text>
        ) : (
          currentGroupMatches.map((match) => (
            <Card key={match.id} withBorder shadow="sm" radius="md" p="md">
              <Group justify="space-between" align="center" wrap="nowrap">
                <Stack gap={4}>
                  <Text fw={500} size="sm">
                    {match.playerOne?.name} {match.playerOne?.surname || ''}{' '}
                    <Text span c="dimmed" mx={5}>
                      vs
                    </Text>{' '}
                    {match.playerTwo?.name} {match.playerTwo?.surname || ''}
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
          ))
        )}
      </Stack>
    </Stack>
  );
};

export default GroupClassificationsTable;

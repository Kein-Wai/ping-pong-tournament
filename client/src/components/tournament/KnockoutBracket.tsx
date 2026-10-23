import { useMemo } from 'react';

import {
  Center,
  Loader,
  Text,
  Group,
  Select,
  Title,
  Paper,
  Stack,
  ScrollArea,
  Badge,
} from '@mantine/core';
import { notifications } from '@mantine/notifications';
import type { KnockoutRound, BracketMatch, BracketPlayer } from '../../types/tournament';

interface KnockoutBracketProps {
  bracketData: KnockoutRound[] | null;
  activeSubKey: string | null;
  onSubKeyChange: (key: string | null) => void;
  isAdmin: boolean;
  onEditMatch: (match: BracketMatch, isKnockout: boolean) => void;
  onViewMatch: (match: BracketMatch) => void;
}

const getBracketGroups = (data: KnockoutRound[]) => {
  const groups: Record<number, { label: string; rounds: KnockoutRound[] }> = {};

  data.forEach((round) => {
    if (!round.positions) return;

    let posStart = parseInt(round.positions.split('-')[0]);
    const posEnd = parseInt(round.positions.split('-')[1]);

    if (posEnd - posStart === 1 && posStart % 4 === 3) {
      posStart = posStart - 2;
    }

    if (!groups[posStart]) {
      groups[posStart] = { label: '', rounds: [] };
    }
    groups[posStart].rounds.push(round);
  });

  const groupKeys = Object.keys(groups).map(Number);
  const mainBracketKey = Math.min(...groupKeys);

  groupKeys.forEach((numKey) => {
    const rounds = groups[numKey].rounds;

    let maxPosEnd = numKey;
    rounds.forEach((r) => {
      if (r.positions) {
        const end = parseInt(r.positions.split('-')[1]);
        if (end > maxPosEnd) maxPosEnd = end;
      }
    });

    if (numKey === mainBracketKey) {
      groups[numKey].label = `Cuadro Principal (Puestos ${numKey} al ${maxPosEnd})`;
    } else {
      groups[numKey].label = `Cuadro Consolación (Puestos ${numKey} al ${maxPosEnd})`;
    }
  });

  return groups;
};

const formatSets = (match: BracketMatch) => {
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

const getFirstStat = (stats: BracketPlayer['stats']) => {
  if (!stats) return null;
  return Array.isArray(stats) ? stats[0] : stats;
};

export const KnockoutBracket = ({
  bracketData,
  activeSubKey,
  onSubKeyChange,
  isAdmin,
  onEditMatch,
  onViewMatch,
}: KnockoutBracketProps) => {
  const groups = useMemo(() => {
    if (!bracketData) return {};
    return getBracketGroups(bracketData);
  }, [bracketData]);

  const groupKeys = useMemo(() => {
    if (!bracketData) return [];
    return Object.keys(groups).sort((a, b) => parseInt(a) - parseInt(b));
  }, [groups, bracketData]);

  if (!bracketData) {
    return (
      <Center py="xl">
        <Loader color="blue" />
      </Center>
    );
  }
  if (bracketData.length === 0) {
    return (
      <Center py="xl">
        <Text c="dimmed">El cuadro aún no ha sido generado.</Text>
      </Center>
    );
  }

  const selectedKey = activeSubKey && groups[parseInt(activeSubKey)] ? activeSubKey : groupKeys[0];

  const selectOptions = groupKeys.map((key) => ({
    value: key,
    label: groups[parseInt(key)].label,
  }));

  const activeRounds = groups[parseInt(selectedKey)]?.rounds || [];

  return (
    <Stack>
      {groupKeys.length > 1 && (
        <Group px="md" mt="sm">
          <Select
            data={selectOptions}
            value={selectedKey}
            onChange={(val) => onSubKeyChange(val)}
            label="Selecciona la Fase del Cuadro a visualizar:"
            style={{ width: 350 }}
            allowDeselect={false}
          />
        </Group>
      )}

      <ScrollArea type="always" offsetScrollbars pb="xl">
        <Group align="center" wrap="nowrap" gap={50} p="md">
          {activeRounds.map((round) => {
            let isThirdPlace = false;
            let roundTitle = round.round;

            if (round.positions) {
              const pStart = parseInt(round.positions.split('-')[0]);
              const pEnd = parseInt(round.positions.split('-')[1]);

              if (pEnd - pStart === 1 && pStart > 1 && pStart % 2 !== 0) {
                isThirdPlace = true;
                roundTitle = `Puestos ${pStart} y ${pEnd}`;
              } else if (round.round === 'Final') {
                roundTitle = `Final (${pStart} y ${pEnd})`;
              }
            }

            return (
              <Stack key={round.id} gap="xl" justify="space-around" style={{ minWidth: 250 }}>
                <Title
                  order={5}
                  ta="center"
                  c={isThirdPlace ? 'orange.6' : 'dimmed'}
                  tt="uppercase"
                  mb="md"
                >
                  {roundTitle}
                </Title>
                {round.matches.map((match) => {
                  const s1 = getFirstStat(match.playerOne?.stats);
                  const s2 = getFirstStat(match.playerTwo?.stats);

                  return (
                    <Paper
                      key={match.id}
                      withBorder
                      shadow="sm"
                      radius="md"
                      p={0}
                      style={{ overflow: 'hidden', cursor: 'pointer' }}
                      onClick={() => {
                        const isTBD =
                          match.playerOne?.name === 'Por' || match.playerTwo?.name === 'Por';
                        const isBye =
                          match.playerOne?.name === 'EXENTO' || match.playerTwo?.name === 'EXENTO';

                        if (isBye && isAdmin) {
                          notifications.show({
                            title: 'Pase Directo (Bye)',
                            message: 'Este jugador no tiene contrincante.',
                            color: 'blue',
                          });
                          return;
                        }
                        if (isTBD && isAdmin) {
                          notifications.show({
                            title: 'Partido Bloqueado',
                            message: 'Faltan jugadores por clasificarse.',
                            color: 'orange',
                          });
                          return;
                        }
                        if (match.status === 'Completado') {
                          if (isAdmin) {
                            onEditMatch(match, true);
                          } else {
                            onViewMatch(match);
                          }
                          return;
                        }
                        if (isAdmin) onEditMatch(match, true);
                      }}
                    >
                      <Group
                        justify="space-between"
                        p="xs"
                        style={{
                          borderBottom: '1px solid var(--mantine-color-default-border)',
                        }}
                      >
                        <Text size="sm">
                          {match.playerOne?.name || 'TBD'} {match.playerOne?.surname || ''}
                        </Text>
                        {s1?.elo && (
                          <Badge size="sm" variant="light" color="blue">
                            {s1.elo}
                          </Badge>
                        )}
                      </Group>
                      <Group justify="space-between" p="xs">
                        <Text size="sm">
                          {match.playerTwo?.name || 'TBD'} {match.playerTwo?.surname || ''}
                        </Text>
                        {s2?.elo && (
                          <Badge size="sm" variant="light" color="blue">
                            {s2.elo}
                          </Badge>
                        )}
                      </Group>
                      <Center p={4} bg="gray.1" style={{ darkHidden: true }}>
                        <Stack justify="space-around" align="center" gap="xs">
                          {formatSets(match)}
                        </Stack>
                      </Center>
                    </Paper>
                  );
                })}
              </Stack>
            );
          })}
        </Group>
      </ScrollArea>
    </Stack>
  );
};

export default KnockoutBracket;

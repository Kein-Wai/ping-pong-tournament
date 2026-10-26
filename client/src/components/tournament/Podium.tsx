import {
  Stack,
  Group,
  Text,
  Paper,
  Avatar,
  Badge,
  Center,
  Loader,
  Card,
  Title,
  Table,
} from '@mantine/core';
import { IconTrophy, IconMedal } from '@tabler/icons-react';
import { getPlayerAvatar } from '../../utils/avatar';
import type { TournamentClas } from '../../types/tournament';

export interface PodiumProps {
  /** Resultados de clasificación (null = loading). */
  results: TournamentClas[] | null;
  /** Primer lugar. */
  firstPlace: TournamentClas | null;
  /** Segundo lugar. */
  secondPlace: TournamentClas | null;
  /** Tercer lugar. */
  thirdPlace: TournamentClas | null;
  /** Resto de clasificados. */
  otherResults: TournamentClas[];
}

export const Podium = ({
  results,
  firstPlace,
  secondPlace,
  thirdPlace,
  otherResults,
}: PodiumProps) => {
  if (!results) {
    return (
      <Center py="xl">
        <Loader color="yellow" />
      </Center>
    );
  }

  return (
    <Stack gap="xl" mt="md">
      <Group justify="center" align="flex-end" gap="xl" py="xl">
        {secondPlace && (
          <Stack align="center" gap="xs">
            <Avatar
              src={getPlayerAvatar(secondPlace.player?.name, secondPlace.player?.avatarUrl)}
              radius="xl"
              size="lg"
            />
            <Text fw={600} size="sm">
              {secondPlace.player?.name} {secondPlace.player?.surname || ''}
            </Text>
            <Paper
              w={90}
              h={90}
              radius="md"
              style={{ backgroundColor: 'var(--mantine-color-gray-3)' }}
            >
              <Stack align="center" justify="center" h="100%" gap={0}>
                <IconMedal color="var(--mantine-color-gray-7)" size={28} />
                <Text fw={900} size="xl" c="gray.7">
                  2º
                </Text>
              </Stack>
            </Paper>
          </Stack>
        )}
        {firstPlace && (
          <Stack align="center" gap="xs">
            <IconTrophy
              size={40}
              color="var(--mantine-color-yellow-5)"
              style={{ marginBottom: -10 }}
            />
            <Avatar
              src={getPlayerAvatar(firstPlace.player?.name, firstPlace.player?.avatarUrl)}
              radius="xl"
              size="xl"
            />
            <Text fw={800} size="md">
              {firstPlace.player?.name} {firstPlace.player?.surname || ''}
            </Text>
            <Paper
              w={100}
              h={130}
              radius="md"
              style={{ backgroundColor: 'var(--mantine-color-yellow-5)' }}
            >
              <Stack align="center" justify="center" h="100%" gap={0}>
                <Text fw={900} size="h1" c="white">
                  1º
                </Text>
              </Stack>
            </Paper>
          </Stack>
        )}
        {thirdPlace && (
          <Stack align="center" gap="xs">
            <Avatar
              src={getPlayerAvatar(thirdPlace.player?.name, thirdPlace.player?.avatarUrl)}
              radius="xl"
              size="lg"
            />
            <Text fw={600} size="sm">
              {thirdPlace.player?.name} {thirdPlace.player?.surname || ''}
            </Text>
            <Paper
              w={90}
              h={60}
              radius="md"
              style={{ backgroundColor: 'var(--mantine-color-orange-4)' }}
            >
              <Stack align="center" justify="center" h="100%" gap={0}>
                <IconMedal color="var(--mantine-color-orange-8)" size={24} />
                <Text fw={900} size="lg" c="orange.8">
                  3º
                </Text>
              </Stack>
            </Paper>
          </Stack>
        )}
      </Group>

      {otherResults.length > 0 && (
        <Card withBorder radius="md" shadow="sm">
          <Title order={4} mb="md">
            Clasificación General
          </Title>
          <Table striped highlightOnHover verticalSpacing="sm">
            <Table.Thead>
              <Table.Tr>
                <Table.Th w={80}>Puesto</Table.Th>
                <Table.Th>Jugador</Table.Th>
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {otherResults.map((p) => (
                <Table.Tr key={p.id}>
                  <Table.Td>
                    <Badge color="gray" variant="light" size="lg">
                      {p.position}º
                    </Badge>
                  </Table.Td>
                  <Table.Td>
                    {p.player?.name} {p.player?.surname || ''}
                  </Table.Td>
                </Table.Tr>
              ))}
            </Table.Tbody>
          </Table>
        </Card>
      )}
    </Stack>
  );
};

export default Podium;

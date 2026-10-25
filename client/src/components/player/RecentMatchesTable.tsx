import { Avatar, Badge, Card, Center, Group, ScrollArea, Table, Text, Title } from '@mantine/core';
import { IconHistory } from '@tabler/icons-react';
import { getPlayerAvatar } from '../../utils/avatar';
import { formatDate } from '../../utils/dates';
import { getMatchResult } from '../../utils/player-profile';
import type { ProfileMatch } from '../../types/playerProfile';

/**
 * Tabla «Últimos Partidos Jugados» del perfil de un jugador: fecha, torneo,
 * resultado, rival y marcador de sets de cada partido.
 *
 * Migration: extracción de la tarjeta de historial de JugadorPerfil.
 */
export interface RecentMatchesTableProps {
  matches: ProfileMatch[];
  playerId: string;
}

export const RecentMatchesTable = ({ matches, playerId }: RecentMatchesTableProps) => (
  <Card shadow="sm" padding="lg" radius="md" withBorder mt="md">
    <Group gap="sm" mb="md">
      <IconHistory size={20} color="var(--mantine-color-blue-6)" />
      <Title order={4}>Últimos Partidos Jugados</Title>
    </Group>

    <ScrollArea>
      <Table striped highlightOnHover verticalSpacing="sm">
        <Table.Thead>
          <Table.Tr>
            <Table.Th>Fecha</Table.Th>
            <Table.Th>Torneo</Table.Th>
            <Table.Th>Resultado</Table.Th>
            <Table.Th>Oponente</Table.Th>
            <Table.Th>Marcador (Sets)</Table.Th>
          </Table.Tr>
        </Table.Thead>
        <Table.Tbody>
          {matches.map((m) => {
            const { opponent, didWin, setScore } = getMatchResult(m, playerId);

            return (
              <Table.Tr key={m.id}>
                <Table.Td>
                  {formatDate(m.dateStart, {
                    day: '2-digit',
                    month: 'short',
                    year: 'numeric',
                  })}
                </Table.Td>
                <Table.Td>
                  <Text size="sm" fw={500} truncate w={150}>
                    {m.tournament?.name || 'Amistoso'}
                  </Text>
                </Table.Td>
                <Table.Td>
                  <Badge color={didWin ? 'green' : 'red'} variant="light">
                    {didWin ? 'Victoria' : 'Derrota'}
                  </Badge>
                </Table.Td>
                <Table.Td>
                  <Group gap="xs">
                    <Avatar
                      src={getPlayerAvatar(opponent.name, opponent.avatarUrl)}
                      radius="xl"
                      size="sm"
                    />
                    <Text size="sm">
                      {opponent?.name} {opponent?.surname || ''}
                    </Text>
                  </Group>
                </Table.Td>
                <Table.Td>
                  <Text fw={700} size="sm" c="dimmed">
                    {setScore}
                  </Text>
                </Table.Td>
              </Table.Tr>
            );
          })}
          {matches.length === 0 && (
            <Table.Tr>
              <Table.Td colSpan={5}>
                <Center py="md">
                  <Text c="dimmed">No hay historial de partidos registrados.</Text>
                </Center>
              </Table.Td>
            </Table.Tr>
          )}
        </Table.Tbody>
      </Table>
    </ScrollArea>
  </Card>
);

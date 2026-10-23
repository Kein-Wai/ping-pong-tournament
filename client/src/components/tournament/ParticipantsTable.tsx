import {
  Paper,
  Table,
  Group,
  Avatar,
  Text,
  Badge,
  Center,
  Loader,
  Tooltip,
  ActionIcon,
} from '@mantine/core';
import { IconUserCheck, IconUserX } from '@tabler/icons-react';
import { getPlayerAvatar } from '../../utils/avatar';
import type { TournamentParticipant } from '../../types/tournament';

export interface ParticipantsTableProps {
  /** Lista de participantes. */
  participants: TournamentParticipant[] | null;
  /** Si es administrador del torneo. */
  isAdmin: boolean;
  /** Si el torneo está programado (no iniciado). */
  isProgramado: boolean;
  /** Callback al cambiar el estado de un participante. */
  onStatusChange?: (
    playerId: string,
    playerName: string,
    playerSurname: string,
    status: 'Confirmado' | 'NoPresentado',
  ) => void;
}

export const ParticipantsTable = ({
  participants,
  isAdmin,
  isProgramado,
  onStatusChange,
}: ParticipantsTableProps) => {
  if (!participants) {
    return (
      <Center py="xl">
        <Loader color="blue" />
      </Center>
    );
  }

  if (participants.length === 0) {
    return (
      <Center py="xl">
        <Text c="dimmed">Aún no hay jugadores inscritos.</Text>
      </Center>
    );
  }

  return (
    <Paper withBorder radius="md">
      <Table striped highlightOnHover verticalSpacing="sm">
        <Table.Thead>
          <Table.Tr>
            <Table.Th w={50}>#</Table.Th>
            <Table.Th>Jugador</Table.Th>
            <Table.Th>ELO</Table.Th>
            <Table.Th>Estado</Table.Th>
            {isAdmin && isProgramado && <Table.Th>Acciones (Pase de lista)</Table.Th>}
          </Table.Tr>
        </Table.Thead>
        <Table.Tbody>
          {participants.map((p, index) => {
            const sP = Array.isArray(p.player?.stats)
              ? p.player?.stats[0]
              : p.player?.stats;
            return (
              <Table.Tr key={p.id}>
                <Table.Td>{index + 1}</Table.Td>
                <Table.Td>
                  <Group gap="sm">
                    <Avatar
                      src={getPlayerAvatar(p.player?.name, p.player?.avatarUrl)}
                      radius="xl"
                      size="sm"
                    />
                    <Text size="sm" fw={500}>
                      {p.player?.name} {p.player?.surname || ''}
                    </Text>
                  </Group>
                </Table.Td>
                <Table.Td>
                  <Badge variant="light">{sP?.elo || 500}</Badge>
                </Table.Td>
                <Table.Td>
                  <Badge
                    color={
                      p.status === 'Confirmado'
                        ? 'green'
                        : p.status === 'NoPresentado'
                          ? 'red'
                          : 'yellow'
                    }
                    variant="dot"
                  >
                    {p.status}
                  </Badge>
                </Table.Td>
                {isAdmin && isProgramado && (
                  <Table.Td>
                    <Group gap="xs">
                      {p.status !== 'Confirmado' && (
                        <Tooltip label="Confirmar Asistencia">
                          <ActionIcon
                            color="green"
                            variant="light"
                            onClick={() =>
                              onStatusChange?.(
                                p.player.id,
                                p.player.name,
                                p.player.surname || '',
                                'Confirmado',
                              )
                            }
                          >
                            <IconUserCheck size={18} />
                          </ActionIcon>
                        </Tooltip>
                      )}
                      {p.status !== 'NoPresentado' && (
                        <Tooltip label="Sancionar (No Presentado)">
                          <ActionIcon
                            color="red"
                            variant="light"
                            onClick={() =>
                              onStatusChange?.(
                                p.player.id,
                                p.player.name,
                                p.player.surname || '',
                                'NoPresentado',
                              )
                            }
                          >
                            <IconUserX size={18} />
                          </ActionIcon>
                        </Tooltip>
                      )}
                    </Group>
                  </Table.Td>
                )}
              </Table.Tr>
            );
          })}
        </Table.Tbody>
      </Table>
    </Paper>
  );
};

export default ParticipantsTable;

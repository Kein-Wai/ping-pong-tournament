import { Badge, Button, Group, Stack, Table, Text } from '@mantine/core';
import { IconUserPlus } from '@tabler/icons-react';
import { playerFullName } from '../../utils/leagueView';
import type { MatchStatus, PlayerTournamentStatus } from '../../types/enums';
import type { LeagueParticipant } from '../../types/league';

interface LeagueParticipantsTabProps {
  participants: LeagueParticipant[];
  leagueStatus: MatchStatus | null;
  isAdmin: boolean;
  onAdd: () => void;
  onConfirm: (playerId: string) => void;
  onRemove: (playerId: string) => void;
  onWithdraw: (playerId: string) => void;
}

const STATUS_LABEL: Record<PlayerTournamentStatus, string> = {
  Pendiente: 'Pendiente',
  Confirmado: 'Confirmado',
  NoPresentado: 'Retirado',
};

const STATUS_COLOR: Record<PlayerTournamentStatus, string> = {
  Pendiente: 'yellow',
  Confirmado: 'green',
  NoPresentado: 'red',
};

export const LeagueParticipantsTab = ({
  participants,
  leagueStatus,
  isAdmin,
  onAdd,
  onConfirm,
  onRemove,
  onWithdraw,
}: LeagueParticipantsTabProps) => {
  const isScheduled = leagueStatus === 'Programado';
  const isOngoing = leagueStatus === 'Iniciado';
  const canManage = isAdmin && (isScheduled || isOngoing);

  return (
    <Stack gap="md">
      {isAdmin && isScheduled && (
        <Group justify="flex-end">
          <Button leftSection={<IconUserPlus size={16} />} onClick={onAdd}>
            Añadir jugadores
          </Button>
        </Group>
      )}

      {participants.length === 0 ? (
        <Text c="dimmed" ta="center" py="xl">
          Todavía no hay jugadores en esta liga.
        </Text>
      ) : (
        <Table.ScrollContainer minWidth={420}>
          <Table verticalSpacing="sm" highlightOnHover>
            <Table.Thead>
              <Table.Tr>
                <Table.Th>Jugador</Table.Th>
                <Table.Th>Estado</Table.Th>
                {canManage && <Table.Th />}
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {participants.map((participant) => {
                const status = participant.status ?? 'Pendiente';
                return (
                  <Table.Tr key={participant.id}>
                    <Table.Td>{playerFullName(participant.player)}</Table.Td>
                    <Table.Td>
                      <Badge color={STATUS_COLOR[status]} variant="light">
                        {STATUS_LABEL[status]}
                      </Badge>
                    </Table.Td>
                    {canManage && (
                      <Table.Td>
                        <Group gap="xs" justify="flex-end">
                          {isScheduled && status === 'Pendiente' && (
                            <Button
                              size="xs"
                              color="green"
                              variant="light"
                              onClick={() => onConfirm(participant.playerId)}
                            >
                              Confirmar
                            </Button>
                          )}
                          {isScheduled && (
                            <Button
                              size="xs"
                              color="red"
                              variant="subtle"
                              onClick={() => onRemove(participant.playerId)}
                            >
                              Quitar
                            </Button>
                          )}
                          {isOngoing && status === 'Confirmado' && (
                            <Button
                              size="xs"
                              color="red"
                              variant="subtle"
                              onClick={() => onWithdraw(participant.playerId)}
                            >
                              Retirar
                            </Button>
                          )}
                        </Group>
                      </Table.Td>
                    )}
                  </Table.Tr>
                );
              })}
            </Table.Tbody>
          </Table>
        </Table.ScrollContainer>
      )}
    </Stack>
  );
};

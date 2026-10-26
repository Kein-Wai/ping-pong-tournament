import { ActionIcon, Avatar, Badge, Group, Table, Text, Tooltip } from '@mantine/core';
import { IconCheck, IconEdit, IconEye, IconKey, IconX } from '@tabler/icons-react';

import type { PlayerListItem } from '../../types/players';
import { getPlayerAvatar } from '../../utils/avatar';
import { returnEloColor } from '../../utils/helpers';
import { getPlayerStats, getWinRate } from '../../utils/players';

interface PlayerRowProps {
  player: PlayerListItem;
  /** Administradores: ven el estado y las acciones de gestión. */
  canManage: boolean;
  isSuperAdmin: boolean;
  onProcessRequest: (playerId: string, playerName: string, action: 'Aprobado' | 'Rechazado') => void;
  onEditElo: (player: PlayerListItem) => void;
  onResetAccount: (player: PlayerListItem) => void;
  onViewProfile: (playerId: string) => void;
}

/** Fila de la tabla de la plantilla: datos del jugador y las acciones que permite su estado. */
export const PlayerRow = ({
  player,
  canManage,
  isSuperAdmin,
  onProcessRequest,
  onEditElo,
  onResetAccount,
  onViewProfile,
}: PlayerRowProps) => {
  const s = getPlayerStats(player);
  const winRate = getWinRate(s);
  const fullName = `${player.name} ${player.surname || ''}`;

  return (
    <Table.Tr>
      <Table.Td>
        <Group gap="sm">
          <Avatar src={getPlayerAvatar(player.name, player.avatarUrl)} radius="xl" size="sm" />
          <div>
            <Text fz="sm" fw={500}>
              {fullName}
            </Text>
            <Text fz="xs" c="dimmed">
              {player?.nickname || 'Sin mote'}
            </Text>
          </div>
        </Group>
      </Table.Td>

      <Table.Td>
        <Badge color={s?.elo ? returnEloColor(s?.elo) : 'gray'} variant="light">
          {s?.elo || 500} ELO
        </Badge>
      </Table.Td>

      {canManage && (
        <Table.Td visibleFrom="sm">
          <Badge color={player.clubStatus === 'Aprobado' ? 'green' : 'yellow'} variant="dot">
            {player.clubStatus || 'Registrado'}
          </Badge>
          {isSuperAdmin && player.clubId && (
            <Text size="xs" c="dimmed">
              {player.club?.name || 'Sin club'}
            </Text>
          )}
        </Table.Td>
      )}

      <Table.Td visibleFrom="sm">
        <Text fz="sm" fw={500}>
          <Text component="span" c="green">
            {s?.matchWon || 0}V
          </Text>{' '}
          -{' '}
          <Text component="span" c="red">
            {s?.matchLost || 0}D
          </Text>
        </Text>
        <Text fz="xs" c="dimmed">
          {winRate}% Win Rate
        </Text>
      </Table.Td>

      <Table.Td>
        <Group gap="xs">
          {player.clubStatus === 'Pendiente' && canManage && (
            <>
              <Tooltip label="Aprobar e incorporar al club">
                <ActionIcon
                  variant="light"
                  color="green"
                  onClick={() => onProcessRequest(player.id, fullName, 'Aprobado')}
                >
                  <IconCheck size={16} />
                </ActionIcon>
              </Tooltip>
              <Tooltip label="Rechazar solicitud">
                <ActionIcon
                  variant="light"
                  color="red"
                  onClick={() => onProcessRequest(player.id, fullName, 'Rechazado')}
                >
                  <IconX size={16} />
                </ActionIcon>
              </Tooltip>
            </>
          )}

          {player.clubStatus === 'Aprobado' && canManage && (
            <Tooltip label="Ajustar ELO manualmente">
              <ActionIcon variant="light" color="orange" onClick={() => onEditElo(player)}>
                <IconEdit size={16} />
              </ActionIcon>
            </Tooltip>
          )}

          {player.clubStatus === 'Aprobado' && canManage && (
            <Tooltip label="Resetear Cuenta / Asignar Correo">
              <ActionIcon variant="light" color="grape" onClick={() => onResetAccount(player)}>
                <IconKey size={16} />
              </ActionIcon>
            </Tooltip>
          )}

          <Tooltip label="Ver perfil completo">
            <ActionIcon variant="light" color="blue" onClick={() => onViewProfile(player.id)}>
              <IconEye size={18} />
            </ActionIcon>
          </Tooltip>
        </Group>
      </Table.Td>
    </Table.Tr>
  );
};

import { Card, ScrollArea, Table, Text } from '@mantine/core';

import type { PlayerListItem } from '../../types/players';
import { PlayerRow } from './PlayerRow';

interface PlayersTableProps {
  /** Jugadores de la página actual. */
  players: PlayerListItem[];
  /** Administradores: ven la columna de estado y las acciones de gestión. */
  canManage: boolean;
  isSuperAdmin: boolean;
  onProcessRequest: (playerId: string, playerName: string, action: 'Aprobado' | 'Rechazado') => void;
  onEditElo: (player: PlayerListItem) => void;
  onResetAccount: (player: PlayerListItem) => void;
  onViewProfile: (playerId: string) => void;
}

/** Tabla de la plantilla, con el aviso de vacío cuando no hay jugadores. */
export const PlayersTable = ({
  players,
  canManage,
  isSuperAdmin,
  onProcessRequest,
  onEditElo,
  onResetAccount,
  onViewProfile,
}: PlayersTableProps) => {
  const rows = players.map((player) => (
    <PlayerRow
      key={player.id}
      player={player}
      canManage={canManage}
      isSuperAdmin={isSuperAdmin}
      onProcessRequest={onProcessRequest}
      onEditElo={onEditElo}
      onResetAccount={onResetAccount}
      onViewProfile={onViewProfile}
    />
  ));

  return (
    <Card withBorder shadow="sm" radius="md" padding="0">
      <ScrollArea>
        <Table striped highlightOnHover verticalSpacing="sm" px="md" miw={600}>
          <Table.Thead>
            <Table.Tr>
              <Table.Th>Jugador</Table.Th>
              <Table.Th>Nivel (ELO)</Table.Th>
              {canManage && <Table.Th visibleFrom="sm">Estado</Table.Th>}
              <Table.Th visibleFrom="sm">Récord de Partidos</Table.Th>
              <Table.Th>Acciones</Table.Th>
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>
            {rows.length > 0 ? (
              rows
            ) : (
              <Table.Tr>
                <Table.Td colSpan={canManage ? 5 : 4} ta="center" py="xl">
                  <Text c="dimmed">No se encontraron jugadores.</Text>
                </Table.Td>
              </Table.Tr>
            )}
          </Table.Tbody>
        </Table>
      </ScrollArea>
    </Card>
  );
};

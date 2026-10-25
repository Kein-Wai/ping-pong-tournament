import { Avatar, Checkbox, Group, Text, Tooltip } from '@mantine/core';
import { getPlayerAvatar } from '../../utils/avatar';
import type { TeamMatchAvailability } from '../../types/api';

/**
 * Confirmación de asistencia a un partido de equipo: la casilla «Voy a ir» del
 * jugador y los avatares de quienes ya han confirmado.
 *
 * Migration: extracción del bloque que EquipoDetalles repetía en el partido
 * destacado y en cada fila del calendario.
 */
export interface AttendanceBlockProps {
  availabilities?: TeamMatchAvailability[];
  /** El jugador actual ya ha confirmado. */
  confirmed: boolean;
  disabled: boolean;
  onToggle: () => void;
}

export const AttendanceBlock = ({
  availabilities,
  confirmed,
  disabled,
  onToggle,
}: AttendanceBlockProps) => (
  <Group justify="space-between" mt="md" w="100%">
    <Group gap="xs">
      <Tooltip label={confirmed ? 'Cancelar asistencia' : 'Confirmar asistencia'}>
        <Checkbox
          checked={confirmed}
          onChange={onToggle}
          color="green"
          size="md"
          radius="xl"
          label={
            <Text fw={600} size="sm">
              Voy a ir
            </Text>
          }
          disabled={disabled}
        />
      </Tooltip>
    </Group>

    <Group gap={4}>
      {availabilities?.map((av) => (
        <Tooltip key={av.playerId} label={av.player!.name}>
          <Avatar
            src={getPlayerAvatar(av.player!.name, av.player!.avatarUrl)}
            radius="xl"
            size="sm"
            style={{ border: '2px solid var(--mantine-color-green-5)' }}
          />
        </Tooltip>
      ))}
      {availabilities?.length === 0 && (
        <Text c="dimmed" size="xs">
          Sin confirmar
        </Text>
      )}
    </Group>
  </Group>
);

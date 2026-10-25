import { Badge, Button, Card, Group, Stack, Text } from '@mantine/core';
import { IconMapPin } from '@tabler/icons-react';
import { AttendanceBlock } from './AttendanceBlock';
import { getTeamMatchOutcome } from '../../utils/team-matches';
import type { TeamMatch } from '../../types/api';

/**
 * Tarjeta de un partido del calendario de un equipo: enfrentamiento, fecha,
 * lugar, resultado, estado, botón «Actualizar» y asistencia.
 *
 * Una sola tarjeta con dos variantes: `featured` es el «Siguiente Compromiso»
 * (fondo azul, etiqueta y fecha larga) y la regular es la fila del resto del
 * calendario. El marcador solo sale en partidos jugados, así que el destacado
 * (siempre programado) nunca lo muestra.
 *
 * Migration: unifica el partido destacado y las filas de EquipoDetalles, que
 * repetían casi el mismo bloque de JSX.
 */
export interface TeamMatchCardProps {
  match: TeamMatch;
  teamName: string;
  featured?: boolean;
  /** El jugador actual ya ha confirmado su asistencia. */
  amIConfirmed: boolean;
  canEdit: boolean;
  /** El jugador actual pertenece al equipo y puede confirmar asistencia. */
  canToggleAttendance: boolean;
  onEdit: () => void;
  onToggleAttendance: () => void;
}

const featuredCardProps = {
  p: 'md',
  bg: 'blue.0',
  style: { borderColor: 'var(--mantine-color-blue-5)', borderWidth: 2 },
  mb: 'md',
} as const;

export const TeamMatchCard = ({
  match,
  teamName,
  featured = false,
  amIConfirmed,
  canEdit,
  canToggleAttendance,
  onEdit,
  onToggleAttendance,
}: TeamMatchCardProps) => {
  const { hasScore, isWin, isLoss, statusColor } = getTeamMatchOutcome(match);
  const resultColor = isWin ? 'green' : isLoss ? 'red' : 'yellow';

  return (
    <Card
      withBorder
      shadow={featured ? 'md' : 'sm'}
      radius="md"
      {...(featured ? featuredCardProps : {})}
    >
      {featured && (
        <Text size="xs" fw={800} c="blue.7" tt="uppercase" mb="xs">
          🔥 Siguiente Compromiso
        </Text>
      )}
      <Group justify="space-between" align="center" wrap="nowrap">
        <Stack gap={4}>
          <Text fw={featured ? 800 : 700} size="lg" c={featured ? 'blue.9' : undefined}>
            {match.isHome ? teamName : match.rivalName}
            <Text span c={featured ? 'blue.5' : 'dimmed'} mx="sm">
              {featured ? 'VS' : 'vs'}
            </Text>
            {match.isHome ? match.rivalName : teamName}
          </Text>
          <Group gap="sm">
            <Text size="sm" c={featured ? 'blue.8' : 'dimmed'} fw={600}>
              {new Date(match.date).toLocaleString('es-ES', {
                dateStyle: featured ? 'full' : 'short',
                timeStyle: 'short',
              })}
            </Text>
            {match.location && (
              <Text size="sm" c={featured ? 'blue.8' : 'dimmed'}>
                <IconMapPin size={14} style={{ verticalAlign: 'middle', marginRight: 4 }} />
                {match.location}
              </Text>
            )}
          </Group>
        </Stack>

        <Group gap="sm" align="center">
          {match.status === 'Completado' && hasScore && (
            <Group gap="xs">
              <Badge size="lg" variant="filled" color={resultColor}>
                {isWin ? '🏆 VICTORIA' : isLoss ? '❌ DERROTA' : '🤝 EMPATE'}
              </Badge>

              <Badge size="xl" variant="outline" color={resultColor}>
                {match.isHome
                  ? `${match.ourScore} - ${match.rivalScore}`
                  : `${match.rivalScore} - ${match.ourScore}`}
              </Badge>
            </Group>
          )}

          <Badge
            color={statusColor}
            variant={featured || match.status === 'Completado' ? 'filled' : 'light'}
            size="lg"
          >
            {match.status}
          </Badge>

          {canEdit && (
            <Button variant="light" size="xs" onClick={onEdit}>
              Actualizar
            </Button>
          )}
        </Group>
      </Group>

      <AttendanceBlock
        availabilities={match.availabilities}
        confirmed={amIConfirmed}
        disabled={match.status !== 'Programado' || !canToggleAttendance}
        onToggle={onToggleAttendance}
      />
    </Card>
  );
};

import { Button, Center, Group, Stack, Text } from '@mantine/core';
import { IconPlus } from '@tabler/icons-react';
import { TeamMatchCard } from './TeamMatchCard';
import { getNextMatch } from '../../utils/team-matches';
import type { TeamMatch } from '../../types/api';

/**
 * Pestaña «Calendario y Resultados» del detalle de un equipo: el siguiente
 * compromiso destacado y debajo el resto de partidos.
 *
 * Migration: extracción del panel «calendario» de EquipoDetalles.
 */
export interface TeamCalendarTabProps {
  matches: TeamMatch[];
  teamName: string;
  currentUserId: string | undefined;
  isAdmin: boolean;
  canEditMatch: boolean;
  /** El usuario actual pertenece al equipo y puede confirmar asistencia. */
  isTeamMember: boolean;
  onAddMatch: () => void;
  onEditMatch: (match: TeamMatch) => void;
  onToggleAttendance: (matchId: string) => void;
}

export const TeamCalendarTab = ({
  matches,
  teamName,
  currentUserId,
  isAdmin,
  canEditMatch,
  isTeamMember,
  onAddMatch,
  onEditMatch,
  onToggleAttendance,
}: TeamCalendarTabProps) => {
  const nextMatch = getNextMatch(matches);
  const isConfirmed = (m: TeamMatch) => !!m.availabilities?.some((a) => a.playerId === currentUserId);

  return (
    <Stack gap="md">
      {isAdmin && (
        <Group justify="flex-end">
          <Button leftSection={<IconPlus size={16} />} variant="light" color="green" onClick={onAddMatch}>
            Añadir Partido
          </Button>
        </Group>
      )}

      {matches.length === 0 ? (
        <Center py="xl">
          <Text c="dimmed">No hay partidos en el calendario.</Text>
        </Center>
      ) : (
        <Stack gap="sm">
          {nextMatch && (
            <TeamMatchCard
              featured
              match={nextMatch}
              teamName={teamName}
              amIConfirmed={isConfirmed(nextMatch)}
              canEdit={canEditMatch}
              canToggleAttendance={isTeamMember}
              onEdit={() => onEditMatch(nextMatch)}
              onToggleAttendance={() => onToggleAttendance(nextMatch.id)}
            />
          )}

          {matches
            .filter((m) => m.id !== nextMatch?.id)
            .map((m) => (
              <TeamMatchCard
                key={m.id}
                match={m}
                teamName={teamName}
                amIConfirmed={isConfirmed(m)}
                canEdit={canEditMatch}
                canToggleAttendance={isTeamMember}
                onEdit={() => onEditMatch(m)}
                onToggleAttendance={() => onToggleAttendance(m.id)}
              />
            ))}
        </Stack>
      )}
    </Stack>
  );
};

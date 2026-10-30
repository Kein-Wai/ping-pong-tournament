import { Button, Card, Group, Stack, Text, ThemeIcon, Title } from '@mantine/core';
import { IconCalendar, IconTrophy } from '@tabler/icons-react';
import { LeagueStatusBadge } from './LeagueStatusBadge';
import { formatDate } from '../../utils/dates';
import { bestOfLabel } from '../../utils/leagueView';
import type { PlayerTournamentStatus } from '../../types/enums';
import type { LeagueDetail } from '../../types/league';

/** Jugadores confirmados que hacen falta para poder iniciar una liga (igual que en la API). */
export const MIN_LEAGUE_PLAYERS = 3;

interface LeagueHeaderProps {
  league: LeagueDetail;
  progress: { played: number; total: number };
  confirmedCount: number;
  isAdmin: boolean;
  /** Estado del jugador autenticado en esta liga, o null si no está inscrito. */
  myStatus: PlayerTournamentStatus | null;
  acting: boolean;
  onStart: () => void;
  onCancel: () => void;
  onFinish: () => void;
  onDelete: () => void;
  onRegister: () => void;
  onUnregister: () => void;
}

export const LeagueHeader = ({
  league,
  progress,
  confirmedCount,
  isAdmin,
  myStatus,
  acting,
  onStart,
  onCancel,
  onFinish,
  onDelete,
  onRegister,
  onUnregister,
}: LeagueHeaderProps) => {
  const isScheduled = league.status === 'Programado';
  const isOngoing = league.status === 'Iniciado';
  const canStart = confirmedCount >= MIN_LEAGUE_PLAYERS;
  const showProgress = (isOngoing || league.status === 'Completado') && progress.total > 0;

  return (
    <Card shadow="sm" padding="lg" radius="md" withBorder>
      <Stack gap="md">
        <Group justify="space-between" align="flex-start">
          <Group gap="sm" wrap="nowrap">
            <ThemeIcon size={50} radius="md" color="blue" variant="light">
              <IconTrophy size={28} />
            </ThemeIcon>
            <div>
              <Title order={2}>{league.name}</Title>
              <Group gap="xs" mt={4}>
                <LeagueStatusBadge status={league.status} />
                <Text size="sm" c="dimmed">
                  {`${bestOfLabel(league.setsToWin)} · ${league.doubleRound ? 'Ida y vuelta' : 'Una vuelta'}`}
                </Text>
              </Group>
            </div>
          </Group>

          <Group gap="xs">
            <IconCalendar size={16} stroke={1.5} color="var(--mantine-color-dimmed)" />
            <Text size="sm" c="dimmed">
              {formatDate(league.dateStart, { year: 'numeric', month: 'short', day: 'numeric' })}
            </Text>
          </Group>
        </Group>

        {showProgress && (
          <Text size="sm" c="dimmed">
            {progress.played} de {progress.total} partidos jugados
          </Text>
        )}

        {isAdmin && (isScheduled || isOngoing) && (
          <Stack gap="xs">
            <Group gap="sm">
              {isScheduled && (
                <Button color="green" disabled={!canStart} loading={acting} onClick={onStart}>
                  Iniciar Liga
                </Button>
              )}
              {isOngoing && (
                <Button color="orange" loading={acting} onClick={onFinish}>
                  Finalizar Liga
                </Button>
              )}
              <Button color="red" variant="light" disabled={acting} onClick={onCancel}>
                Cancelar Liga
              </Button>
              {isScheduled && (
                <Button color="red" variant="subtle" disabled={acting} onClick={onDelete}>
                  Eliminar
                </Button>
              )}
            </Group>
            {isScheduled && !canStart && (
              <Text size="sm" c="dimmed">
                Se necesitan al menos {MIN_LEAGUE_PLAYERS} jugadores confirmados para iniciar.
              </Text>
            )}
          </Stack>
        )}

        {!isAdmin && isScheduled && (
          <Stack gap="xs">
            {myStatus ? (
              <>
                <Text size="sm" c="dimmed">
                  {myStatus === 'Pendiente'
                    ? 'Tu inscripción está pendiente de confirmación.'
                    : 'Estás inscrito en esta liga.'}
                </Text>
                <div>
                  <Button color="red" variant="light" loading={acting} onClick={onUnregister}>
                    Darme de Baja
                  </Button>
                </div>
              </>
            ) : (
              <div>
                <Button color="green" loading={acting} onClick={onRegister}>
                  Inscribirme
                </Button>
              </div>
            )}
          </Stack>
        )}
      </Stack>
    </Card>
  );
};

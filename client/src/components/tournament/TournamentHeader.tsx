import { useNavigate } from 'react-router-dom';
import {
  Card,
  Title,
  Text,
  Group,
  Button,
  Badge,
  Stack,
  ActionIcon,
  Tooltip,
} from '@mantine/core';
import {
  IconArrowLeft,
  IconRocket,
  IconSettings,
  IconTrash,
  IconArrowsExchange,
  IconUsers,
} from '@tabler/icons-react';
import { APP_ROUTES } from '../../constants/routes';
import { KNOCKOUT_STAGES } from '../../types/tournament';
import type { Tournament, TournamentParticipant } from '../../types/tournament';

/**
 * TournamentHeader — Card de encabezado del detalle de torneo.
 *
 * Responsabilidad unica: renderizar el header visual (titulo, badges, botones
 * de admin/jugador) siguiendo la Regla de Oro del JSX (copia exacta del JSX
 * original de TorneoDetalles). Todo callback se pasa por props.
 *
 * Deletion test: borrar este componente elimina por completo el header visual
 * del detalle de torneo.
 */
export interface TournamentHeaderProps {
  tournament: Tournament;
  isAdmin: boolean;
  isPlayer: boolean;
  isEnrolled: boolean;
  isRegistering: boolean;
  isGenerating: boolean;
  confirmedPlayersCount: number;
  participants: TournamentParticipant[] | null;
  myParticipation: TournamentParticipant | null;
  onInscribirse: () => void;
  onGenerateTournament: () => void;
  onOpenEditFormat: () => void;
  onDeleteTournament: () => void;
  onOpenEnrollModal: () => void;
  onOpenSwapModal: () => void;
}

const getStatusColor = (status: string | null) => {
  if (!status) return 'gray';
  if (status === 'Programado') return 'blue';
  if (status === 'Completado') return 'green';
  if (status === 'Cancelado') return 'red';
  if (status === 'Grupos') return 'black';
  return 'orange';
};

export const TournamentHeader = ({
  tournament,
  isAdmin,
  isPlayer,
  isEnrolled,
  isRegistering,
  isGenerating,
  confirmedPlayersCount,
  participants,
  myParticipation,
  onInscribirse,
  onGenerateTournament,
  onOpenEditFormat,
  onDeleteTournament,
  onOpenEnrollModal,
  onOpenSwapModal,
}: TournamentHeaderProps) => {
  const navigate = useNavigate();

  const currentStatus = tournament.status || '';
  const isProgramado = currentStatus === 'Programado';
  const isGrupos = currentStatus === 'Grupos';
  const isKnockoutPhase = KNOCKOUT_STAGES.includes(currentStatus);

  const currentPlayers = tournament.participants || [];
  const plazasDisponibles = tournament.numPlayers - currentPlayers.length;
  const isFull = plazasDisponibles <= 0;

  return (
    <Stack gap="xl">
      <div>
        <Button
          variant="subtle"
          leftSection={<IconArrowLeft size={16} />}
          onClick={() => navigate(APP_ROUTES.TORNEOS.LIST)}
        >
          Volver a Torneos
        </Button>
      </div>

      <Card shadow="sm" padding="xl" radius="md" withBorder>
        <Group justify="space-between" align="flex-start">
          <div>
            <Title order={1}>{tournament.name}</Title>
            <Group mt="md" gap="xs">
              <Badge color={getStatusColor(currentStatus)} size="lg" variant="light">
                {currentStatus}
              </Badge>
              <Badge color="gray" size="lg" variant="outline">
                {tournament.typeTournament || 'Interno'}
              </Badge>
              <Badge color="grape" size="lg" variant="outline">
                {tournament.levelTournament || 'Mixto'}
              </Badge>
            </Group>
          </div>

          {(isProgramado || (isAdmin && (isGrupos || isKnockoutPhase))) && (
            <Stack align="flex-end" gap="xs">
              <Group>
                {isAdmin && (
                  <>
                    {/* BOTONES SOLO PARA FASE DE GRUPOS O ELIMINATORIAS */}
                    {(isGrupos || isKnockoutPhase) && (
                      <Button
                        color="violet"
                        variant="light"
                        size="md"
                        onClick={() => onOpenSwapModal()}
                        leftSection={<IconArrowsExchange size={18} />}
                      >
                        Intercambiar Jugadores
                      </Button>
                    )}

                    {/* BOTONES SOLO PARA ANTES DE EMPEZAR EL TORNEO */}
                    {isProgramado && (
                      <>
                        <Tooltip label="Eliminar este torneo">
                          <ActionIcon
                            color="red"
                            variant="light"
                            size="input-sm"
                            onClick={onDeleteTournament}
                          >
                            <IconTrash size={18} />
                          </ActionIcon>
                        </Tooltip>

                        <Button
                          color="gray"
                          variant="light"
                          size="md"
                          onClick={onOpenEditFormat}
                          leftSection={<IconSettings size={18} />}
                        >
                          Ajustar Formato
                        </Button>
                        <Button
                          color="blue"
                          variant="light"
                          size="md"
                          onClick={onOpenEnrollModal}
                          leftSection={<IconUsers size={18} />}
                          disabled={(participants?.length || 0) >= (tournament?.numPlayers || 0)}
                        >
                          Añadir Inscritos
                        </Button>
                        <Button
                          color={
                            confirmedPlayersCount < (tournament.numPlayers || 0) ? 'red' : 'orange'
                          }
                          size="md"
                          loading={isGenerating}
                          onClick={onGenerateTournament}
                          leftSection={<IconRocket size={18} />}
                        >
                          Iniciar Torneo
                        </Button>
                      </>
                    )}
                  </>
                )}

                {/* BOTONES DEL JUGADOR (Solo se ven antes de empezar) */}
                {isProgramado &&
                  isPlayer &&
                  (isEnrolled ? (
                    <Button
                      color={myParticipation?.status === 'Confirmado' ? 'green' : 'orange'}
                      size="md"
                      disabled
                    >
                      {myParticipation?.status === 'Confirmado'
                        ? 'Inscripción Confirmada'
                        : 'Inscripción Pendiente'}
                    </Button>
                  ) : (
                    <Button
                      color={isFull ? 'gray' : 'blue'}
                      size="md"
                      disabled={isFull}
                      loading={isRegistering}
                      onClick={onInscribirse}
                    >
                      {isFull ? 'Torneo Completo' : 'Inscribirme'}
                    </Button>
                  ))}
              </Group>

              {/* INFO DE PLAZAS (Solo antes de empezar) */}
              {isProgramado && (
                <Text size="xs" c="dimmed">
                  {plazasDisponibles > 0 ? `Quedan ${plazasDisponibles} plazas` : 'Lista de espera'}
                  {isAdmin && ` · Confirmados: ${confirmedPlayersCount}`}
                </Text>
              )}
            </Stack>
          )}
        </Group>
      </Card>
    </Stack>
  );
};

export default TournamentHeader;

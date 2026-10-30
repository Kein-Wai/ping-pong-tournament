import { useCallback, useMemo, useState } from 'react';
import { IconAlertTriangle, IconPlayerPlay, IconTrophy, IconTrash, IconUserMinus } from '@tabler/icons-react';
import { leaguesService } from '../api/services/leagues';
import { usersService } from '../api/services/users';
import { openAppConfirmModal } from '../utils/modals';
import type { ClubPlayer } from '../types/tournament';
import type { LeagueDetail } from '../types/league';

export interface UseLigaAccionesProps {
  league: LeagueDetail | null;
  /** Recarga la liga, su calendario y su clasificación tras una acción. */
  reload: () => Promise<void>;
  /** Se llama tras borrar la liga: la pantalla ya no existe. */
  onDeleted: () => void;
}

/**
 * useLigaAcciones — Acciones sobre una liga: ciclo de vida (iniciar, cancelar,
 * finalizar, borrar), inscripción del propio jugador y gestión de los
 * participantes por el administrador.
 *
 * Las acciones destructivas o irreversibles piden confirmación. Un error de la
 * API ya se notifica globalmente, así que aquí solo se registra.
 */
export const useLigaAcciones = ({ league, reload, onDeleted }: UseLigaAccionesProps) => {
  const [acting, setActing] = useState(false);
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [clubPlayers, setClubPlayers] = useState<ClubPlayer[]>([]);
  const [checkedToAdd, setCheckedToAdd] = useState<string[]>([]);

  const id = league?.id;

  /** Ejecuta una llamada a la API y recarga; deja `acting` consistente aunque falle. */
  const run = useCallback(
    async (call: () => Promise<unknown>, afterSuccess: () => Promise<void> | void = reload) => {
      setActing(true);
      try {
        await call();
        await afterSuccess();
      } catch (error) {
        console.error('Error en la acción de la liga:', error);
      } finally {
        setActing(false);
      }
    },
    [reload],
  );

  const handleStart = useCallback(() => {
    if (!id) return;
    openAppConfirmModal({
      title: 'Iniciar la liga',
      icon: <IconPlayerPlay size={18} />,
      color: 'green',
      description: 'Se generará el calendario con los jugadores confirmados.',
      highlightText: league?.name || '',
      warningText:
        'Las inscripciones pendientes se descartarán y ya no se podrán añadir ni quitar jugadores.',
      confirmLabel: 'Iniciar Liga',
      onConfirm: () => run(() => leaguesService.start(id)),
    });
  }, [id, league?.name, run]);

  const handleCancel = useCallback(() => {
    if (!id) return;
    openAppConfirmModal({
      title: 'Cancelar la liga',
      icon: <IconAlertTriangle size={18} />,
      color: 'red',
      description: 'Los partidos que queden por jugar se cancelarán.',
      highlightText: league?.name || '',
      warningText: 'Los resultados ya registrados se conservan. Esta acción no se puede deshacer.',
      confirmLabel: 'Cancelar Liga',
      onConfirm: () => run(() => leaguesService.cancel(id)),
    });
  }, [id, league?.name, run]);

  const handleFinish = useCallback(() => {
    if (!id) return;
    openAppConfirmModal({
      title: 'Finalizar la liga',
      icon: <IconTrophy size={18} />,
      color: 'orange',
      description: 'Se cerrará la liga y se guardará su clasificación final.',
      highlightText: league?.name || '',
      warningText:
        'Los partidos sin jugar se cancelarán y ya no se podrán cambiar los resultados.',
      confirmLabel: 'Finalizar Liga',
      onConfirm: () => run(() => leaguesService.finish(id)),
    });
  }, [id, league?.name, run]);

  const handleDelete = useCallback(() => {
    if (!id) return;
    openAppConfirmModal({
      title: 'Eliminar la liga',
      icon: <IconTrash size={18} />,
      color: 'red',
      description: 'Se borrará la liga y sus inscripciones.',
      highlightText: league?.name || '',
      warningText: 'Esta acción no se puede deshacer.',
      confirmLabel: 'Eliminar Liga',
      onConfirm: () => run(() => leaguesService.remove(id), onDeleted),
    });
  }, [id, league?.name, run, onDeleted]);

  const handleRegister = useCallback(() => {
    if (!id) return;
    openAppConfirmModal({
      title: 'Inscripción a la liga',
      icon: <IconTrophy size={18} />,
      color: 'green',
      description: '¿Confirmas que deseas inscribirte en esta liga?',
      highlightText: league?.name || '',
      warningText: 'Tu inscripción quedará pendiente hasta que el administrador la confirme.',
      confirmLabel: 'Confirmar e Inscribirme',
      onConfirm: () => run(() => leaguesService.register(id)),
    });
  }, [id, league?.name, run]);

  const handleUnregister = useCallback(() => {
    if (!id) return;
    openAppConfirmModal({
      title: 'Darte de baja',
      icon: <IconUserMinus size={18} />,
      color: 'red',
      description: '¿Seguro que quieres darte de baja de esta liga?',
      highlightText: league?.name || '',
      confirmLabel: 'Darme de Baja',
      onConfirm: () => run(() => leaguesService.unregister(id)),
    });
  }, [id, league?.name, run]);

  const handleConfirmParticipant = useCallback(
    async (playerId: string) => {
      if (!id) return;
      await run(() => leaguesService.updateParticipantStatus(id, playerId, 'Confirmado'));
    },
    [id, run],
  );

  const handleRemoveParticipant = useCallback(
    (playerId: string) => {
      if (!id) return;
      openAppConfirmModal({
        title: 'Quitar de la liga',
        icon: <IconUserMinus size={18} />,
        color: 'red',
        description: '¿Seguro que quieres quitar a este jugador de la liga?',
        highlightText: league?.name || '',
        confirmLabel: 'Quitar Jugador',
        onConfirm: () => run(() => leaguesService.removeParticipant(id, playerId)),
      });
    },
    [id, league?.name, run],
  );

  const handleWithdraw = useCallback(
    (playerId: string) => {
      if (!id) return;
      openAppConfirmModal({
        title: 'Retirar jugador',
        icon: <IconUserMinus size={18} />,
        color: 'red',
        description: 'El jugador abandona la liga y no volverá a jugar.',
        highlightText: league?.name || '',
        warningText:
          'Todos sus partidos pendientes se darán por perdidos (W.O.): su rival suma la victoria y el jugador pierde el ELO correspondiente.',
        confirmLabel: 'Retirar Jugador',
        onConfirm: () => run(() => leaguesService.withdrawParticipant(id, playerId)),
      });
    },
    [id, league?.name, run],
  );

  const handleOpenAddPlayers = useCallback(async () => {
    try {
      setClubPlayers(await usersService.list<ClubPlayer>());
      setCheckedToAdd([]);
      setAddModalOpen(true);
    } catch (error) {
      console.error(error);
    }
  }, []);

  const handleAddPlayers = useCallback(async () => {
    if (!id || checkedToAdd.length === 0) return;
    await run(
      () => leaguesService.addParticipants(id, checkedToAdd),
      async () => {
        setAddModalOpen(false);
        await reload();
      },
    );
  }, [id, checkedToAdd, run, reload]);

  /** Jugadores del club que todavía no figuran en la liga. */
  const availablePlayers = useMemo(() => {
    const inLeague = new Set(league?.participants.map((participant) => participant.playerId));
    return clubPlayers.filter((player) => !inLeague.has(player.id));
  }, [clubPlayers, league?.participants]);

  return {
    acting,
    handleStart,
    handleCancel,
    handleFinish,
    handleDelete,
    handleRegister,
    handleUnregister,
    handleConfirmParticipant,
    handleRemoveParticipant,
    handleWithdraw,
    addModalOpen,
    setAddModalOpen,
    availablePlayers,
    checkedToAdd,
    setCheckedToAdd,
    handleOpenAddPlayers,
    handleAddPlayers,
  };
};

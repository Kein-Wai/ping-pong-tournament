import { useCallback, useState } from 'react';
import { IconTrophy } from '@tabler/icons-react';
import { matchesService } from '../api/services/matches';
import { openAppConfirmModal } from '../utils/modals';
import { playerFullName } from '../utils/leagueView';
import type { MatchToEdit } from '../types/tournament';
import type { LeagueDetail, LeagueMatch } from '../types/league';

export interface UseLigaPartidoProps {
  league: LeagueDetail | null;
  matches: LeagueMatch[];
  isAdmin: boolean;
  /** Recarga la liga, su calendario y su clasificación tras guardar. */
  onMatchSaved: () => Promise<void>;
}

/**
 * useLigaPartido — Edición del resultado de un partido de liga.
 *
 * Mismo flujo que useTorneoPartido: abre el modal con el marcador actual y lo
 * guarda por /matches. Solo se edita en una liga Iniciada y no se tocan los
 * W.O. ni los partidos cancelados.
 */
export const useLigaPartido = ({ league, matches, isAdmin, onMatchSaved }: UseLigaPartidoProps) => {
  const [editMatch, setEditMatch] = useState<MatchToEdit | null>(null);
  const [submittingMatch, setSubmittingMatch] = useState(false);

  const openEditMatchModal = useCallback(
    (match: LeagueMatch) => {
      if (!isAdmin || league?.status !== 'Iniciado') return;
      if (match.walkover || match.status === 'Cancelado') return;

      setEditMatch({
        id: match.id,
        playerOneName: playerFullName(match.playerOne),
        playerTwoName: playerFullName(match.playerTwo),
        playerOneId: match.playerOneId,
        playerTwoId: match.playerTwoId,
        setsToWin: league.setsToWin,
        status: match.status || 'Programado',
        isKnockout: false,
        set1P1: match.setOnePlayerOne ?? 0,
        set1P2: match.setOnePlayerTwo ?? 0,
        set2P1: match.setTwoPlayerOne ?? 0,
        set2P2: match.setTwoPlayerTwo ?? 0,
        set3P1: match.setThreePlayerOne ?? 0,
        set3P2: match.setThreePlayerTwo ?? 0,
        set4P1: match.setFourPlayerOne ?? 0,
        set4P2: match.setFourPlayerTwo ?? 0,
        set5P1: match.setFivePlayerOne ?? 0,
        set5P2: match.setFivePlayerTwo ?? 0,
        set6P1: match.setSixPlayerOne ?? 0,
        set6P2: match.setSixPlayerTwo ?? 0,
        set7P1: match.setSevenPlayerOne ?? 0,
        set7P2: match.setSevenPlayerTwo ?? 0,
      });
    },
    [isAdmin, league],
  );

  const executeSaveMatch = useCallback(async () => {
    if (!editMatch) return;
    setSubmittingMatch(true);

    try {
      await matchesService.update(editMatch.id, {
        status: editMatch.status,
        setsToWin: editMatch.setsToWin,
        playerOneId: editMatch.playerOneId,
        playerTwoId: editMatch.playerTwoId,
        setOnePlayerOne: Number(editMatch.set1P1),
        setOnePlayerTwo: Number(editMatch.set1P2),
        setTwoPlayerOne: Number(editMatch.set2P1),
        setTwoPlayerTwo: Number(editMatch.set2P2),
        setThreePlayerOne: Number(editMatch.set3P1),
        setThreePlayerTwo: Number(editMatch.set3P2),
        setFourPlayerOne: Number(editMatch.set4P1),
        setFourPlayerTwo: Number(editMatch.set4P2),
        setFivePlayerOne: Number(editMatch.set5P1),
        setFivePlayerTwo: Number(editMatch.set5P2),
        setSixPlayerOne: Number(editMatch.set6P1),
        setSixPlayerTwo: Number(editMatch.set6P2),
        setSevenPlayerOne: Number(editMatch.set7P1),
        setSevenPlayerTwo: Number(editMatch.set7P2),
      });
      setEditMatch(null);
      await onMatchSaved();
    } catch (error) {
      console.error('Error al actualizar el partido:', error);
    } finally {
      setSubmittingMatch(false);
    }
  }, [editMatch, onMatchSaved]);

  const handleSaveMatch = useCallback(() => {
    if (!editMatch) return;

    // Es el último solo si, descontando el que se edita, no queda ninguno por completar.
    const othersPending = matches.filter(
      (match) =>
        match.id !== editMatch.id && match.status !== 'Completado' && match.status !== 'Cancelado',
    ).length;
    const isLastMatch = editMatch.status === 'Completado' && othersPending === 0;

    if (isLastMatch) {
      openAppConfirmModal({
        title: 'Último partido de la liga',
        icon: <IconTrophy size={18} />,
        color: 'orange',
        description: 'Estás a punto de completar el último partido pendiente de la liga.',
        highlightText: 'La liga se completará y su clasificación final quedará guardada',
        warningText:
          'Una vez cerrada la liga ya no se podrán cambiar sus resultados. Revisa bien el marcador.',
        confirmLabel: 'Completar y Cerrar Liga',
        onConfirm: executeSaveMatch,
      });
      return;
    }

    executeSaveMatch();
  }, [editMatch, matches, executeSaveMatch]);

  return { editMatch, setEditMatch, submittingMatch, openEditMatchModal, executeSaveMatch, handleSaveMatch };
};

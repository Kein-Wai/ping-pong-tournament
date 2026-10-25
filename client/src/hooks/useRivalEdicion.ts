import { useEffect, useState } from 'react';

import { manualMatchesService } from '../api/services/manualMatches';
import type { DominantHand, OpponentLevel, Playstyle, RubberType } from '../types/enums';
import type { TrackedMatch } from '../types/manualMatch';

/**
 * useRivalEdicion — Edición de los datos del rival.
 *
 * Gestiona el modal «Actualizar Datos del Rival». Arranca con los datos del partido
 * cargado (`loaded`) y, al guardar, actualiza el partido vivo con `setMatch`.
 *
 * Migration: extracción quirúrgica de los estados editOpp* y handleUpdateRival de
 * ManualMatchTracker.
 */
export interface UseRivalEdicionProps {
  id: string | undefined;
  match: TrackedMatch | null;
  setMatch: (match: TrackedMatch) => void;
  loaded: TrackedMatch | null;
}

export const useRivalEdicion = ({ id, match, setMatch, loaded }: UseRivalEdicionProps) => {
  const [editRivalModal, setEditRivalModal] = useState(false);
  const [editOppName, setEditOppName] = useState('');
  const [editOppHand, setEditOppHand] = useState<DominantHand | null>(null);
  const [editOppStyle, setEditOppStyle] = useState<Playstyle | null>(null);
  const [editOppLevel, setEditOppLevel] = useState<OpponentLevel | null>(null);
  const [editOppRubberForehand, setEditOppRubberForehand] = useState<RubberType | null>(null);
  const [editOppRubberBackhand, setEditOppRubberBackhand] = useState<RubberType | null>(null);

  useEffect(() => {
    if (!loaded) return;
    setEditOppName(loaded.opponentName);
    setEditOppHand(loaded.opponentHand || null);
    setEditOppStyle(loaded.opponentStyle || null);
    setEditOppLevel(loaded.opponentLevel || null);
    setEditOppRubberForehand(loaded.opponentRubberForehand || null);
    setEditOppRubberBackhand(loaded.opponentRubberBackhand || null);
  }, [loaded]);

  const handleUpdateRival = async () => {
    try {
      const payload = {
        opponentName: editOppName,
        opponentHand: editOppHand,
        opponentStyle: editOppStyle,
        opponentLevel: editOppLevel,
        opponentRubberForehand: editOppRubberForehand,
        opponentRubberBackhand: editOppRubberBackhand,
      };
      await manualMatchesService.update(id!, payload);
      setMatch({ ...match!, ...payload });
      setEditRivalModal(false);
    } catch (error) {
      console.error(error);
    }
  };

  return {
    editRivalModal,
    setEditRivalModal,
    editOppName,
    setEditOppName,
    editOppHand,
    setEditOppHand,
    editOppStyle,
    setEditOppStyle,
    editOppLevel,
    setEditOppLevel,
    editOppRubberForehand,
    editOppRubberBackhand,
    handleUpdateRival,
  };
};

import { useEffect, useState } from 'react';

import type { TrackedMatch } from '../types/manualMatch';
import { isValidTableTennisSet } from '../utils/matchValidation';

/**
 * useSetsPartido — Sets del partido y avisos de final de set y de partido.
 *
 * Lleva los sets ganados por cada lado (que el modo rápido también edita a mano) y los
 * modales del análisis profundo: fin de set (al llegar el marcador a un set válido), fin
 * de partido y resumen de un set anterior. `setCurrentSet` pasa al set siguiente y
 * `onUndoPoint` deshace el último punto desde el aviso de fin de set.
 *
 * Migration: extracción quirúrgica de handleConfirmSetEnd y los estados de modales de
 * ManualMatchTracker.
 */
export interface UseSetsPartidoProps {
  match: TrackedMatch | null;
  loaded: TrackedMatch | null;
  myScore: number;
  oppScore: number;
  currentSet: number;
  setCurrentSet: (set: number) => void;
  onUndoPoint: () => void;
}

export const useSetsPartido = ({
  match,
  loaded,
  myScore,
  oppScore,
  currentSet,
  setCurrentSet,
  onUndoPoint,
}: UseSetsPartidoProps) => {
  const [mySetsWon, setMySetsWon] = useState<number | string>(0);
  const [oppSetsWon, setOppSetsWon] = useState<number | string>(0);

  const [showEndSetModal, setShowEndSetModal] = useState(false);
  const [showEndMatchModal, setShowEndMatchModal] = useState(false);
  const [viewingSetSummary, setViewingSetSummary] = useState<number | null>(null);

  // Se ajusta durante el render (y no en un efecto) para que los sets ya estén al pintar
  // el partido cargado, sin un fotograma a cero.
  const [syncedFrom, setSyncedFrom] = useState<TrackedMatch | null>(null);
  if (loaded && loaded !== syncedFrom) {
    setSyncedFrom(loaded);
    setMySetsWon(loaded.mySets || 0);
    setOppSetsWon(loaded.opponentSets || 0);
  }

  useEffect(() => {
    if (isValidTableTennisSet(myScore, oppScore) && match?.status !== 'Completado') {
      setShowEndSetModal(true);
    }
  }, [myScore, oppScore, match]);

  const handleUndoFromEndSet = () => {
    setShowEndSetModal(false);
    onUndoPoint();
  };

  const handleConfirmSetEnd = () => {
    const iWonSet = myScore > oppScore;
    const newMySets = iWonSet ? Number(mySetsWon) + 1 : Number(mySetsWon);
    const newOppSets = !iWonSet ? Number(oppSetsWon) + 1 : Number(oppSetsWon);
    setMySetsWon(newMySets);
    setOppSetsWon(newOppSets);
    setShowEndSetModal(false);
    if (newMySets === (match!.setsToWin || 3) || newOppSets === (match!.setsToWin || 3))
      setShowEndMatchModal(true);
    else setCurrentSet(currentSet + 1);
  };

  return {
    mySetsWon,
    setMySetsWon,
    oppSetsWon,
    setOppSetsWon,
    showEndSetModal,
    showEndMatchModal,
    setShowEndMatchModal,
    viewingSetSummary,
    setViewingSetSummary,
    handleUndoFromEndSet,
    handleConfirmSetEnd,
  };
};

import { useEffect, useState } from 'react';
import { notifications } from '@mantine/notifications';

import { manualMatchesService } from '../api/services/manualMatches';
import type { QuickSetScore, TrackedMatch } from '../types/manualMatch';
import {
  buildQuickNotes,
  findInvalidQuickSet,
  resizeSetScores,
  toSetScorePayload,
} from '../utils/manual-match';

/**
 * useCierrePartido — Conclusiones y cierre del partido.
 *
 * En el análisis rápido lleva el formulario (tanteo de cada set, habilidades que fueron
 * fortaleza o fallo y sus detalles); en el profundo, las conclusiones del aviso final.
 * `executeCompleteMatch` valida los tanteos, envía el resultado y marca el partido como
 * completado; `setShowEndMatchModal` cierra el aviso final.
 *
 * Migration: extracción quirúrgica de executeCompleteMatch y del estado del formulario
 * rápido de ManualMatchTracker.
 */
export interface UseCierrePartidoProps {
  id: string | undefined;
  match: TrackedMatch | null;
  setMatch: (match: TrackedMatch) => void;
  loaded: TrackedMatch | null;
  mySetsWon: number | string;
  oppSetsWon: number | string;
  setShowEndMatchModal: (open: boolean) => void;
}

export const useCierrePartido = ({
  id,
  match,
  setMatch,
  loaded,
  mySetsWon,
  oppSetsWon,
  setShowEndMatchModal,
}: UseCierrePartidoProps) => {
  const [strChecked, setStrChecked] = useState<string[]>([]);
  const [strDetails, setStrDetails] = useState('');
  const [weakChecked, setWeakChecked] = useState<string[]>([]);
  const [weakDetails, setWeakDetails] = useState('');

  const [deepNotes, setDeepNotes] = useState('');

  // Estados para el Modo Rápido (Tanteos)
  const [setScores, setSetScores] = useState<QuickSetScore[]>([]);

  const totalSetsPlayed = Number(mySetsWon) + Number(oppSetsWon);

  useEffect(() => {
    setSetScores((prev) => resizeSetScores(prev, totalSetsPlayed));
  }, [totalSetsPlayed]);

  useEffect(() => {
    if (loaded?.analysisType === 'Extenso' && loaded.lightNotes) {
      setDeepNotes(loaded.lightNotes);
    }
  }, [loaded]);

  const handleScoreChange = (
    index: number,
    field: 'myScore' | 'oppScore',
    value: number | string,
  ) => {
    const updated = [...setScores];
    updated[index] = { ...updated[index], [field]: value };
    setSetScores(updated);
  };

  const toggleStrength = (skill: string, isChecked: boolean) =>
    setStrChecked((prev) => (isChecked ? [...prev, skill] : prev.filter((s) => s !== skill)));

  const toggleWeakness = (skill: string, isChecked: boolean) =>
    setWeakChecked((prev) => (isChecked ? [...prev, skill] : prev.filter((s) => s !== skill)));

  const executeCompleteMatch = async () => {
    let finalNotes = deepNotes;
    let finalSetScores = undefined;

    if (match!.analysisType === 'Rapido') {
      // 1. REGLA DEL PING PONG EN CLIENTE
      const invalid = findInvalidQuickSet(setScores);
      if (invalid) {
        return notifications.show({
          title: 'Marcador Inválido',
          message: `El resultado del Set ${invalid.index + 1} (${invalid.myScore}-${invalid.oppScore}) es imposible en tenis de mesa. Corrígelo.`,
          color: 'red',
        });
      }

      finalNotes = buildQuickNotes({
        strengths: strChecked,
        strDetails,
        weaknesses: weakChecked,
        weakDetails,
      });

      finalSetScores = toSetScorePayload(setScores);
    }

    try {
      await manualMatchesService.complete(id!, {
        mySets: Number(mySetsWon),
        opponentSets: Number(oppSetsWon),
        lightNotes: finalNotes,
        setScores: finalSetScores,
      });
      setMatch({
        ...match!,
        status: 'Completado',
        mySets: Number(mySetsWon),
        opponentSets: Number(oppSetsWon),
        lightNotes: finalNotes,
        // Sin esto el reporte inmediato no muestra los tanteos hasta recargar el partido.
        setScores: finalSetScores ?? match!.setScores,
      });
      setShowEndMatchModal(false);
    } catch (error) {
      console.error(error);
    }
  };

  return {
    totalSetsPlayed,
    setScores,
    handleScoreChange,
    strChecked,
    toggleStrength,
    strDetails,
    setStrDetails,
    weakChecked,
    toggleWeakness,
    weakDetails,
    setWeakDetails,
    deepNotes,
    setDeepNotes,
    executeCompleteMatch,
  };
};

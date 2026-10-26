import { useEffect, useState } from 'react';

import { manualMatchesService } from '../api/services/manualMatches';
import type { AnalysisType } from '../types/enums';
import type { TrackedMatch } from '../types/manualMatch';
import { parsePlanningNotes } from '../utils/manual-match';

/**
 * usePlanificacionPartido — Planificación previa y arranque del partido.
 *
 * Lleva las tres notas del plan (mi saque, su saque, estrategia) y el tipo de análisis
 * con el que se empieza. Arranca con lo guardado en el partido cargado (`loaded`).
 * `onSaved` avisa a la pantalla de que el plan se guardó, para que vuelva a la lista.
 *
 * Migration: extracción quirúrgica de handleSavePlan / handleStartMatchNow de
 * ManualMatchTracker.
 */
export interface UsePlanificacionPartidoProps {
  id: string | undefined;
  match: TrackedMatch | null;
  setMatch: (match: TrackedMatch) => void;
  loaded: TrackedMatch | null;
  onSaved: () => void;
}

export const usePlanificacionPartido = ({
  id,
  match,
  setMatch,
  loaded,
  onSaved,
}: UsePlanificacionPartidoProps) => {
  const [planMyServe, setPlanMyServe] = useState('');
  const [planTheirServe, setPlanTheirServe] = useState('');
  const [planStrategy, setPlanStrategy] = useState('');
  const [savingPlan, setSavingPlan] = useState(false);
  // Selección de tipo de análisis para el botón de Start
  const [startAnalysisType, setStartAnalysisType] = useState<AnalysisType>('Rapido');

  useEffect(() => {
    if (!loaded) return;
    setStartAnalysisType(loaded.analysisType || 'Rapido');

    if (loaded.planningNotes) {
      const parsed = parsePlanningNotes(loaded.planningNotes);
      if (parsed) {
        setPlanMyServe(parsed.myServe || '');
        setPlanTheirServe(parsed.theirServe || '');
        setPlanStrategy(parsed.strategy || '');
      } else {
        setPlanStrategy(loaded.planningNotes);
      }
    }
  }, [loaded]);

  const handleSavePlan = async () => {
    setSavingPlan(true);
    const planJSON = JSON.stringify({
      myServe: planMyServe,
      theirServe: planTheirServe,
      strategy: planStrategy,
    });
    try {
      await manualMatchesService.update(id!, { planningNotes: planJSON });
      setMatch({ ...match!, planningNotes: planJSON });
      onSaved();
    } catch (error) {
      console.error(error);
    } finally {
      setSavingPlan(false);
    }
  };

  const handleStartMatchNow = async () => {
    try {
      await manualMatchesService.update(id!, {
        status: 'Iniciado',
        analysisType: startAnalysisType,
      });
      setMatch({ ...match!, status: 'Iniciado', analysisType: startAnalysisType });
    } catch (error) {
      console.error(error);
    }
  };

  return {
    planMyServe,
    setPlanMyServe,
    planTheirServe,
    setPlanTheirServe,
    planStrategy,
    setPlanStrategy,
    savingPlan,
    startAnalysisType,
    setStartAnalysisType,
    handleSavePlan,
    handleStartMatchNow,
  };
};

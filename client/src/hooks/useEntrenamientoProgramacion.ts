import { useState } from 'react';

import { generalTrainingsService } from '../api/services/generalTrainings';

/**
 * useEntrenamientoProgramacion — Programación de sesiones en un rango de fechas.
 *
 * Gestiona el modal «Programar Fechas»: descripción, rango, horario base y las
 * habilidades que se entrenarán. `refetch` recarga la planificación tras agendar.
 *
 * Migration: extracción quirúrgica de handleCreateTraining de EntrenamientosGenerales.
 */
export interface UseEntrenamientoProgramacionProps {
  refetch: () => void | Promise<void>;
}

export const useEntrenamientoProgramacion = ({ refetch }: UseEntrenamientoProgramacionProps) => {
  const [trainingModalOpen, setTrainingModalOpen] = useState(false);
  const [trainDesc, setTrainDesc] = useState('');
  const [trainDates, setTrainDates] = useState<[Date | null, Date | null]>([null, null]);
  const [trainScheduleId, setTrainScheduleId] = useState<string | null>(null);
  const [trainSkills, setTrainSkills] = useState<Record<string, boolean>>({});

  const handleCreateTraining = async () => {
    if (!trainDates[0] || !trainDates[1] || !trainScheduleId) return;
    try {
      await generalTrainingsService.create({
        description: trainDesc,
        startDate: new Date(trainDates[0]).toISOString(),
        endDate: new Date(trainDates[1]).toISOString(),
        scheduleId: trainScheduleId,
        skillsToTrain: trainSkills,
      });
      setTrainingModalOpen(false);
      refetch();
    } catch {
      // El interceptor de api/axios ya notifica el error.
    }
  };

  const toggleSkill = (key: string) => setTrainSkills((prev) => ({ ...prev, [key]: !prev[key] }));

  return {
    trainingModalOpen,
    setTrainingModalOpen,
    trainDesc,
    setTrainDesc,
    trainDates,
    setTrainDates,
    trainScheduleId,
    setTrainScheduleId,
    trainSkills,
    toggleSkill,
    handleCreateTraining,
  };
};

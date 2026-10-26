import { useState } from 'react';

import type { GeneralTrainingSchedule } from '../types/api';
import type { ProgramDetails, TrainingSession } from '../types/generalTraining';
import {
  getMonthGrid,
  getProgramDetails,
  getScheduleColor as colorOfSchedule,
  getSessionsOnDay,
  shiftMonth,
} from '../utils/general-trainings';

/**
 * useEntrenamientoCalendario — Navegación del calendario de sesiones.
 *
 * Lleva el mes que se muestra, el modal con las sesiones de un día (punto de entrada
 * para pasar lista) y el de detalles del programa al que pertenece una sesión.
 *
 * Migration: extracción quirúrgica de la lógica del calendario, handleDayClick y
 * handleViewProgram de EntrenamientosGenerales.
 */
export interface UseEntrenamientoCalendarioProps {
  trainings: TrainingSession[];
  schedules: GeneralTrainingSchedule[];
}

export const useEntrenamientoCalendario = ({
  trainings,
  schedules,
}: UseEntrenamientoCalendarioProps) => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [dayModalOpen, setDayModalOpen] = useState(false);
  const [selectedDayTrainings, setSelectedDayTrainings] = useState<TrainingSession[]>([]);
  const [selectedDateForModal, setSelectedDateForModal] = useState<Date | null>(null);
  const [programModalOpen, setProgramModalOpen] = useState(false);
  const [programDetails, setProgramDetails] = useState<ProgramDetails | null>(null);

  const getScheduleColor = (scheduleId?: string | null) => colorOfSchedule(schedules, scheduleId);

  const { blanks, days } = getMonthGrid(currentDate);

  const prevMonth = () => setCurrentDate(shiftMonth(currentDate, -1));
  const nextMonth = () => setCurrentDate(shiftMonth(currentDate, 1));

  const handleDayClick = (dayNumber: number) => {
    const clickedDate = new Date(currentDate.getFullYear(), currentDate.getMonth(), dayNumber);

    setSelectedDateForModal(clickedDate);
    setSelectedDayTrainings(getSessionsOnDay(trainings, clickedDate));
    setDayModalOpen(true);
  };

  const handleViewProgram = (training: TrainingSession) => {
    const details = getProgramDetails(trainings, training);
    if (!details) return;

    setProgramDetails(details);
    setProgramModalOpen(true);
  };

  return {
    currentDate,
    blanks,
    days,
    prevMonth,
    nextMonth,
    getScheduleColor,
    dayModalOpen,
    setDayModalOpen,
    selectedDayTrainings,
    selectedDateForModal,
    handleDayClick,
    programModalOpen,
    setProgramModalOpen,
    programDetails,
    handleViewProgram,
  };
};

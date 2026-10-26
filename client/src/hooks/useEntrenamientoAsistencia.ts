import { useState } from 'react';

import { generalTrainingsService } from '../api/services/generalTrainings';
import type { User } from '../types/api';
import type { TrainingSession } from '../types/generalTraining';
import { getAttendedPlayers, toggleInList } from '../utils/general-trainings';

/**
 * useEntrenamientoAsistencia — Asistencia a las sesiones.
 *
 * Gestiona el modal «Lista de Asistencia» (marcar jugadores, filtrarlos por nivel y
 * sincronizar con la sesión) y el de «Jugadores que asistieron». `onOpenAttendance`
 * avisa a la pantalla de que se abrió la lista, para que cierre el modal del día, y
 * `refetch` recarga la planificación tras sincronizar.
 *
 * Migration: extracción quirúrgica de openViewAttendees / openAttendanceModal /
 * handleSaveAttendance de EntrenamientosGenerales.
 */
export interface UseEntrenamientoAsistenciaProps {
  players: User[];
  refetch: () => void | Promise<void>;
  onOpenAttendance: () => void;
}

export const useEntrenamientoAsistencia = ({
  players,
  refetch,
  onOpenAttendance,
}: UseEntrenamientoAsistenciaProps) => {
  const [viewAttendeesModalOpen, setViewAttendeesModalOpen] = useState(false);
  const [selectedAttendees, setSelectedAttendees] = useState<User[]>([]);
  const [attendanceModalOpen, setAttendanceModalOpen] = useState(false);
  const [selectedTrainingId, setSelectedTrainingId] = useState<string | null>(null);
  const [levelFilter, setLevelFilter] = useState<string | null>(null);
  const [checkedPlayers, setCheckedPlayers] = useState<string[]>([]);
  const [savingAttendance, setSavingAttendance] = useState(false);

  const openViewAttendees = (training: TrainingSession) => {
    setSelectedAttendees(getAttendedPlayers(training, players));
    setViewAttendeesModalOpen(true);
  };

  const openAttendanceModal = (training: TrainingSession) => {
    setSelectedTrainingId(training.id);
    setLevelFilter(null);
    const attendedIds = training.attendances?.map((a) => a.playerId) || [];
    setCheckedPlayers(attendedIds);
    onOpenAttendance();
    setAttendanceModalOpen(true);
  };

  const handleSaveAttendance = async () => {
    if (!selectedTrainingId) return;
    setSavingAttendance(true);
    try {
      await generalTrainingsService.bulkAttendance(selectedTrainingId, {
        playerIds: checkedPlayers,
      });
      setAttendanceModalOpen(false);
      refetch();
    } catch {
      // El interceptor de api/axios ya notifica el error.
    } finally {
      setSavingAttendance(false);
    }
  };

  const togglePlayer = (id: string) => setCheckedPlayers((prev) => toggleInList(prev, id));

  const filteredPlayers = players.filter((p) => !levelFilter || p.level === levelFilter);

  return {
    viewAttendeesModalOpen,
    setViewAttendeesModalOpen,
    selectedAttendees,
    attendanceModalOpen,
    setAttendanceModalOpen,
    levelFilter,
    setLevelFilter,
    checkedPlayers,
    savingAttendance,
    filteredPlayers,
    openViewAttendees,
    openAttendanceModal,
    handleSaveAttendance,
    togglePlayer,
  };
};

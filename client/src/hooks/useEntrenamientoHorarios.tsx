import { useState } from 'react';
import { IconTrash } from '@tabler/icons-react';

import { generalTrainingsService } from '../api/services/generalTrainings';
import type { GeneralTrainingSchedule } from '../types/api';
import { toggleInList } from '../utils/general-trainings';
import { openAppConfirmModal } from '../utils/modals';

/**
 * useEntrenamientoHorarios — Gestión de los horarios fijos del club.
 *
 * Gestiona el modal «Crear Horario Base» (alta y edición) y el borrado de un
 * horario con confirmación. `refetch` recarga la planificación tras cada cambio.
 *
 * Migration: extracción quirúrgica de handleOpenScheduleModal / handleSaveSchedule /
 * handleDeleteSchedule de EntrenamientosGenerales.
 */
export interface UseEntrenamientoHorariosProps {
  refetch: () => void | Promise<void>;
}

export const useEntrenamientoHorarios = ({ refetch }: UseEntrenamientoHorariosProps) => {
  const [scheduleModalOpen, setScheduleModalOpen] = useState(false);
  const [editingScheduleId, setEditingScheduleId] = useState<string | null>(null);
  const [schedName, setSchedName] = useState('');
  const [schedStart, setSchedStart] = useState('17:00');
  const [schedEnd, setSchedEnd] = useState('19:00');
  const [schedDays, setSchedDays] = useState<number[]>([]);

  const handleOpenScheduleModal = (sch?: GeneralTrainingSchedule) => {
    if (sch) {
      setEditingScheduleId(sch.id);
      setSchedName(sch.name);
      setSchedStart(sch.startTime);
      setSchedEnd(sch.endTime);
      setSchedDays(sch.daysOfWeek);
    } else {
      setEditingScheduleId(null);
      setSchedName('');
      setSchedStart('17:00');
      setSchedEnd('19:00');
      setSchedDays([]);
    }
    setScheduleModalOpen(true);
  };

  const handleSaveSchedule = async () => {
    try {
      const payload = {
        name: schedName,
        startTime: schedStart,
        endTime: schedEnd,
        daysOfWeek: schedDays,
      };

      if (editingScheduleId) {
        await generalTrainingsService.updateSchedule(editingScheduleId, payload);
      } else {
        await generalTrainingsService.createSchedule(payload);
      }

      setScheduleModalOpen(false);
      setSchedDays([]);
      refetch();
    } catch {
      // El interceptor de api/axios ya notifica el error.
    }
  };

  const handleDeleteSchedule = (id: string, name: string) => {
    openAppConfirmModal({
      title: 'Eliminar Horario Base',
      icon: <IconTrash size={18} />,
      color: 'red',
      description:
        '¿Estás seguro de que deseas eliminar este horario? Las sesiones de entrenamiento que ya estén programadas en el calendario conservarán su asistencia y el progreso de los jugadores de forma intacta.',
      highlightText: name,
      confirmLabel: 'Sí, Eliminar',
      onConfirm: async () => {
        try {
          await generalTrainingsService.deleteSchedule(id);
          refetch();
        } catch {
          // El interceptor de api/axios ya notifica el error.
        }
      },
    });
  };

  const toggleSchedDay = (d: number) => setSchedDays((prev) => toggleInList(prev, d));

  return {
    scheduleModalOpen,
    setScheduleModalOpen,
    schedName,
    setSchedName,
    schedStart,
    setSchedStart,
    schedEnd,
    setSchedEnd,
    schedDays,
    toggleSchedDay,
    handleOpenScheduleModal,
    handleSaveSchedule,
    handleDeleteSchedule,
  };
};

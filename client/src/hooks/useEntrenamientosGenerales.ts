import { useCallback, useEffect, useState } from 'react';

import { generalTrainingsService } from '../api/services/generalTrainings';
import { usersService } from '../api/services/users';
import type { GeneralTrainingSchedule, User } from '../types/api';
import type { TrainingSession } from '../types/generalTraining';

/**
 * useEntrenamientosGenerales — Carga de la planificación del club.
 *
 * Trae los horarios fijos, las sesiones programadas y los jugadores aprobados (los
 * únicos que pueden constar en una lista de asistencia). `refetch` lo recargan las
 * acciones de la pantalla al terminar, y cada recarga pasa por `loading`.
 *
 * Migration: extracción quirúrgica de fetchData de EntrenamientosGenerales.
 */
export const useEntrenamientosGenerales = () => {
  const [loading, setLoading] = useState(true);
  const [schedules, setSchedules] = useState<GeneralTrainingSchedule[]>([]);
  const [trainings, setTrainings] = useState<TrainingSession[]>([]);
  const [players, setPlayers] = useState<User[]>([]);

  const refetch = useCallback(async () => {
    setLoading(true);
    try {
      const [schedRes, trainRes, members] = await Promise.all([
        generalTrainingsService.schedules(),
        generalTrainingsService.list<TrainingSession>(),
        usersService.list(),
      ]);
      setSchedules(schedRes);
      setTrainings(trainRes);
      setPlayers(members.filter((m) => m.clubStatus === 'Aprobado'));
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refetch();
  }, [refetch]);

  return { loading, schedules, trainings, players, refetch };
};

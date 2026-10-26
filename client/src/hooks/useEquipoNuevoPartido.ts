import { useState } from 'react';

import { teamsService } from '../api/services/teams';

/**
 * useEquipoNuevoPartido — Alta de un partido en el calendario del equipo.
 *
 * Gestiona el modal «Programar Partido de Liga»: el formulario (rival, fecha,
 * localía y lugar) y su guardado. `refetch` recarga el equipo tras guardar.
 *
 * Migration: extracción quirúrgica del formulario de partido nuevo y de
 * handleSaveMatch de EquipoDetalles. Como antes, el formulario no se vacía al
 * guardar.
 */
export interface UseEquipoNuevoPartidoProps {
  id: string | undefined;
  refetch: () => void | Promise<void>;
}

export const useEquipoNuevoPartido = ({ id, refetch }: UseEquipoNuevoPartidoProps) => {
  const [saving, setSaving] = useState(false);
  const [matchModalOpen, setMatchModalOpen] = useState(false);
  const [rivalName, setRivalName] = useState('');
  const [matchDate, setMatchDate] = useState<Date | null>(new Date());
  const [isHome, setIsHome] = useState(true);
  const [location, setLocation] = useState('');

  const handleSaveMatch = async () => {
    if (!matchDate) return;
    setSaving(true);
    try {
      await teamsService.createMatch(id!, {
        rivalName,
        date: matchDate.toISOString(),
        isHome,
        location,
      });
      setMatchModalOpen(false);
      refetch();
    } catch {
      // El interceptor de api/axios ya avisa al usuario del error.
    } finally {
      setSaving(false);
    }
  };

  return {
    saving,
    matchModalOpen,
    setMatchModalOpen,
    rivalName,
    setRivalName,
    matchDate,
    setMatchDate,
    isHome,
    setIsHome,
    location,
    setLocation,
    handleSaveMatch,
  };
};

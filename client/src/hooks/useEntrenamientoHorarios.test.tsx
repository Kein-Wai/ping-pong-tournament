import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { api } from '../api/axios';
import { ENDPOINTS } from '../api/endpoints';
import type { GeneralTrainingSchedule } from '../types/api';
import { openAppConfirmModal } from '../utils/modals';
import { useEntrenamientoHorarios } from './useEntrenamientoHorarios';

// Se mockea el `api` de bajo nivel (la frontera del sistema) y no los servicios,
// para que estos tests sigan valiendo cuando el acceso a datos cambie de capa.
vi.mock('../api/axios', () => ({
  api: {
    post: vi.fn(),
    put: vi.fn(),
    delete: vi.fn(),
  },
}));
// El modal de confirmación es UI: se captura lo que se le pide y se invoca onConfirm a mano.
vi.mock('../utils/modals', () => ({
  openAppConfirmModal: vi.fn(),
}));

const envelope = <T,>(data: T) => ({ data: { success: true, data } });

const ADULTOS: GeneralTrainingSchedule = {
  id: 's1',
  name: 'Clase Adultos',
  startTime: '16:00',
  endTime: '18:30',
  daysOfWeek: [1, 3],
};

describe('useEntrenamientoHorarios', () => {
  const refetch = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(api.post).mockResolvedValue(envelope({}) as never);
    vi.mocked(api.put).mockResolvedValue(envelope({}) as never);
    vi.mocked(api.delete).mockResolvedValue(envelope({}) as never);
  });

  it('empieza cerrado con el formulario vacío y las horas por defecto', () => {
    const { result } = renderHook(() => useEntrenamientoHorarios({ refetch }));

    expect(result.current.scheduleModalOpen).toBe(false);
    expect(result.current.schedName).toBe('');
    expect(result.current.schedStart).toBe('17:00');
    expect(result.current.schedEnd).toBe('19:00');
    expect(result.current.schedDays).toEqual([]);
  });

  describe('abrir el formulario', () => {
    it('sin horario abre un formulario vacío', () => {
      const { result } = renderHook(() => useEntrenamientoHorarios({ refetch }));

      act(() => result.current.handleOpenScheduleModal());

      expect(result.current.scheduleModalOpen).toBe(true);
      expect(result.current.schedName).toBe('');
      expect(result.current.schedDays).toEqual([]);
    });

    it('con un horario carga sus datos para editarlo', () => {
      const { result } = renderHook(() => useEntrenamientoHorarios({ refetch }));

      act(() => result.current.handleOpenScheduleModal(ADULTOS));

      expect(result.current.schedName).toBe('Clase Adultos');
      expect(result.current.schedStart).toBe('16:00');
      expect(result.current.schedEnd).toBe('18:30');
      expect(result.current.schedDays).toEqual([1, 3]);
    });

    it('tras editar, abrir sin horario vuelve a un formulario vacío y en modo alta', async () => {
      const { result } = renderHook(() => useEntrenamientoHorarios({ refetch }));
      act(() => result.current.handleOpenScheduleModal(ADULTOS));
      act(() => result.current.handleOpenScheduleModal());

      expect(result.current.schedName).toBe('');
      expect(result.current.schedStart).toBe('17:00');
      act(() => result.current.toggleSchedDay(2));
      await act(async () => {
        await result.current.handleSaveSchedule();
      });
      expect(api.post).toHaveBeenCalledTimes(1);
      expect(api.put).not.toHaveBeenCalled();
    });
  });

  describe('días de la semana', () => {
    it('alterna cada día sin repetirlo', () => {
      const { result } = renderHook(() => useEntrenamientoHorarios({ refetch }));

      act(() => result.current.toggleSchedDay(2));
      act(() => result.current.toggleSchedDay(5));
      expect(result.current.schedDays).toEqual([2, 5]);

      act(() => result.current.toggleSchedDay(2));
      expect(result.current.schedDays).toEqual([5]);
    });
  });

  describe('guardar', () => {
    it('un horario nuevo se crea, cierra el formulario, vacía los días y recarga', async () => {
      const { result } = renderHook(() => useEntrenamientoHorarios({ refetch }));
      act(() => result.current.handleOpenScheduleModal());
      act(() => {
        result.current.setSchedName('Clase Pro');
        result.current.toggleSchedDay(2);
      });

      await act(async () => {
        await result.current.handleSaveSchedule();
      });

      expect(api.post).toHaveBeenCalledWith(
        ENDPOINTS.GENERAL_TRAININGS.SCHEDULES,
        { name: 'Clase Pro', startTime: '17:00', endTime: '19:00', daysOfWeek: [2] },
        undefined,
      );
      expect(result.current.scheduleModalOpen).toBe(false);
      expect(result.current.schedDays).toEqual([]);
      expect(refetch).toHaveBeenCalledTimes(1);
    });

    it('un horario existente se actualiza con PUT sobre su id', async () => {
      const { result } = renderHook(() => useEntrenamientoHorarios({ refetch }));
      act(() => result.current.handleOpenScheduleModal(ADULTOS));
      act(() => result.current.setSchedName('Clase Adultos B'));

      await act(async () => {
        await result.current.handleSaveSchedule();
      });

      expect(api.put).toHaveBeenCalledWith(
        ENDPOINTS.GENERAL_TRAININGS.SCHEDULE_BY_ID('s1'),
        { name: 'Clase Adultos B', startTime: '16:00', endTime: '18:30', daysOfWeek: [1, 3] },
        undefined,
      );
      expect(api.post).not.toHaveBeenCalled();
    });

    it('si falla deja el formulario abierto y no recarga', async () => {
      vi.mocked(api.post).mockRejectedValue(new Error('rechazado'));
      const { result } = renderHook(() => useEntrenamientoHorarios({ refetch }));
      act(() => result.current.handleOpenScheduleModal());

      await act(async () => {
        await result.current.handleSaveSchedule();
      });

      expect(result.current.scheduleModalOpen).toBe(true);
      expect(refetch).not.toHaveBeenCalled();
    });
  });

  describe('eliminar', () => {
    it('pide confirmación con el nombre del horario y no borra todavía', () => {
      const { result } = renderHook(() => useEntrenamientoHorarios({ refetch }));

      act(() => result.current.handleDeleteSchedule('s1', 'Clase Adultos'));

      expect(openAppConfirmModal).toHaveBeenCalledWith(
        expect.objectContaining({
          title: 'Eliminar Horario Base',
          highlightText: 'Clase Adultos',
          confirmLabel: 'Sí, Eliminar',
        }),
      );
      expect(api.delete).not.toHaveBeenCalled();
    });

    it('al confirmar borra el horario y recarga', async () => {
      const { result } = renderHook(() => useEntrenamientoHorarios({ refetch }));
      act(() => result.current.handleDeleteSchedule('s1', 'Clase Adultos'));
      const { onConfirm } = vi.mocked(openAppConfirmModal).mock.calls[0][0];

      await act(async () => {
        await onConfirm();
      });

      expect(api.delete).toHaveBeenCalledWith(
        ENDPOINTS.GENERAL_TRAININGS.SCHEDULE_BY_ID('s1'),
        undefined,
      );
      await waitFor(() => expect(refetch).toHaveBeenCalledTimes(1));
    });

    it('si falla al confirmar no recarga', async () => {
      vi.mocked(api.delete).mockRejectedValue(new Error('rechazado'));
      const { result } = renderHook(() => useEntrenamientoHorarios({ refetch }));
      act(() => result.current.handleDeleteSchedule('s1', 'Clase Adultos'));
      const { onConfirm } = vi.mocked(openAppConfirmModal).mock.calls[0][0];

      await act(async () => {
        await onConfirm();
      });

      expect(refetch).not.toHaveBeenCalled();
    });
  });
});

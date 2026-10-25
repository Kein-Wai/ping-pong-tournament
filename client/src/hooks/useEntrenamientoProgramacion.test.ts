import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { api } from '../api/axios';
import { ENDPOINTS } from '../api/endpoints';
import { useEntrenamientoProgramacion } from './useEntrenamientoProgramacion';

// Se mockea el `api` de bajo nivel (la frontera del sistema) y no los servicios,
// para que estos tests sigan valiendo cuando el acceso a datos cambie de capa.
vi.mock('../api/axios', () => ({
  api: {
    post: vi.fn(),
  },
}));

const envelope = <T,>(data: T) => ({ data: { success: true, data } });

const START = new Date('2026-10-20T00:00:00.000Z');
const END = new Date('2026-10-22T00:00:00.000Z');

describe('useEntrenamientoProgramacion', () => {
  const refetch = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(api.post).mockResolvedValue(envelope({}) as never);
  });

  it('empieza cerrado, sin fechas, horario ni habilidades', () => {
    const { result } = renderHook(() => useEntrenamientoProgramacion({ refetch }));

    expect(result.current.trainingModalOpen).toBe(false);
    expect(result.current.trainDesc).toBe('');
    expect(result.current.trainDates).toEqual([null, null]);
    expect(result.current.trainScheduleId).toBeNull();
    expect(result.current.trainSkills).toEqual({});
  });

  it('marcar una habilidad la activa y volver a marcarla la desactiva', () => {
    const { result } = renderHook(() => useEntrenamientoProgramacion({ refetch }));

    act(() => result.current.toggleSkill('servicio'));
    expect(result.current.trainSkills).toEqual({ servicio: true });

    act(() => result.current.toggleSkill('servicio'));
    expect(result.current.trainSkills).toEqual({ servicio: false });
  });

  describe('agendar', () => {
    const fill = (result: { current: ReturnType<typeof useEntrenamientoProgramacion> }) => {
      act(() => {
        result.current.setTrainingModalOpen(true);
        result.current.setTrainDesc('Semana de Saques');
        result.current.setTrainDates([START, END]);
        result.current.setTrainScheduleId('s1');
        result.current.toggleSkill('servicio');
        result.current.toggleSkill('corte');
      });
    };

    it('envía descripción, fechas en ISO, horario y habilidades; cierra el modal y recarga', async () => {
      const { result } = renderHook(() => useEntrenamientoProgramacion({ refetch }));
      fill(result);

      await act(async () => {
        await result.current.handleCreateTraining();
      });

      expect(api.post).toHaveBeenCalledWith(
        ENDPOINTS.GENERAL_TRAININGS.BASE,
        {
          description: 'Semana de Saques',
          startDate: '2026-10-20T00:00:00.000Z',
          endDate: '2026-10-22T00:00:00.000Z',
          scheduleId: 's1',
          skillsToTrain: { servicio: true, corte: true },
        },
        undefined,
      );
      expect(result.current.trainingModalOpen).toBe(false);
      expect(refetch).toHaveBeenCalledTimes(1);
    });

    it.each([
      ['sin fecha de inicio', () => ({ dates: [null, END] as [Date | null, Date | null], id: 's1' })],
      ['sin fecha de fin', () => ({ dates: [START, null] as [Date | null, Date | null], id: 's1' })],
      ['sin horario', () => ({ dates: [START, END] as [Date | null, Date | null], id: null })],
    ])('%s no envía nada', async (_name, build) => {
      const { dates, id } = build();
      const { result } = renderHook(() => useEntrenamientoProgramacion({ refetch }));
      act(() => {
        result.current.setTrainDates(dates);
        result.current.setTrainScheduleId(id);
      });

      await act(async () => {
        await result.current.handleCreateTraining();
      });

      expect(api.post).not.toHaveBeenCalled();
    });

    it('si falla deja el modal abierto y no recarga', async () => {
      vi.mocked(api.post).mockRejectedValue(new Error('rechazado'));
      const { result } = renderHook(() => useEntrenamientoProgramacion({ refetch }));
      fill(result);

      await act(async () => {
        await result.current.handleCreateTraining();
      });

      expect(result.current.trainingModalOpen).toBe(true);
      expect(refetch).not.toHaveBeenCalled();
    });
  });
});

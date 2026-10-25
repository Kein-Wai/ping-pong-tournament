import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { api } from '../api/axios';
import { ENDPOINTS } from '../api/endpoints';
import type { User } from '../types/api';
import type { TrainingSession } from '../types/generalTraining';
import { useEntrenamientoAsistencia } from './useEntrenamientoAsistencia';

// Se mockea el `api` de bajo nivel (la frontera del sistema) y no los servicios,
// para que estos tests sigan valiendo cuando el acceso a datos cambie de capa.
vi.mock('../api/axios', () => ({
  api: {
    put: vi.fn(),
  },
}));

const envelope = <T,>(data: T) => ({ data: { success: true, data } });

const PLAYERS = [
  { id: 'p1', name: 'Ana', level: 'Avanzado' },
  { id: 'p2', name: 'Luis', level: 'Principiante' },
  { id: 'p3', name: 'Marta', level: 'Avanzado' },
] as User[];

const TRAINING: TrainingSession = {
  id: 't1',
  date: '2026-10-05T17:00:00.000Z',
  attendances: [
    { playerId: 'p1', attended: true },
    { playerId: 'p2', attended: false },
  ],
};

describe('useEntrenamientoAsistencia', () => {
  const refetch = vi.fn();
  const onOpenAttendance = vi.fn();
  const setup = () =>
    renderHook(() => useEntrenamientoAsistencia({ players: PLAYERS, refetch, onOpenAttendance }));

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(api.put).mockResolvedValue(envelope({}) as never);
  });

  it('empieza con los dos modales cerrados y sin nadie marcado', () => {
    const { result } = setup();

    expect(result.current.attendanceModalOpen).toBe(false);
    expect(result.current.viewAttendeesModalOpen).toBe(false);
    expect(result.current.checkedPlayers).toEqual([]);
    expect(result.current.filteredPlayers).toEqual(PLAYERS);
  });

  describe('lista de asistencia', () => {
    it('abrirla marca a todos los que constan en la sesión (también con attended false), quita el filtro y avisa', () => {
      const { result } = setup();
      act(() => result.current.setLevelFilter('Avanzado'));

      act(() => result.current.openAttendanceModal(TRAINING));

      expect(result.current.attendanceModalOpen).toBe(true);
      expect(result.current.checkedPlayers).toEqual(['p1', 'p2']);
      expect(result.current.levelFilter).toBeNull();
      expect(onOpenAttendance).toHaveBeenCalledTimes(1);
    });

    it('pinchar a un jugador lo marca y volver a pinchar lo desmarca', () => {
      const { result } = setup();

      act(() => result.current.togglePlayer('p3'));
      expect(result.current.checkedPlayers).toEqual(['p3']);

      act(() => result.current.togglePlayer('p3'));
      expect(result.current.checkedPlayers).toEqual([]);
    });

    it('el filtro de nivel deja solo a los jugadores de ese nivel', () => {
      const { result } = setup();

      act(() => result.current.setLevelFilter('Avanzado'));

      expect(result.current.filteredPlayers.map((p) => p.id)).toEqual(['p1', 'p3']);
    });

    it('sincronizar envía los marcados, cierra la lista y recarga', async () => {
      const { result } = setup();
      act(() => result.current.openAttendanceModal(TRAINING));
      act(() => result.current.togglePlayer('p2'));

      await act(async () => {
        await result.current.handleSaveAttendance();
      });

      expect(api.put).toHaveBeenCalledWith(
        ENDPOINTS.GENERAL_TRAININGS.BULK_ATTENDANCE('t1'),
        { playerIds: ['p1'] },
        undefined,
      );
      expect(result.current.attendanceModalOpen).toBe(false);
      expect(result.current.savingAttendance).toBe(false);
      expect(refetch).toHaveBeenCalledTimes(1);
    });

    it('sin sesión elegida no envía nada', async () => {
      const { result } = setup();

      await act(async () => {
        await result.current.handleSaveAttendance();
      });

      expect(api.put).not.toHaveBeenCalled();
    });

    it('si falla deja la lista abierta, no recarga y deja de guardar', async () => {
      vi.mocked(api.put).mockRejectedValue(new Error('rechazado'));
      const { result } = setup();
      act(() => result.current.openAttendanceModal(TRAINING));

      await act(async () => {
        await result.current.handleSaveAttendance();
      });

      expect(result.current.attendanceModalOpen).toBe(true);
      expect(result.current.savingAttendance).toBe(false);
      expect(refetch).not.toHaveBeenCalled();
    });
  });

  describe('ver asistentes', () => {
    it('abre el modal con los jugadores que asistieron', () => {
      const { result } = setup();

      act(() => result.current.openViewAttendees(TRAINING));

      expect(result.current.viewAttendeesModalOpen).toBe(true);
      expect(result.current.selectedAttendees.map((p) => p.id)).toEqual(['p1']);
    });
  });
});

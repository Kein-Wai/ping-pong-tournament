import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { api } from '../api/axios';
import { ENDPOINTS } from '../api/endpoints';
import { openAppConfirmModal } from '../utils/modals';
import type { TeamMatch } from '../types/api';
import { useEquipoPartido } from './useEquipoPartido';

// Se mockean las fronteras del sistema: la API de bajo nivel y los modales de confirmación.
vi.mock('../api/axios', () => ({
  api: {
    put: vi.fn(),
    post: vi.fn(),
    delete: vi.fn(),
  },
}));

vi.mock('../utils/modals', () => ({
  openAppConfirmModal: vi.fn(),
}));

const COMPLETED = {
  id: 'm3',
  rivalName: 'Club Este',
  date: '2026-10-01T18:00:00.000Z',
  isHome: true,
  location: null,
  status: 'Completado',
  ourScore: 6,
  rivalScore: 4,
} as unknown as TeamMatch;

const PENDING = {
  ...COMPLETED,
  id: 'm1',
  location: 'Pabellón Norte',
  status: 'Programado',
  ourScore: null,
  rivalScore: null,
} as unknown as TeamMatch;

const setup = () => {
  const refetch = vi.fn();
  const hook = renderHook(() => useEquipoPartido({ refetch }));
  return { ...hook, refetch };
};

describe('useEquipoPartido', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(api.put).mockResolvedValue({ data: { success: true } } as never);
    vi.mocked(api.post).mockResolvedValue({ data: { success: true } } as never);
    vi.mocked(api.delete).mockResolvedValue({ data: { success: true } } as never);
  });

  describe('abrir el modal', () => {
    it('arranca cerrado y sin partido seleccionado', () => {
      const { result } = setup();

      expect(result.current.editMatchModalOpen).toBe(false);
      expect(result.current.selectedMatch).toBeNull();
      expect(result.current.saving).toBe(false);
    });

    it('openEditMatchModal carga los datos de un partido jugado', () => {
      const { result } = setup();

      act(() => {
        result.current.openEditMatchModal(COMPLETED);
      });

      expect(result.current.editMatchModalOpen).toBe(true);
      expect(result.current.selectedMatch).toBe(COMPLETED);
      expect(result.current.editStatus).toBe('Completado');
      expect(result.current.ourScore).toBe(6);
      expect(result.current.rivalScore).toBe(4);
      expect(result.current.editRivalName).toBe('Club Este');
      expect(result.current.editDate?.toISOString()).toBe('2026-10-01T18:00:00.000Z');
      expect(result.current.editIsHome).toBe(true);
      expect(result.current.editLocation).toBe('');
    });

    it('un partido sin marcador deja los puntos vacíos y conserva el lugar', () => {
      const { result } = setup();

      act(() => {
        result.current.openEditMatchModal(PENDING);
      });

      expect(result.current.ourScore).toBe('');
      expect(result.current.rivalScore).toBe('');
      expect(result.current.editLocation).toBe('Pabellón Norte');
    });
  });

  describe('handleUpdateMatchResult', () => {
    it('envía el resultado, cierra el modal y recarga', async () => {
      const { result, refetch } = setup();
      act(() => {
        result.current.openEditMatchModal(COMPLETED);
      });
      act(() => {
        result.current.setOurScore(7);
      });

      await act(async () => {
        await result.current.handleUpdateMatchResult();
      });

      expect(api.put).toHaveBeenCalledWith(
        ENDPOINTS.TEAMS.UPDATE_MATCH('m3'),
        {
          status: 'Completado',
          ourScore: 7,
          rivalScore: 4,
          rivalName: 'Club Este',
          date: '2026-10-01T18:00:00.000Z',
          isHome: true,
          location: '',
        },
        undefined,
      );
      expect(result.current.editMatchModalOpen).toBe(false);
      expect(result.current.saving).toBe(false);
      expect(refetch).toHaveBeenCalledTimes(1);
    });

    it('si el estado no es «Completado» los marcadores viajan como null', async () => {
      const { result } = setup();
      act(() => {
        result.current.openEditMatchModal(COMPLETED);
      });
      act(() => {
        result.current.setEditStatus('Cancelado');
      });

      await act(async () => {
        await result.current.handleUpdateMatchResult();
      });

      expect(vi.mocked(api.put).mock.calls[0][1]).toMatchObject({
        status: 'Cancelado',
        ourScore: null,
        rivalScore: null,
      });
    });

    it('sin partido seleccionado o sin fecha no hace nada', async () => {
      const { result } = setup();

      await act(async () => {
        await result.current.handleUpdateMatchResult();
      });
      act(() => {
        result.current.openEditMatchModal(COMPLETED);
      });
      act(() => {
        result.current.setEditDate(null);
      });
      await act(async () => {
        await result.current.handleUpdateMatchResult();
      });

      expect(api.put).not.toHaveBeenCalled();
    });

    it('si el guardado falla el modal sigue abierto y no recarga', async () => {
      vi.spyOn(console, 'error').mockImplementation(() => undefined);
      vi.mocked(api.put).mockRejectedValue(new Error('400'));
      const { result, refetch } = setup();
      act(() => {
        result.current.openEditMatchModal(COMPLETED);
      });

      await act(async () => {
        await result.current.handleUpdateMatchResult();
      });

      expect(result.current.editMatchModalOpen).toBe(true);
      expect(result.current.saving).toBe(false);
      expect(refetch).not.toHaveBeenCalled();
    });
  });

  describe('handleDeleteMatch', () => {
    const confirmConfig = () =>
      vi.mocked(openAppConfirmModal).mock.calls[0][0] as unknown as {
        title: string;
        confirmLabel: string;
        onConfirm: () => Promise<void>;
      };

    it('pide confirmación antes de borrar', () => {
      const { result } = setup();

      act(() => {
        result.current.handleDeleteMatch('m3');
      });

      expect(confirmConfig()).toMatchObject({
        title: 'Eliminar Partido',
        confirmLabel: 'Sí, Eliminar Partido',
      });
      expect(api.delete).not.toHaveBeenCalled();
    });

    it('al confirmar borra el partido, recarga y cierra el modal de edición', async () => {
      const { result, refetch } = setup();
      act(() => {
        result.current.openEditMatchModal(COMPLETED);
        result.current.handleDeleteMatch('m3');
      });

      await act(async () => {
        await confirmConfig().onConfirm();
      });

      expect(api.delete).toHaveBeenCalledWith(ENDPOINTS.TEAMS.DELETE_MATCH('m3'), undefined);
      expect(refetch).toHaveBeenCalledTimes(1);
      expect(result.current.editMatchModalOpen).toBe(false);
    });

    it('si el borrado falla no recarga ni cierra el modal', async () => {
      vi.spyOn(console, 'error').mockImplementation(() => undefined);
      vi.mocked(api.delete).mockRejectedValue(new Error('500'));
      const { result, refetch } = setup();
      act(() => {
        result.current.openEditMatchModal(COMPLETED);
        result.current.handleDeleteMatch('m3');
      });

      await act(async () => {
        await confirmConfig().onConfirm();
      });

      expect(refetch).not.toHaveBeenCalled();
      expect(result.current.editMatchModalOpen).toBe(true);
    });
  });

  describe('handleToggleAttendance', () => {
    it('confirma o cancela la asistencia y recarga', async () => {
      const { result, refetch } = setup();

      await act(async () => {
        await result.current.handleToggleAttendance('m1');
      });

      expect(api.post).toHaveBeenCalledWith(
        ENDPOINTS.TEAMS.TOGGLE_AVAILABILITY('m1'),
        undefined,
        undefined,
      );
      expect(refetch).toHaveBeenCalledTimes(1);
    });

    it('si falla no recarga', async () => {
      vi.spyOn(console, 'error').mockImplementation(() => undefined);
      vi.mocked(api.post).mockRejectedValue(new Error('500'));
      const { result, refetch } = setup();

      await act(async () => {
        await result.current.handleToggleAttendance('m1');
      });

      expect(refetch).not.toHaveBeenCalled();
    });
  });
});

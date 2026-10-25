import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { api } from '../api/axios';
import { ENDPOINTS } from '../api/endpoints';
import { openAppConfirmModal } from '../utils/modals';
import type { ClubTeam } from '../types/api';
import { useEquipoInfo } from './useEquipoInfo';

// Se mockean las fronteras del sistema: la API de bajo nivel y los modales de confirmación.
vi.mock('../api/axios', () => ({
  api: {
    put: vi.fn(),
    delete: vi.fn(),
  },
}));

vi.mock('../utils/modals', () => ({
  openAppConfirmModal: vi.fn(),
}));

const TEAM = {
  id: 't1',
  name: 'Equipo A',
  category: '1ª Autonómica',
  level: 'Intermedio',
  players: [],
  matches: [],
} as unknown as ClubTeam;

const setup = () => {
  const refetch = vi.fn();
  const onTeamDeleted = vi.fn();
  const hook = renderHook(() => useEquipoInfo({ id: 't1', team: TEAM, refetch, onTeamDeleted }));
  return { ...hook, refetch, onTeamDeleted };
};

const openAndFill = (result: ReturnType<typeof setup>['result']) => {
  act(() => {
    result.current.handleOpenEditTeam();
  });
};

describe('useEquipoInfo', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(api.put).mockResolvedValue({ data: { success: true } } as never);
    vi.mocked(api.delete).mockResolvedValue({ data: { success: true } } as never);
  });

  describe('editar la información', () => {
    it('arranca con el modal cerrado y los campos vacíos', () => {
      const { result } = setup();

      expect(result.current.editTeamModalOpen).toBe(false);
      expect(result.current.editTeamName).toBe('');
      expect(result.current.editTeamCategory).toBe('');
      expect(result.current.editTeamLevel).toBe('');
      expect(result.current.saving).toBe(false);
    });

    it('handleOpenEditTeam carga los datos del equipo y abre el modal', () => {
      const { result } = setup();

      openAndFill(result);

      expect(result.current.editTeamModalOpen).toBe(true);
      expect(result.current.editTeamName).toBe('Equipo A');
      expect(result.current.editTeamCategory).toBe('1ª Autonómica');
      expect(result.current.editTeamLevel).toBe('Intermedio');
    });

    it('handleUpdateTeam guarda los cambios, cierra el modal y recarga', async () => {
      const { result, refetch } = setup();
      openAndFill(result);
      act(() => {
        result.current.setEditTeamName('Equipo B');
        result.current.setEditTeamLevel('Avanzado');
      });

      await act(async () => {
        await result.current.handleUpdateTeam();
      });

      expect(api.put).toHaveBeenCalledWith(
        ENDPOINTS.TEAMS.UPDATE('t1'),
        { name: 'Equipo B', category: '1ª Autonómica', level: 'Avanzado' },
        undefined,
      );
      expect(result.current.editTeamModalOpen).toBe(false);
      expect(result.current.saving).toBe(false);
      expect(refetch).toHaveBeenCalledTimes(1);
    });

    it('handleUpdateTeam no hace nada si falta nombre, categoría o nivel', async () => {
      const { result } = setup();
      openAndFill(result);
      act(() => {
        result.current.setEditTeamName('');
      });

      await act(async () => {
        await result.current.handleUpdateTeam();
      });

      expect(api.put).not.toHaveBeenCalled();
    });

    it('si el guardado falla el modal sigue abierto y no recarga', async () => {
      vi.spyOn(console, 'error').mockImplementation(() => undefined);
      vi.mocked(api.put).mockRejectedValue(new Error('400'));
      const { result, refetch } = setup();
      openAndFill(result);

      await act(async () => {
        await result.current.handleUpdateTeam();
      });

      expect(result.current.editTeamModalOpen).toBe(true);
      expect(result.current.saving).toBe(false);
      expect(refetch).not.toHaveBeenCalled();
    });
  });

  describe('eliminar el equipo', () => {
    const confirmConfig = () =>
      vi.mocked(openAppConfirmModal).mock.calls[0][0] as unknown as {
        title: string;
        highlightText: string;
        confirmLabel: string;
        onConfirm: () => Promise<void>;
      };

    it('pide confirmación mostrando el nombre del equipo', () => {
      const { result } = setup();

      act(() => {
        result.current.handleDeleteTeam();
      });

      expect(confirmConfig()).toMatchObject({
        title: 'Eliminar Equipo',
        highlightText: 'Equipo A',
        confirmLabel: 'Sí, Eliminar Equipo',
      });
      expect(api.delete).not.toHaveBeenCalled();
    });

    it('al confirmar borra el equipo y avisa a la pantalla', async () => {
      const { result, onTeamDeleted } = setup();
      act(() => {
        result.current.handleDeleteTeam();
      });

      await act(async () => {
        await confirmConfig().onConfirm();
      });

      expect(api.delete).toHaveBeenCalledWith(ENDPOINTS.TEAMS.DELETE('t1'), undefined);
      expect(onTeamDeleted).toHaveBeenCalledTimes(1);
    });

    it('si el borrado falla no avisa a la pantalla', async () => {
      vi.spyOn(console, 'error').mockImplementation(() => undefined);
      vi.mocked(api.delete).mockRejectedValue(new Error('500'));
      const { result, onTeamDeleted } = setup();
      act(() => {
        result.current.handleDeleteTeam();
      });

      await act(async () => {
        await confirmConfig().onConfirm();
      });

      expect(onTeamDeleted).not.toHaveBeenCalled();
    });
  });
});

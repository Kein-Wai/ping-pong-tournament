import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { api } from '../api/axios';
import { ENDPOINTS } from '../api/endpoints';
import { openAppConfirmModal } from '../utils/modals';
import type { PlayerProfile } from '../types/playerProfile';
import { useJugadorAdministracion } from './useJugadorAdministracion';

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

const PLAYER = { id: 'p1', name: 'Luis', surname: 'Pérez', clubId: 'club-1' } as PlayerProfile;

type Config = {
  title: string;
  highlightText: string;
  confirmLabel: string;
  onConfirm: () => Promise<void>;
};
const confirmConfig = () => vi.mocked(openAppConfirmModal).mock.calls[0][0] as unknown as Config;

const setup = (player: PlayerProfile | null = PLAYER) => {
  const refetch = vi.fn().mockResolvedValue(undefined);
  const onKicked = vi.fn();
  const hook = renderHook(() => useJugadorAdministracion({ player, refetch, onKicked }));
  return { ...hook, refetch, onKicked };
};

describe('useJugadorAdministracion', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(api.put).mockResolvedValue({ data: { success: true } } as never);
    vi.mocked(api.delete).mockResolvedValue({ data: { success: true } } as never);
  });

  describe('handleKickPlayer', () => {
    it('pide confirmación mostrando el nombre del jugador', () => {
      const { result } = setup();

      act(() => {
        result.current.handleKickPlayer();
      });

      expect(confirmConfig()).toMatchObject({
        title: 'Dar de baja del club',
        highlightText: 'Luis Pérez',
        confirmLabel: 'Sí, dar de baja',
      });
      expect(api.put).not.toHaveBeenCalled();
    });

    it('al confirmar rechaza al jugador en su club y avisa a la pantalla', async () => {
      const { result, onKicked } = setup();
      act(() => {
        result.current.handleKickPlayer();
      });

      await act(async () => {
        await confirmConfig().onConfirm();
      });

      expect(api.put).toHaveBeenCalledWith(
        ENDPOINTS.CLUBS.MEMBER_STATUS('club-1', 'p1'),
        { status: 'Rechazado' },
        undefined,
      );
      expect(onKicked).toHaveBeenCalledTimes(1);
    });

    it('si falla no avisa a la pantalla', async () => {
      vi.mocked(api.put).mockRejectedValue(new Error('500'));
      const { result, onKicked } = setup();
      act(() => {
        result.current.handleKickPlayer();
      });

      await act(async () => {
        await confirmConfig().onConfirm();
      });

      expect(onKicked).not.toHaveBeenCalled();
    });
  });

  describe('handleDeletePlan', () => {
    it('pide confirmación antes de borrar', () => {
      const { result } = setup();

      act(() => {
        result.current.handleDeletePlan('plan1');
      });

      expect(confirmConfig()).toMatchObject({
        title: 'Eliminar Plan de Entrenamiento',
        confirmLabel: 'Sí, eliminar plan',
      });
      expect(api.delete).not.toHaveBeenCalled();
    });

    it('al confirmar borra el plan y recarga el perfil', async () => {
      const { result, refetch } = setup();
      act(() => {
        result.current.handleDeletePlan('plan1');
      });

      await act(async () => {
        await confirmConfig().onConfirm();
      });

      expect(api.delete).toHaveBeenCalledWith(ENDPOINTS.TRAININGS.DELETE_PLAN('plan1'), undefined);
      expect(refetch).toHaveBeenCalledTimes(1);
    });

    it('si falla no recarga', async () => {
      vi.mocked(api.delete).mockRejectedValue(new Error('500'));
      const { result, refetch } = setup();
      act(() => {
        result.current.handleDeletePlan('plan1');
      });

      await act(async () => {
        await confirmConfig().onConfirm();
      });

      expect(refetch).not.toHaveBeenCalled();
    });
  });
});

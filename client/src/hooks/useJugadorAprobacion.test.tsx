import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { api } from '../api/axios';
import { ENDPOINTS } from '../api/endpoints';
import type { PlayerListItem } from '../types/players';
import { EMPTY_SKILL_INPUTS } from '../utils/players';
import { openAppConfirmModal } from '../utils/modals';
import { useJugadorAprobacion } from './useJugadorAprobacion';

// Se mockea el `api` de bajo nivel (la frontera del sistema) y no los servicios,
// para que estos tests sigan valiendo cuando el acceso a datos cambie de capa.
vi.mock('../api/axios', () => ({
  api: {
    put: vi.fn(),
  },
}));
// El modal de confirmación es UI: se captura lo que se le pide y se invoca onConfirm a mano.
vi.mock('../utils/modals', () => ({
  openAppConfirmModal: vi.fn(),
}));

const envelope = <T,>(data: T) => ({ data: { success: true, data } });

const skillsAll = (value: number) =>
  Object.fromEntries(Object.keys(EMPTY_SKILL_INPUTS).map((key) => [key, value]));

const PEDRO: PlayerListItem = {
  id: 'p3',
  email: 'pedro@test.com',
  name: 'Pedro',
  clubId: 'club-9',
  clubStatus: 'Pendiente',
};
const ANA: PlayerListItem = {
  ...PEDRO,
  id: 'p4',
  name: 'Ana',
  stats: { elo: 900, matchWon: 1, matchLost: 1, setWon: 2, setLost: 2 },
};

describe('useJugadorAprobacion', () => {
  const refetch = vi.fn();
  const setup = (overrides: { isSuperAdmin?: boolean; clubId?: string | null } = {}) =>
    renderHook(() =>
      useJugadorAprobacion({
        players: [PEDRO, ANA],
        clubId: 'club-1',
        isSuperAdmin: false,
        refetch,
        ...overrides,
      }),
    );

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(api.put).mockResolvedValue(envelope({}) as never);
  });

  it('empieza cerrado, sin nivel y con las habilidades vacías', () => {
    const { result } = setup();

    expect(result.current.approveModal).toEqual({ opened: false, player: null });
    expect(result.current.playerLevel).toBeNull();
    expect(result.current.startingElo).toBe(500);
    expect(result.current.skills).toEqual(EMPTY_SKILL_INPUTS);
  });

  describe('aprobar', () => {
    it('abre el modal con el jugador y propone 500 si no tiene ELO', () => {
      const { result } = setup();

      act(() => result.current.handleProcessRequest('p3', 'Pedro', 'Aprobado'));

      expect(result.current.approveModal).toEqual({ opened: true, player: PEDRO });
      expect(result.current.startingElo).toBe(500);
    });

    it('propone el ELO que ya tiene el jugador', () => {
      const { result } = setup();

      act(() => result.current.handleProcessRequest('p4', 'Ana', 'Aprobado'));

      expect(result.current.startingElo).toBe(900);
    });

    it('sin club no hace nada', () => {
      const { result } = setup({ clubId: null });

      act(() => result.current.handleProcessRequest('p3', 'Pedro', 'Aprobado'));

      expect(result.current.approveModal.opened).toBe(false);
    });

    it('confirmar envía nivel, ELO y habilidades con el valor base del nivel', async () => {
      const { result } = setup();
      act(() => result.current.handleProcessRequest('p3', 'Pedro', 'Aprobado'));
      act(() => {
        result.current.setPlayerLevel('Intermedio');
        result.current.setStartingElo('700');
      });

      await act(async () => {
        await result.current.handleConfirmApproval();
      });

      expect(api.put).toHaveBeenCalledWith(
        ENDPOINTS.CLUBS.MEMBER_STATUS('club-1', 'p3'),
        { status: 'Aprobado', level: 'Intermedio', elo: 700, skills: skillsAll(40) },
        undefined,
      );
    });

    it('confirmar cierra el modal, vacía nivel y habilidades, recarga y avisa a las notificaciones', async () => {
      const onRefresh = vi.fn();
      window.addEventListener('refresh-notifications', onRefresh);
      const { result } = setup();
      act(() => result.current.handleProcessRequest('p3', 'Pedro', 'Aprobado'));
      act(() => {
        result.current.setPlayerLevel('Avanzado');
        result.current.setSkills({ ...EMPTY_SKILL_INPUTS, servicio: 90 });
      });

      await act(async () => {
        await result.current.handleConfirmApproval();
      });

      expect(result.current.approveModal).toEqual({ opened: false, player: null });
      expect(result.current.playerLevel).toBeNull();
      expect(result.current.skills).toEqual(EMPTY_SKILL_INPUTS);
      expect(result.current.approving).toBe(false);
      expect(refetch).toHaveBeenCalledTimes(1);
      expect(onRefresh).toHaveBeenCalledTimes(1);
      window.removeEventListener('refresh-notifications', onRefresh);
    });

    it('un SuperAdmin aprueba con el club del propio jugador', async () => {
      const { result } = setup({ isSuperAdmin: true, clubId: null });
      act(() => result.current.handleProcessRequest('p3', 'Pedro', 'Aprobado'));
      act(() => result.current.setPlayerLevel('Iniciacion'));

      await act(async () => {
        await result.current.handleConfirmApproval();
      });

      expect(api.put).toHaveBeenCalledWith(
        ENDPOINTS.CLUBS.MEMBER_STATUS('club-9', 'p3'),
        expect.anything(),
        undefined,
      );
    });

    it('sin nivel elegido no envía nada', async () => {
      const { result } = setup();
      act(() => result.current.handleProcessRequest('p3', 'Pedro', 'Aprobado'));

      await act(async () => {
        await result.current.handleConfirmApproval();
      });

      expect(api.put).not.toHaveBeenCalled();
    });

    it('si falla deja el modal abierto, no recarga y deja de aprobar', async () => {
      vi.mocked(api.put).mockRejectedValue(new Error('rechazado'));
      const { result } = setup();
      act(() => result.current.handleProcessRequest('p3', 'Pedro', 'Aprobado'));
      act(() => result.current.setPlayerLevel('Intermedio'));

      await act(async () => {
        await result.current.handleConfirmApproval();
      });

      expect(result.current.approveModal.opened).toBe(true);
      expect(result.current.approving).toBe(false);
      expect(refetch).not.toHaveBeenCalled();
    });

    it('cerrar el modal vacía jugador y nivel', () => {
      const { result } = setup();
      act(() => result.current.handleProcessRequest('p3', 'Pedro', 'Aprobado'));
      act(() => result.current.setPlayerLevel('Intermedio'));

      act(() => result.current.closeApproveModal());

      expect(result.current.approveModal).toEqual({ opened: false, player: null });
      expect(result.current.playerLevel).toBeNull();
    });
  });

  describe('rechazar', () => {
    const reject = () => {
      const view = setup();
      act(() => view.result.current.handleProcessRequest('p3', 'Pedro Ruiz', 'Rechazado'));
      return view;
    };

    it('pide confirmación con el nombre del jugador y no envía nada todavía', () => {
      reject();

      expect(openAppConfirmModal).toHaveBeenCalledWith(
        expect.objectContaining({
          title: 'Rechazar Solicitud',
          highlightText: 'Pedro Ruiz',
          confirmLabel: 'Rechazar Solicitud',
        }),
      );
      expect(api.put).not.toHaveBeenCalled();
    });

    it('al confirmar envía el rechazo, recarga y avisa a las notificaciones', async () => {
      const onRefresh = vi.fn();
      window.addEventListener('refresh-notifications', onRefresh);
      reject();
      const { onConfirm } = vi.mocked(openAppConfirmModal).mock.calls[0][0];

      await act(async () => {
        await onConfirm();
      });

      expect(api.put).toHaveBeenCalledWith(
        ENDPOINTS.CLUBS.MEMBER_STATUS('club-1', 'p3'),
        { status: 'Rechazado' },
        undefined,
      );
      expect(refetch).toHaveBeenCalledTimes(1);
      expect(onRefresh).toHaveBeenCalledTimes(1);
      window.removeEventListener('refresh-notifications', onRefresh);
    });

    it('sin club no pide confirmación', () => {
      const { result } = setup({ clubId: null });

      act(() => result.current.handleProcessRequest('p3', 'Pedro', 'Rechazado'));

      expect(openAppConfirmModal).not.toHaveBeenCalled();
    });

    it('si falla al confirmar no recarga', async () => {
      vi.mocked(api.put).mockRejectedValue(new Error('rechazado'));
      reject();
      const { onConfirm } = vi.mocked(openAppConfirmModal).mock.calls[0][0];

      await act(async () => {
        await onConfirm();
      });

      expect(refetch).not.toHaveBeenCalled();
    });
  });
});

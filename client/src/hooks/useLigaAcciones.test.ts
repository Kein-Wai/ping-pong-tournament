import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { api } from '../api/axios';
import { ENDPOINTS } from '../api/endpoints';
import { openAppConfirmModal } from '../utils/modals';
import { useLigaAcciones } from './useLigaAcciones';
import type { LeagueDetail } from '../types/league';

vi.mock('../api/axios', () => ({
  api: { get: vi.fn(), post: vi.fn(), put: vi.fn(), delete: vi.fn() },
}));
vi.mock('../utils/modals', () => ({ openAppConfirmModal: vi.fn() }));

const ok = { data: { success: true, data: {} } } as never;

const league = (overrides: Partial<LeagueDetail> = {}): LeagueDetail =>
  ({
    id: 'l1',
    name: 'Liga de invierno',
    status: 'Programado',
    participants: [{ playerId: 'p9' }],
    ...overrides,
  }) as LeagueDetail;

const setup = (overrides: Partial<LeagueDetail> = {}) => {
  const reload = vi.fn().mockResolvedValue(undefined);
  const onDeleted = vi.fn();
  const view = renderHook(() =>
    useLigaAcciones({ league: league(overrides), reload, onDeleted }),
  );
  return { ...view, reload, onDeleted };
};

describe('useLigaAcciones', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(api.post).mockResolvedValue(ok);
    vi.mocked(api.put).mockResolvedValue(ok);
    vi.mocked(api.delete).mockResolvedValue(ok);
    // Las confirmaciones se aceptan al instante: aquí se prueba qué ocurre después.
    vi.mocked(openAppConfirmModal).mockImplementation(({ onConfirm }) => {
      void onConfirm();
    });
  });

  describe.each([
    ['handleStart', 'post', ENDPOINTS.LEAGUES.START('l1')],
    ['handleCancel', 'post', ENDPOINTS.LEAGUES.CANCEL('l1')],
    ['handleFinish', 'post', ENDPOINTS.LEAGUES.FINISH('l1')],
    ['handleRegister', 'post', ENDPOINTS.LEAGUES.REGISTER('l1')],
    ['handleUnregister', 'delete', ENDPOINTS.LEAGUES.REGISTER('l1')],
  ] as const)('%s', (action, method, url) => {
    it('pide confirmación, llama a la API y recarga la liga', async () => {
      const { result, reload } = setup();

      await act(async () => {
        result.current[action]();
      });

      expect(openAppConfirmModal).toHaveBeenCalledOnce();
      expect(vi.mocked(api[method])).toHaveBeenCalledWith(url, ...(method === 'post' ? [undefined, undefined] : [undefined]));
      expect(reload).toHaveBeenCalled();
    });

    it('si la API falla, no recarga ni rompe', async () => {
      vi.mocked(api[method]).mockRejectedValue(new Error('fallo'));
      const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
      const { result, reload } = setup();

      await act(async () => {
        result.current[action]();
      });

      expect(reload).not.toHaveBeenCalled();
      expect(result.current.acting).toBe(false);
      consoleError.mockRestore();
    });
  });

  it('handleDelete borra la liga y avisa para salir de la pantalla', async () => {
    const { result, onDeleted, reload } = setup();

    await act(async () => {
      result.current.handleDelete();
    });

    expect(api.delete).toHaveBeenCalledWith(ENDPOINTS.LEAGUES.BY_ID('l1'), undefined);
    expect(onDeleted).toHaveBeenCalled();
    expect(reload).not.toHaveBeenCalled();
  });

  it('handleRemoveParticipant pide confirmación y quita al jugador', async () => {
    const { result, reload } = setup();

    await act(async () => {
      result.current.handleRemoveParticipant('p1');
    });

    expect(openAppConfirmModal).toHaveBeenCalledOnce();
    expect(api.delete).toHaveBeenCalledWith(ENDPOINTS.LEAGUES.PARTICIPANT('l1', 'p1'), undefined);
    expect(reload).toHaveBeenCalled();
  });

  it('handleWithdraw avisa de las consecuencias y retira al jugador', async () => {
    const { result, reload } = setup({ status: 'Iniciado' });

    await act(async () => {
      result.current.handleWithdraw('p1');
    });

    expect(openAppConfirmModal).toHaveBeenCalledWith(
      expect.objectContaining({ warningText: expect.stringContaining('W.O.') }),
    );
    expect(api.post).toHaveBeenCalledWith(ENDPOINTS.LEAGUES.WITHDRAW('l1', 'p1'), undefined, undefined);
    expect(reload).toHaveBeenCalled();
  });

  it('handleConfirmParticipant confirma al jugador sin pedir confirmación', async () => {
    const { result, reload } = setup();

    await act(async () => {
      await result.current.handleConfirmParticipant('p1');
    });

    expect(openAppConfirmModal).not.toHaveBeenCalled();
    expect(api.put).toHaveBeenCalledWith(
      ENDPOINTS.LEAGUES.PARTICIPANT_STATUS('l1', 'p1'),
      { status: 'Confirmado' },
      undefined,
    );
    expect(reload).toHaveBeenCalled();
  });

  describe('añadir jugadores', () => {
    const clubPlayers = [
      { id: 'p9', name: 'Ya dentro', surname: null, avatarUrl: null },
      { id: 'p1', name: 'Ana', surname: 'Ruiz', avatarUrl: null },
      { id: 'p2', name: 'Luis', surname: null, avatarUrl: null },
    ];

    beforeEach(() => {
      vi.mocked(api.get).mockResolvedValue({ data: { success: true, data: clubPlayers } } as never);
    });

    it('abre el modal con los jugadores del club que aún no están en la liga', async () => {
      const { result } = setup();

      await act(async () => {
        await result.current.handleOpenAddPlayers();
      });

      expect(result.current.addModalOpen).toBe(true);
      expect(result.current.availablePlayers.map((p) => p.id)).toEqual(['p1', 'p2']);
      expect(result.current.checkedToAdd).toEqual([]);
    });

    it('añade los jugadores marcados, cierra el modal y recarga', async () => {
      const { result, reload } = setup();
      await act(async () => {
        await result.current.handleOpenAddPlayers();
      });
      act(() => result.current.setCheckedToAdd(['p1', 'p2']));

      await act(async () => {
        await result.current.handleAddPlayers();
      });

      expect(api.post).toHaveBeenCalledWith(
        ENDPOINTS.LEAGUES.PARTICIPANTS('l1'),
        { playerIds: ['p1', 'p2'] },
        undefined,
      );
      expect(result.current.addModalOpen).toBe(false);
      expect(reload).toHaveBeenCalled();
    });

    it('no llama a la API si no hay nadie marcado', async () => {
      const { result } = setup();
      await act(async () => {
        await result.current.handleOpenAddPlayers();
      });

      await act(async () => {
        await result.current.handleAddPlayers();
      });

      expect(api.post).not.toHaveBeenCalled();
    });
  });
});

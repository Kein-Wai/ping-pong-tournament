import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';

vi.mock('../api/services/tournaments', () => ({
  tournamentsService: { swapPlayers: vi.fn() },
}));

import { tournamentsService } from '../api/services/tournaments';
import { useTorneoIntercambio } from './useTorneoIntercambio';
import type { Participant } from '../types/tournament';

const participante = (id: string, name: string, surname: string | null, status: string) =>
  ({ player: { id, name, surname }, status }) as unknown as Participant;

const participants = [
  participante('p1', 'Ana', 'Pérez', 'Confirmado'),
  participante('p2', 'Luis', null, 'Confirmado'),
  participante('p3', 'Eva', 'Gil', 'Pendiente'),
  participante('p4', 'Raúl', 'Sanz', 'NoPresentado'),
];

const setup = (overrides: Partial<Parameters<typeof useTorneoIntercambio>[0]> = {}) => {
  const onSwapped = vi.fn().mockResolvedValue(undefined);
  const hook = renderHook(() => useTorneoIntercambio({ id: 't1', participants, onSwapped, ...overrides }));
  return { ...hook, onSwapped };
};

describe('useTorneoIntercambio', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
  });

  describe('estado inicial', () => {
    it('arranca con el modal cerrado y sin jugadores elegidos', () => {
      const { result } = setup();

      expect(result.current.swapModalOpen).toBe(false);
      expect(result.current.swapPlayerA).toBeNull();
      expect(result.current.swapPlayerB).toBeNull();
      expect(result.current.isSwapping).toBe(false);
    });
  });

  describe('swapOptions', () => {
    it('incluye solo a los jugadores confirmados', () => {
      const { result } = setup();

      expect(result.current.swapOptions).toEqual([
        { value: 'p1', label: 'Ana Pérez' },
        { value: 'p2', label: 'Luis ' },
      ]);
    });

    it('queda vacío si los participantes aún no se han cargado', () => {
      const { result } = setup({ participants: null });

      expect(result.current.swapOptions).toEqual([]);
    });
  });

  describe('handleSwapPlayers', () => {
    it('no hace nada sin id de torneo', async () => {
      const { result, onSwapped } = setup({ id: undefined });
      act(() => result.current.setSwapPlayerA('p1'));
      act(() => result.current.setSwapPlayerB('p2'));

      await act(async () => {
        await result.current.handleSwapPlayers();
      });

      expect(tournamentsService.swapPlayers).not.toHaveBeenCalled();
      expect(onSwapped).not.toHaveBeenCalled();
    });

    it('no hace nada si falta elegir alguno de los dos jugadores', async () => {
      const { result, onSwapped } = setup();
      act(() => result.current.setSwapPlayerA('p1'));

      await act(async () => {
        await result.current.handleSwapPlayers();
      });

      expect(tournamentsService.swapPlayers).not.toHaveBeenCalled();
      expect(onSwapped).not.toHaveBeenCalled();
    });

    it('envía playerAId y playerBId al servidor', async () => {
      const { result } = setup();
      act(() => result.current.setSwapPlayerA('p1'));
      act(() => result.current.setSwapPlayerB('p2'));

      await act(async () => {
        await result.current.handleSwapPlayers();
      });

      expect(tournamentsService.swapPlayers).toHaveBeenCalledWith('t1', { playerAId: 'p1', playerBId: 'p2' });
    });

    it('cierra el modal, limpia la selección y refresca la pantalla', async () => {
      const { result, onSwapped } = setup();
      act(() => result.current.setSwapModalOpen(true));
      act(() => result.current.setSwapPlayerA('p1'));
      act(() => result.current.setSwapPlayerB('p2'));

      await act(async () => {
        await result.current.handleSwapPlayers();
      });

      expect(result.current.swapModalOpen).toBe(false);
      expect(result.current.swapPlayerA).toBeNull();
      expect(result.current.swapPlayerB).toBeNull();
      expect(result.current.isSwapping).toBe(false);
      expect(onSwapped).toHaveBeenCalledTimes(1);
    });

    it('refresca la pantalla solo después de que el servidor confirme el intercambio', async () => {
      const { result, onSwapped } = setup();
      act(() => result.current.setSwapPlayerA('p1'));
      act(() => result.current.setSwapPlayerB('p2'));

      await act(async () => {
        await result.current.handleSwapPlayers();
      });

      const ordenServidor = vi.mocked(tournamentsService.swapPlayers).mock.invocationCallOrder[0];
      const ordenRefresco = onSwapped.mock.invocationCallOrder[0];
      expect(ordenServidor).toBeLessThan(ordenRefresco);
    });

    it('mantiene la selección y no refresca si el servidor rechaza el intercambio', async () => {
      vi.mocked(tournamentsService.swapPlayers).mockRejectedValueOnce(new Error('400'));
      const { result, onSwapped } = setup();
      act(() => result.current.setSwapModalOpen(true));
      act(() => result.current.setSwapPlayerA('p1'));
      act(() => result.current.setSwapPlayerB('p2'));

      await act(async () => {
        await result.current.handleSwapPlayers();
      });

      expect(result.current.swapModalOpen).toBe(true);
      expect(result.current.swapPlayerA).toBe('p1');
      expect(result.current.swapPlayerB).toBe('p2');
      expect(result.current.isSwapping).toBe(false);
      expect(onSwapped).not.toHaveBeenCalled();
    });
  });
});

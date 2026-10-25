import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { notifications } from '@mantine/notifications';
import { api } from '../api/axios';
import { ENDPOINTS } from '../api/endpoints';
import type { TrackedMatch } from '../types/manualMatch';
import { useCierrePartido, type UseCierrePartidoProps } from './useCierrePartido';

// Se mockea el `api` de bajo nivel (la frontera del sistema) y no los servicios,
// para que estos tests sigan valiendo cuando el acceso a datos cambie de capa.
vi.mock('../api/axios', () => ({
  api: {
    put: vi.fn(),
  },
}));

const envelope = <T>(data: T) => ({ data: { success: true, data } });

const RAPIDO = {
  id: 'm1',
  opponentName: 'Carlos',
  status: 'Iniciado',
  analysisType: 'Rapido',
  setsToWin: 3,
  mySets: 0,
  opponentSets: 0,
} as TrackedMatch;
const EXTENSO = { ...RAPIDO, analysisType: 'Extenso' } as TrackedMatch;

describe('useCierrePartido', () => {
  const setMatch = vi.fn();
  const setShowEndMatchModal = vi.fn();

  const setup = (overrides: Partial<UseCierrePartidoProps> = {}) =>
    renderHook((props: UseCierrePartidoProps) => useCierrePartido(props), {
      initialProps: {
        id: 'm1',
        match: RAPIDO,
        setMatch,
        loaded: RAPIDO,
        mySetsWon: 0,
        oppSetsWon: 0,
        setShowEndMatchModal,
        ...overrides,
      },
    });

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(api.put).mockResolvedValue(envelope({}) as never);
    vi.spyOn(notifications, 'show').mockImplementation(() => 'id');
  });

  describe('estado del formulario rápido', () => {
    it('empieza sin tanteos, sin habilidades marcadas y sin conclusiones', () => {
      const { result } = setup();

      expect(result.current.totalSetsPlayed).toBe(0);
      expect(result.current.setScores).toEqual([]);
      expect(result.current.strChecked).toEqual([]);
      expect(result.current.weakChecked).toEqual([]);
      expect(result.current.deepNotes).toBe('');
    });

    it('mantiene un tanteo por cada set jugado', () => {
      const { result, rerender } = setup({ mySetsWon: 2, oppSetsWon: 1 });
      expect(result.current.setScores).toHaveLength(3);

      rerender({
        id: 'm1',
        match: RAPIDO,
        setMatch,
        loaded: RAPIDO,
        mySetsWon: 1,
        oppSetsWon: 0,
        setShowEndMatchModal,
      });

      expect(result.current.setScores).toHaveLength(1);
    });

    it('cambiar un tanteo no toca los demás', () => {
      const { result } = setup({ mySetsWon: 2, oppSetsWon: 0 });

      act(() => result.current.handleScoreChange(1, 'oppScore', 7));

      expect(result.current.setScores).toEqual([
        { myScore: '', oppScore: '' },
        { myScore: '', oppScore: 7 },
      ]);
    });

    it('marcar y desmarcar fortalezas y fallos', () => {
      const { result } = setup();

      act(() => {
        result.current.toggleStrength('Servicio', true);
        result.current.toggleStrength('Corte', true);
        result.current.toggleWeakness('Recepción', true);
      });
      expect(result.current.strChecked).toEqual(['Servicio', 'Corte']);
      expect(result.current.weakChecked).toEqual(['Recepción']);

      act(() => result.current.toggleStrength('Servicio', false));
      expect(result.current.strChecked).toEqual(['Corte']);
    });

    it('las conclusiones de un partido profundo ya guardadas se cargan', () => {
      const { result } = setup({ loaded: { ...EXTENSO, lightNotes: 'Buen partido' } });

      expect(result.current.deepNotes).toBe('Buen partido');
    });

    it('las notas de un partido rápido no se cargan como conclusiones', () => {
      const { result } = setup({ loaded: { ...RAPIDO, lightNotes: 'Notas del modo rápido' } });

      expect(result.current.deepNotes).toBe('');
    });
  });

  describe('cerrar un partido rápido', () => {
    it('envía los sets, las notas generadas y los tanteos', async () => {
      const { result } = setup({ mySetsWon: 3, oppSetsWon: 0 });
      act(() => {
        result.current.toggleStrength('Servicio', true);
        result.current.setStrDetails('Sólido');
      });
      act(() => result.current.handleScoreChange(0, 'myScore', 11));
      act(() => result.current.handleScoreChange(0, 'oppScore', 7));

      await act(async () => {
        await result.current.executeCompleteMatch();
      });

      expect(api.put).toHaveBeenCalledWith(
        ENDPOINTS.MANUAL_MATCHES.COMPLETE('m1'),
        {
          mySets: 3,
          opponentSets: 0,
          lightNotes:
            'Fortalezas durante el partido:\n- Servicio\nDetalles:\nSólido\n\nCosas a mejorar:\nNinguna\nDetalles:\nSin detalles',
          setScores: [
            { myScore: 11, oppScore: 7 },
            { myScore: 0, oppScore: 0 },
            { myScore: 0, oppScore: 0 },
          ],
        },
        undefined,
      );
    });

    it('un tanteo imposible avisa y no envía nada', async () => {
      const { result } = setup({ mySetsWon: 3, oppSetsWon: 0 });
      act(() => result.current.handleScoreChange(1, 'myScore', 5));
      act(() => result.current.handleScoreChange(1, 'oppScore', 3));

      await act(async () => {
        await result.current.executeCompleteMatch();
      });

      expect(notifications.show).toHaveBeenCalledWith({
        title: 'Marcador Inválido',
        message: 'El resultado del Set 2 (5-3) es imposible en tenis de mesa. Corrígelo.',
        color: 'red',
      });
      expect(api.put).not.toHaveBeenCalled();
    });
  });

  describe('cerrar un partido profundo', () => {
    it('envía los sets y las conclusiones escritas, sin tanteos', async () => {
      const { result } = setup({ match: EXTENSO, loaded: EXTENSO, mySetsWon: 3, oppSetsWon: 1 });
      act(() => result.current.setDeepNotes('Me costó leer el efecto'));

      await act(async () => {
        await result.current.executeCompleteMatch();
      });

      expect(api.put).toHaveBeenCalledWith(
        ENDPOINTS.MANUAL_MATCHES.COMPLETE('m1'),
        {
          mySets: 3,
          opponentSets: 1,
          lightNotes: 'Me costó leer el efecto',
          setScores: undefined,
        },
        undefined,
      );
    });
  });

  describe('resultado', () => {
    it('al guardar marca el partido completado y cierra el aviso final', async () => {
      const { result } = setup({ match: EXTENSO, loaded: EXTENSO, mySetsWon: 3, oppSetsWon: 1 });
      act(() => result.current.setDeepNotes('Notas'));

      await act(async () => {
        await result.current.executeCompleteMatch();
      });

      expect(setMatch).toHaveBeenCalledWith({
        ...EXTENSO,
        status: 'Completado',
        mySets: 3,
        opponentSets: 1,
        lightNotes: 'Notas',
      });
      expect(setShowEndMatchModal).toHaveBeenCalledWith(false);
    });

    it('si falla no cambia el partido y registra el error', async () => {
      const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
      vi.mocked(api.put).mockRejectedValue(new Error('rechazado'));
      const { result } = setup({ mySetsWon: 3, oppSetsWon: 0 });

      await act(async () => {
        await result.current.executeCompleteMatch();
      });

      expect(setMatch).not.toHaveBeenCalled();
      expect(setShowEndMatchModal).not.toHaveBeenCalled();
      expect(consoleError).toHaveBeenCalled();
    });
  });
});

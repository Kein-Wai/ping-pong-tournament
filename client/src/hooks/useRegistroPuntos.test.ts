import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { api } from '../api/axios';
import { ENDPOINTS } from '../api/endpoints';
import { LOST_TREE, PLACEMENTS, WON_TREE } from '../constants/manualMatch';
import type { TrackedMatch, TrackedPoint } from '../types/manualMatch';
import { useRegistroPuntos } from './useRegistroPuntos';

// Se mockea el `api` de bajo nivel (la frontera del sistema) y no los servicios,
// para que estos tests sigan valiendo cuando el acceso a datos cambie de capa.
vi.mock('../api/axios', () => ({
  api: {
    post: vi.fn(),
    delete: vi.fn(),
  },
}));

const envelope = <T>(data: T) => ({ data: { success: true, data } });

const point = (
  setNumber: number,
  pointOrder: number,
  isWon: boolean,
  extra: Partial<TrackedPoint> = {},
): TrackedPoint => ({ id: `p${setNumber}-${pointOrder}`, setNumber, pointOrder, isWon, ...extra });

const setPoints = (setNumber: number, mine: number, theirs: number): TrackedPoint[] => [
  ...Array.from({ length: mine }, (_, i) => point(setNumber, i + 1, true)),
  ...Array.from({ length: theirs }, (_, i) => point(setNumber, mine + i + 1, false)),
];

const loadedWith = (points: TrackedPoint[]) => ({ id: 'm1', points }) as TrackedMatch;

describe('useRegistroPuntos', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    let sequence = 0;
    vi.mocked(api.post).mockImplementation((async (_url: string, body: object) =>
      envelope({ id: `new-${++sequence}`, ...body })) as never);
    vi.mocked(api.delete).mockResolvedValue({ data: { success: true } } as never);
  });

  const setup = (loaded: TrackedMatch | null = loadedWith([])) =>
    renderHook(({ loaded }) => useRegistroPuntos({ id: 'm1', loaded }), {
      initialProps: { loaded },
    });

  describe('estado inicial', () => {
    it('antes de cargar el partido está en el set 1 sin puntos', () => {
      const { result } = setup(null);

      expect(result.current.pointHistory).toEqual([]);
      expect(result.current.currentSet).toBe(1);
      expect(result.current.myScore).toBe(0);
      expect(result.current.oppScore).toBe(0);
    });

    it('al cargar el partido ya tiene los puntos en el mismo render, sin un fotograma vacío', () => {
      const { result } = setup(loadedWith(setPoints(1, 7, 3)));

      expect(result.current.pointHistory).toHaveLength(10);
      expect(result.current.myScore).toBe(7);
      expect(result.current.oppScore).toBe(3);
    });

    it('retoma en el set siguiente si el último ya terminó', () => {
      const { result } = setup(loadedWith(setPoints(1, 11, 3)));

      expect(result.current.currentSet).toBe(2);
      expect(result.current.currentSetPoints).toEqual([]);
    });

    it('un partido sin la lista de puntos empieza vacío', () => {
      const { result } = setup({ id: 'm1' } as TrackedMatch);

      expect(result.current.pointHistory).toEqual([]);
    });
  });

  describe('recorrer el árbol', () => {
    it('empieza sin punto en curso', () => {
      const { result } = setup();

      expect(result.current.isWonState).toBeNull();
      expect(result.current.currentNodes).toBeNull();
    });

    it('punto mío ofrece el árbol de ganados; punto rival, el de perdidos', () => {
      const { result } = setup();

      act(() => result.current.handleStartPoint(true));
      expect(result.current.isWonState).toBe(true);
      expect(result.current.currentNodes).toBe(WON_TREE);

      act(() => result.current.handleStartPoint(false));
      expect(result.current.isWonState).toBe(false);
      expect(result.current.currentNodes).toBe(LOST_TREE);
    });

    it('elegir un nodo con hijos baja un nivel y recuerda lo elegido', () => {
      const { result } = setup();
      act(() => result.current.handleStartPoint(true));
      const servicio = WON_TREE[0];

      act(() => result.current.handleNodeClick(servicio));

      expect(result.current.currentNodes).toBe(servicio.next);
      expect(result.current.pointPath).toEqual({ category: 'Servicio' });
      expect(api.post).not.toHaveBeenCalled();
    });

    it('cancelar vuelve al principio sin registrar nada', () => {
      const { result } = setup();
      act(() => result.current.handleStartPoint(true));
      act(() => result.current.handleNodeClick(WON_TREE[0]));

      act(() => result.current.resetFlow());

      expect(result.current.isWonState).toBeNull();
      expect(result.current.currentNodes).toBeNull();
      expect(result.current.pointPath).toEqual({});
      expect(api.post).not.toHaveBeenCalled();
    });
  });

  describe('registrar un punto', () => {
    it('un nodo hoja registra el punto con todo lo elegido y reinicia el recorrido', async () => {
      const { result } = setup();
      act(() => result.current.handleStartPoint(true));
      act(() => result.current.handleNodeClick(WON_TREE[0]));
      act(() => result.current.handleNodeClick(WON_TREE[0].next![0]));

      await act(async () => {
        result.current.handleNodeClick(PLACEMENTS[0]);
      });

      expect(api.post).toHaveBeenCalledWith(
        ENDPOINTS.MANUAL_MATCHES.ADD_POINT('m1'),
        {
          setNumber: 1,
          pointOrder: 1,
          isWon: true,
          category: 'Servicio',
          subcategory: 'Cortado',
          placement: 'Derecha',
        },
        undefined,
      );
      expect(result.current.isWonState).toBeNull();
      expect(result.current.pointHistory).toHaveLength(1);
      expect(result.current.pointHistory[0].id).toBe('new-1');
      expect(result.current.myScore).toBe(1);
    });

    it('una categoría sin subniveles manda el resto a null', async () => {
      const { result } = setup();
      act(() => result.current.handleStartPoint(false));

      await act(async () => {
        result.current.handleNodeClick(LOST_TREE[0]);
      });

      expect(api.post).toHaveBeenCalledWith(
        ENDPOINTS.MANUAL_MATCHES.ADD_POINT('m1'),
        {
          setNumber: 1,
          pointOrder: 1,
          isWon: false,
          category: 'FalloSaque',
          subcategory: null,
          placement: null,
        },
        undefined,
      );
      expect(result.current.oppScore).toBe(1);
    });

    it('el número de orden continúa por el set en curso', async () => {
      const { result } = setup(loadedWith(setPoints(1, 3, 2)));
      act(() => result.current.handleStartPoint(true));

      await act(async () => {
        result.current.handleNodeClick(WON_TREE[4]);
      });

      expect(api.post).toHaveBeenCalledWith(
        ENDPOINTS.MANUAL_MATCHES.ADD_POINT('m1'),
        expect.objectContaining({ setNumber: 1, pointOrder: 6 }),
        undefined,
      );
    });

    it('si falla no añade el punto y registra el error', async () => {
      const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
      vi.mocked(api.post).mockRejectedValue(new Error('rechazado'));
      const { result } = setup();
      act(() => result.current.handleStartPoint(true));

      await act(async () => {
        result.current.handleNodeClick(WON_TREE[4]);
      });

      expect(result.current.pointHistory).toEqual([]);
      expect(consoleError).toHaveBeenCalled();
    });
  });

  describe('deshacer', () => {
    it('borra el último punto, lo quita de la lista y reinicia el recorrido', async () => {
      const { result } = setup(loadedWith([point(1, 1, true), point(1, 2, false)]));
      act(() => result.current.handleStartPoint(true));

      await act(async () => {
        await result.current.handleUndoPoint();
      });

      expect(api.delete).toHaveBeenCalledWith(
        ENDPOINTS.MANUAL_MATCHES.DELETE_POINT('m1', 'p1-2'),
        undefined,
      );
      expect(result.current.pointHistory.map((p) => p.id)).toEqual(['p1-1']);
      expect(result.current.isWonState).toBeNull();
    });

    it('sin puntos no llama a la API', async () => {
      const { result } = setup();

      await act(async () => {
        await result.current.handleUndoPoint();
      });

      expect(api.delete).not.toHaveBeenCalled();
    });

    it('si falla conserva el punto y registra el error', async () => {
      const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
      vi.mocked(api.delete).mockRejectedValue(new Error('rechazado'));
      const { result } = setup(loadedWith([point(1, 1, true)]));

      await act(async () => {
        await result.current.handleUndoPoint();
      });

      expect(result.current.pointHistory).toHaveLength(1);
      expect(consoleError).toHaveBeenCalled();
    });
  });

  it('setCurrentSet cambia el set en curso', () => {
    const { result } = setup(loadedWith(setPoints(1, 11, 3)));

    act(() => result.current.setCurrentSet(3));

    expect(result.current.currentSet).toBe(3);
  });
});

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import type { TrackedMatch } from '../types/manualMatch';
import { useSetsPartido, type UseSetsPartidoProps } from './useSetsPartido';

const MATCH = {
  id: 'm1',
  opponentName: 'Carlos',
  status: 'Iniciado',
  setsToWin: 3,
  mySets: 1,
  opponentSets: 2,
} as TrackedMatch;

describe('useSetsPartido', () => {
  const setCurrentSet = vi.fn();
  const onUndoPoint = vi.fn();

  const setup = (overrides: Partial<UseSetsPartidoProps> = {}) =>
    renderHook((props: UseSetsPartidoProps) => useSetsPartido(props), {
      initialProps: {
        match: MATCH,
        loaded: MATCH,
        myScore: 0,
        oppScore: 0,
        currentSet: 1,
        setCurrentSet,
        onUndoPoint,
        ...overrides,
      },
    });

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('sets ganados', () => {
    it('antes de cargar el partido están a cero', () => {
      const { result } = setup({ match: null, loaded: null });

      expect(result.current.mySetsWon).toBe(0);
      expect(result.current.oppSetsWon).toBe(0);
    });

    it('al cargar el partido arrancan con sus sets, en el mismo render', () => {
      const { result } = setup();

      expect(result.current.mySetsWon).toBe(1);
      expect(result.current.oppSetsWon).toBe(2);
    });

    it('un partido sin sets arranca a cero', () => {
      const { result } = setup({ loaded: { ...MATCH, mySets: 0, opponentSets: 0 } });

      expect(result.current.mySetsWon).toBe(0);
    });

    it('se pueden editar a mano en el modo rápido', () => {
      const { result } = setup();

      act(() => {
        result.current.setMySetsWon(3);
        result.current.setOppSetsWon('2');
      });

      expect(result.current.mySetsWon).toBe(3);
      expect(result.current.oppSetsWon).toBe('2');
    });
  });

  describe('aviso de set terminado', () => {
    it('no aparece con un marcador a medias', () => {
      const { result } = setup({ myScore: 7, oppScore: 5 });

      expect(result.current.showEndSetModal).toBe(false);
    });

    it('aparece cuando el marcador es un set válido', () => {
      const { result } = setup({ myScore: 11, oppScore: 4 });

      expect(result.current.showEndSetModal).toBe(true);
    });

    it('aparece al pasar el marcador a un set válido', () => {
      const { result, rerender } = setup({ myScore: 10, oppScore: 4 });
      expect(result.current.showEndSetModal).toBe(false);

      rerender({
        match: MATCH,
        loaded: MATCH,
        myScore: 11,
        oppScore: 4,
        currentSet: 1,
        setCurrentSet,
        onUndoPoint,
      });

      expect(result.current.showEndSetModal).toBe(true);
    });

    it('no aparece en un partido completado', () => {
      const { result } = setup({
        match: { ...MATCH, status: 'Completado' },
        myScore: 11,
        oppScore: 4,
      });

      expect(result.current.showEndSetModal).toBe(false);
    });

    it('deshacer desde el aviso lo cierra y deshace el último punto', () => {
      const { result } = setup({ myScore: 11, oppScore: 4 });

      act(() => result.current.handleUndoFromEndSet());

      expect(result.current.showEndSetModal).toBe(false);
      expect(onUndoPoint).toHaveBeenCalledTimes(1);
    });
  });

  describe('avanzar al siguiente set', () => {
    it('si gano el set suma uno a los míos y pasa al siguiente', () => {
      const { result } = setup({ myScore: 11, oppScore: 4 });

      act(() => result.current.handleConfirmSetEnd());

      expect(result.current.mySetsWon).toBe(2);
      expect(result.current.oppSetsWon).toBe(2);
      expect(result.current.showEndSetModal).toBe(false);
      expect(setCurrentSet).toHaveBeenCalledWith(2);
      expect(result.current.showEndMatchModal).toBe(false);
    });

    it('si lo pierdo suma uno al rival', () => {
      const { result } = setup({ myScore: 5, oppScore: 11, currentSet: 4 });

      act(() => result.current.handleConfirmSetEnd());

      expect(result.current.oppSetsWon).toBe(3);
    });

    it('al llegar a los sets necesarios abre el cierre del partido en vez de pasar de set', () => {
      const { result } = setup({
        loaded: { ...MATCH, mySets: 2, opponentSets: 0 },
        myScore: 11,
        oppScore: 4,
      });

      act(() => result.current.handleConfirmSetEnd());

      expect(result.current.mySetsWon).toBe(3);
      expect(result.current.showEndMatchModal).toBe(true);
      expect(setCurrentSet).not.toHaveBeenCalled();
    });

    it('sin formato definido se juega al mejor de tres', () => {
      const { result } = setup({
        match: { ...MATCH, setsToWin: 0 },
        loaded: { ...MATCH, mySets: 2, opponentSets: 0, setsToWin: 0 },
        myScore: 11,
        oppScore: 4,
      });

      act(() => result.current.handleConfirmSetEnd());

      expect(result.current.showEndMatchModal).toBe(true);
    });
  });

  it('el resumen de un set se abre y se cierra', () => {
    const { result } = setup();

    act(() => result.current.setViewingSetSummary(2));
    expect(result.current.viewingSetSummary).toBe(2);

    act(() => result.current.setViewingSetSummary(null));
    expect(result.current.viewingSetSummary).toBeNull();
  });
});

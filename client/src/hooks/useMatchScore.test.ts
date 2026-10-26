import { describe, it, expect } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useMatchScore } from './useMatchScore';
import type { MatchToEdit } from '../types/tournament';

const buildMatch = (overrides: Partial<MatchToEdit> = {}): MatchToEdit =>
  ({
    id: 'partido-1',
    playerOneName: 'Jugador 1',
    playerTwoName: 'Jugador 2',
    playerOneId: 'p1',
    playerTwoId: 'p2',
    setsToWin: 2,
    status: 'Iniciado',
    isKnockout: false,
    set1P1: 0, set1P2: 0,
    set2P1: 0, set2P2: 0,
    set3P1: 0, set3P2: 0,
    set4P1: 0, set4P2: 0,
    set5P1: 0, set5P2: 0,
    set6P1: 0, set6P2: 0,
    set7P1: 0, set7P2: 0,
    ...overrides,
  }) as MatchToEdit;

describe('useMatchScore', () => {
  it('devuelve ceros cuando match es null', () => {
    const { result } = renderHook(() => useMatchScore(null));
    expect(result.current).toEqual({ p1Sets: 0, p2Sets: 0, isValidToComplete: false });
  });

  it('cuenta los sets ganados por cada jugador', () => {
    const match = buildMatch({ set1P1: 11, set1P2: 5, set2P1: 9, set2P2: 11 });
    const { result } = renderHook(() => useMatchScore(match));
    expect(result.current.p1Sets).toBe(1);
    expect(result.current.p2Sets).toBe(1);
  });

  it('detecta que se pueden completar los sets', () => {
    const match = buildMatch({ setsToWin: 2, set1P1: 11, set1P2: 5, set2P1: 11, set2P2: 7 });
    const { result } = renderHook(() => useMatchScore(match));
    expect(result.current.isValidToComplete).toBe(true);
  });

  it('no permite completar con menos sets de los necesarios', () => {
    const match = buildMatch({ setsToWin: 3, set1P1: 11, set1P2: 5, set2P1: 11, set2P2: 7 });
    const { result } = renderHook(() => useMatchScore(match));
    expect(result.current.isValidToComplete).toBe(false);
  });

  it('ignora los sets a cero', () => {
    const { result } = renderHook(() => useMatchScore(buildMatch()));
    expect(result.current.p1Sets).toBe(0);
    expect(result.current.p2Sets).toBe(0);
  });
});
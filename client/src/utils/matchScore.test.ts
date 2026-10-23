import { describe, it, expect } from 'vitest';
import { calculateMatchScore } from './matchScore';
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
    set1P1: 0,
    set1P2: 0,
    set2P1: 0,
    set2P2: 0,
    set3P1: 0,
    set3P2: 0,
    set4P1: 0,
    set4P2: 0,
    set5P1: 0,
    set5P2: 0,
    set6P1: 0,
    set6P2: 0,
    set7P1: 0,
    set7P2: 0,
    ...overrides,
  }) as MatchToEdit;

describe('Calculo de sets (client/src/utils/matchScore.ts)', () => {
  it('cuenta los sets ganados por cada jugador', () => {
    const score = calculateMatchScore(buildMatch({ set1P1: 11, set1P2: 5, set2P1: 9, set2P2: 11 }));

    expect(score.p1Sets).toBe(1);
    expect(score.p2Sets).toBe(1);
  });

  it('no cuenta los sets con empate', () => {
    const score = calculateMatchScore(buildMatch({ set1P1: 11, set1P2: 11 }));

    expect(score.p1Sets).toBe(0);
    expect(score.p2Sets).toBe(0);
  });

  it('no cuenta los sets con marcadores imposibles', () => {
    // 11-10 no es un set valido (falta la diferencia de 2) y 12-14 tampoco
    // (la diferencia debe ser exactamente 2 tras el 10-10).
    const score = calculateMatchScore(
      buildMatch({ set1P1: 11, set1P2: 10, set2P1: 12, set2P2: 13 }),
    );

    expect(score.p1Sets).toBe(0);
    expect(score.p2Sets).toBe(0);
  });

  it('cuenta un set valido tras el desempate a 10-10', () => {
    // 15-17 tiene diferencia 2: es un set valido a favor del jugador 2.
    const score = calculateMatchScore(buildMatch({ set1P1: 15, set1P2: 17 }));

    expect(score.p1Sets).toBe(0);
    expect(score.p2Sets).toBe(1);
  });

  it('detecta que se han alcanzado los sets necesarios', () => {
    const score = calculateMatchScore(
      buildMatch({ setsToWin: 2, set1P1: 11, set1P2: 5, set2P1: 11, set2P2: 7 }),
    );

    expect(score.isValidToComplete).toBe(true);
  });

  it('no permite completar con menos sets de los necesarios', () => {
    const score = calculateMatchScore(
      buildMatch({ setsToWin: 3, set1P1: 11, set1P2: 5, set2P1: 11, set2P2: 7 }),
    );

    expect(score.isValidToComplete).toBe(false);
  });

  it('ignora los sets a cero', () => {
    const score = calculateMatchScore(buildMatch());

    expect(score.p1Sets).toBe(0);
    expect(score.p2Sets).toBe(0);
  });
});

import { describe, it, expect } from 'vitest';
import { computeEliminatedPositions, computeKnockoutPosition } from './tournament-positions';

describe('Posiciones finales de los eliminados (api/src/utils/tournament-positions.ts)', () => {
  const clasificaciones = [
    { playerId: 'p1', position: 1 },
    { playerId: 'p2', position: 2 },
    { playerId: 'p3', position: 3 },
    { playerId: 'p4', position: 4 },
  ];

  it('devuelve solo los jugadores que NO avanzan a eliminatorias', () => {
    const eliminated = computeEliminatedPositions(clasificaciones, ['p1', 'p2'], 2);

    expect(eliminated.map((row) => row.playerId)).toEqual(['p3', 'p4']);
  });

  it('calcula la posicion final como (posicion en el grupo - 1) * grupos + 1', () => {
    const eliminated = computeEliminatedPositions(clasificaciones, ['p1', 'p2'], 2);

    // 3er del grupo 1 con 2 grupos -> (3 - 1) * 2 + 1 = 5
    expect(eliminated[0]).toEqual({ playerId: 'p3', position: 5 });
    // 4to del grupo 2 con 2 grupos -> (4 - 1) * 2 + 1 = 7
    expect(eliminated[1]).toEqual({ playerId: 'p4', position: 7 });
  });

  it('con un unico grupo la posicion final es la posicion dentro del grupo', () => {
    const eliminated = computeEliminatedPositions(clasificaciones, ['p1'], 1);

    expect(eliminated.map((row) => row.position)).toEqual([2, 3, 4]);
  });

  it('devuelve una lista vacia si todos los jugadores avanzan', () => {
    const eliminated = computeEliminatedPositions(
      clasificaciones,
      ['p1', 'p2', 'p3', 'p4'],
      2,
    );

    expect(eliminated).toEqual([]);
  });

  it('conserva el orden de las clasificaciones de entrada', () => {
    const eliminated = computeEliminatedPositions(clasificaciones, ['p4'], 2);

    expect(eliminated.map((row) => row.playerId)).toEqual(['p1', 'p2', 'p3']);
  });

  it('no muta las clasificaciones de entrada', () => {
    const input = [...clasificaciones];
    const snapshot = JSON.stringify(input);

    computeEliminatedPositions(input, ['p1'], 2);

    expect(JSON.stringify(input)).toBe(snapshot);
  });
});

describe('Posiciones finales en eliminatorias (computeKnockoutPosition)', () => {
  const base = {
    round: 'Final',
    positions: '1-2',
    isWinner: true,
    isSecondBracket: false,
    numGroups: 4,
    playersKnockout: 2,
  };

  it('el ganador de la final es primero y el perdedor segundo', () => {
    expect(computeKnockoutPosition({ ...base, isWinner: true })).toBe(1);
    expect(computeKnockoutPosition({ ...base, isWinner: false })).toBe(2);
  });

  it('respeta el rango de posiciones de la final', () => {
    expect(computeKnockoutPosition({ ...base, positions: '3-4', isWinner: true })).toBe(3);
    expect(computeKnockoutPosition({ ...base, positions: '3-4', isWinner: false })).toBe(4);
  });

  it('sin rango usa las posiciones 1 y 2', () => {
    expect(computeKnockoutPosition({ ...base, positions: null, isWinner: true })).toBe(1);
    expect(computeKnockoutPosition({ ...base, positions: null, isWinner: false })).toBe(2);
  });

  it('el perdedor de cada ronda queda en su posicion oficial', () => {
    const expected: Array<[string, number]> = [
      ['Semifinales', 3],
      ['Cuartos', 5],
      ['Octavos', 9],
      ['R16avos', 17],
      ['R32avos', 33],
      ['R64avos', 65],
      ['R128avos', 129],
    ];

    expected.forEach(([round, position]) => {
      expect(computeKnockoutPosition({ ...base, round, isWinner: false })).toBe(position);
    });
  });

  it('el ganador de una ronda que no es la final no tiene posicion todavia', () => {
    expect(computeKnockoutPosition({ ...base, round: 'Semifinales', isWinner: true })).toBe(0);
  });

  it('una ronda desconocida no tiene posicion', () => {
    expect(computeKnockoutPosition({ ...base, round: 'Inventada', isWinner: false })).toBe(0);
  });

  it('la segunda llave va por detras de la primera', () => {
    const offset = base.numGroups * base.playersKnockout;

    expect(computeKnockoutPosition({ ...base, isSecondBracket: true, isWinner: true })).toBe(
      1 + offset,
    );
    expect(computeKnockoutPosition({ ...base, isSecondBracket: true, isWinner: false })).toBe(
      2 + offset,
    );
    expect(
      computeKnockoutPosition({ ...base, round: 'Cuartos', isWinner: false, isSecondBracket: true }),
    ).toBe(5 + offset);
  });
});

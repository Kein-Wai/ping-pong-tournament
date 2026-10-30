import { describe, it, expect } from 'vitest';
import { computeLeagueStandings, LeagueMatch } from './league-standings';

type SetScore = [number, number];

const SET_KEYS = [
  ['setOnePlayerOne', 'setOnePlayerTwo'],
  ['setTwoPlayerOne', 'setTwoPlayerTwo'],
  ['setThreePlayerOne', 'setThreePlayerTwo'],
] as const;

/** Partido completado entre dos jugadores con el marcador de cada set. */
const match = (p1: string, p2: string, sets: SetScore[], walkover = false): LeagueMatch => {
  const result: LeagueMatch = { playerOneId: p1, playerTwoId: p2, walkover };
  sets.forEach(([a, b], i) => {
    result[SET_KEYS[i][0]] = a;
    result[SET_KEYS[i][1]] = b;
  });
  return result;
};

const ids = (standings: { playerId: string }[]) => standings.map((s) => s.playerId);

describe('computeLeagueStandings', () => {
  it('sin partidos deja a todos a cero y respeta el orden de entrada', () => {
    const standings = computeLeagueStandings(['a', 'b', 'c'], []);

    expect(ids(standings)).toEqual(['a', 'b', 'c']);
    standings.forEach((s) => {
      expect(s.played).toBe(0);
      expect(s.pointsClas).toBe(0);
    });
    expect(standings.map((s) => s.position)).toEqual([1, 2, 3]);
  });

  it('da 2 puntos al ganador y 1 al perdedor de un partido jugado', () => {
    const standings = computeLeagueStandings(
      ['a', 'b', 'c'],
      [match('a', 'b', [[11, 5], [11, 7]])],
    );

    const byId = Object.fromEntries(standings.map((s) => [s.playerId, s]));
    expect(byId.a.pointsClas).toBe(2);
    expect(byId.b.pointsClas).toBe(1);
    expect(byId.c.pointsClas).toBe(0);
    expect(byId.c.played).toBe(0);
    expect(ids(standings)).toEqual(['a', 'b', 'c']);
  });

  it('acumula sets y puntos a favor y en contra', () => {
    const [first] = computeLeagueStandings(
      ['a', 'b'],
      [match('a', 'b', [[11, 5], [9, 11], [11, 7]])],
    );

    expect(first.playerId).toBe('a');
    expect(first.setsWon).toBe(2);
    expect(first.setsLost).toBe(1);
    expect(first.pointsWon).toBe(31);
    expect(first.pointsLost).toBe(23);
    expect(first.gamesWon).toBe(1);
  });

  it('ignora partidos con jugadores que no estan en la liga', () => {
    const standings = computeLeagueStandings(['a', 'b'], [match('a', 'z', [[11, 5], [11, 7]])]);

    standings.forEach((s) => expect(s.played).toBe(0));
  });

  it('devuelve una lista vacia si no hay jugadores', () => {
    expect(computeLeagueStandings([], [])).toEqual([]);
  });

  describe('empate entre dos jugadores', () => {
    // A y B acaban con 5 puntos; B tiene mejor diferencia de sets (+3 frente a +1)
    // pero A le ganó el partido directo.
    const matches = [
      match('a', 'b', [[11, 5], [9, 11], [11, 5]]),
      match('a', 'c', [[11, 5], [11, 5]]),
      match('a', 'd', [[5, 11], [5, 11]]),
      match('b', 'c', [[11, 5], [11, 5]]),
      match('b', 'd', [[11, 5], [11, 5]]),
    ];

    it('decide el enfrentamiento directo aunque el rival tenga mejor diferencia de sets', () => {
      const standings = computeLeagueStandings(['a', 'b', 'c', 'd'], matches);
      const byId = Object.fromEntries(standings.map((s) => [s.playerId, s]));

      expect(byId.a.pointsClas).toBe(byId.b.pointsClas);
      expect(ids(standings).indexOf('a')).toBeLessThan(ids(standings).indexOf('b'));
    });

    it('si el directo queda igualado en ida y vuelta, desempata la diferencia de sets', () => {
      const standings = computeLeagueStandings(
        ['b', 'a'],
        [match('a', 'b', [[11, 5], [11, 5]]), match('b', 'a', [[11, 5], [9, 11], [11, 5]])],
      );

      expect(ids(standings)).toEqual(['a', 'b']);
    });

    it('si no se han enfrentado todavia, desempata la diferencia de sets', () => {
      // Ambos ganan 2-0 a un tercero distinto; A gana por más sets de diferencia.
      const standings = computeLeagueStandings(
        ['b', 'a', 'c', 'd'],
        [match('a', 'c', [[11, 5], [11, 5]]), match('b', 'd', [[11, 5], [5, 11], [11, 5]])],
      );

      expect(ids(standings).slice(0, 2)).toEqual(['a', 'b']);
    });
  });

  describe('empate entre tres o mas jugadores', () => {
    it('ignora el enfrentamiento directo y desempata por diferencia de sets', () => {
      // Ciclo: A gana a B 2-0, B gana a C 2-1, C gana a A 2-1. Todos suman 3 puntos.
      const standings = computeLeagueStandings(
        ['a', 'b', 'c'],
        [
          match('a', 'b', [[11, 5], [11, 5]]),
          match('b', 'c', [[11, 5], [9, 11], [11, 5]]),
          match('c', 'a', [[11, 5], [9, 11], [11, 5]]),
        ],
      );

      expect(ids(standings)).toEqual(['a', 'c', 'b']);
    });

    it('si tambien empatan en sets, desempata la diferencia de puntos', () => {
      const standings = computeLeagueStandings(
        ['a', 'b', 'c'],
        [
          match('a', 'b', [[11, 5], [11, 5]]),
          match('b', 'c', [[11, 9], [11, 9]]),
          match('c', 'a', [[11, 6], [11, 6]]),
        ],
      );

      expect(ids(standings)).toEqual(['c', 'a', 'b']);
    });
  });

  describe('W.O.', () => {
    const walkoverMatch = match('a', 'b', [[11, 0], [11, 0]], true);

    it('da 2 puntos al ganador y 0 al jugador que se retira', () => {
      const standings = computeLeagueStandings(['a', 'b'], [walkoverMatch]);
      const byId = Object.fromEntries(standings.map((s) => [s.playerId, s]));

      expect(byId.a.pointsClas).toBe(2);
      expect(byId.b.pointsClas).toBe(0);
    });

    it('cuenta los sets convencionales pero no los puntos', () => {
      const standings = computeLeagueStandings(['a', 'b'], [walkoverMatch]);
      const byId = Object.fromEntries(standings.map((s) => [s.playerId, s]));

      expect(byId.a.setsWon).toBe(2);
      expect(byId.b.setsLost).toBe(2);
      expect(byId.a.pointsWon).toBe(0);
      expect(byId.a.pointsLost).toBe(0);
      expect(byId.b.pointsWon).toBe(0);
      expect(byId.b.pointsLost).toBe(0);
    });

    it('no altera los puntos de un partido normal del mismo jugador', () => {
      const standings = computeLeagueStandings(
        ['a', 'b', 'c'],
        [walkoverMatch, match('a', 'c', [[11, 5], [11, 7]])],
      );
      const a = standings.find((s) => s.playerId === 'a');

      expect(a?.pointsWon).toBe(22);
      expect(a?.pointsLost).toBe(12);
    });
  });

  it('no modifica los datos recibidos', () => {
    const players = ['a', 'b'];
    const matches = [match('a', 'b', [[11, 5], [11, 7]])];
    const matchesCopy = JSON.parse(JSON.stringify(matches));

    computeLeagueStandings(players, matches);

    expect(players).toEqual(['a', 'b']);
    expect(matches).toEqual(matchesCopy);
  });
});

import { describe, it, expect } from 'vitest';
import { generateLeagueSchedule } from './league-schedule';

const players = (n: number) => Array.from({ length: n }, (_, i) => `p${i + 1}`);

const pairKey = (a: string, b: string) => [a, b].sort().join('-');

describe('generateLeagueSchedule', () => {
  it('con 4 jugadores genera 3 jornadas de 2 partidos', () => {
    const schedule = generateLeagueSchedule(players(4), false);

    expect(schedule).toHaveLength(3);
    schedule.forEach((round) => expect(round.matches).toHaveLength(2));
  });

  it('con 5 jugadores genera 5 jornadas de 2 partidos, descansando uno por jornada', () => {
    const schedule = generateLeagueSchedule(players(5), false);

    expect(schedule).toHaveLength(5);
    schedule.forEach((round) => expect(round.matches).toHaveLength(2));
    const resting = schedule.map((round) => {
      const playing = new Set(round.matches.flatMap((m) => [m.playerOneId, m.playerTwoId]));
      return players(5).filter((p) => !playing.has(p));
    });
    resting.forEach((r) => expect(r).toHaveLength(1));
    expect(new Set(resting.flat()).size).toBe(5);
  });

  it('con 3 jugadores genera 3 jornadas de 1 partido', () => {
    const schedule = generateLeagueSchedule(players(3), false);

    expect(schedule).toHaveLength(3);
    schedule.forEach((round) => expect(round.matches).toHaveLength(1));
  });

  it('con 2 jugadores genera una jornada con un partido', () => {
    const schedule = generateLeagueSchedule(['a', 'b'], false);

    expect(schedule).toHaveLength(1);
    expect(schedule[0].matches).toHaveLength(1);
  });

  it.each([2, 3, 4, 5, 6, 7, 8, 11, 20])(
    'con %i jugadores cada pareja se enfrenta exactamente una vez',
    (n) => {
      const schedule = generateLeagueSchedule(players(n), false);
      const keys = schedule.flatMap((r) => r.matches.map((m) => pairKey(m.playerOneId, m.playerTwoId)));

      expect(keys).toHaveLength((n * (n - 1)) / 2);
      expect(new Set(keys).size).toBe(keys.length);
    },
  );

  it.each([3, 6, 9, 12])('con %i jugadores nadie juega dos veces en una jornada', (n) => {
    const schedule = generateLeagueSchedule(players(n), false);

    schedule.forEach((round) => {
      const ids = round.matches.flatMap((m) => [m.playerOneId, m.playerTwoId]);
      expect(new Set(ids).size).toBe(ids.length);
    });
  });

  it('ningun partido enfrenta a un jugador consigo mismo', () => {
    const schedule = generateLeagueSchedule(players(7), true);

    schedule.forEach((round) =>
      round.matches.forEach((m) => expect(m.playerOneId).not.toBe(m.playerTwoId)),
    );
  });

  it('numera las jornadas desde 1 de forma consecutiva', () => {
    const schedule = generateLeagueSchedule(players(6), true);

    expect(schedule.map((r) => r.round)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
  });

  describe('ida y vuelta', () => {
    it('duplica las jornadas y cada pareja se enfrenta dos veces', () => {
      const schedule = generateLeagueSchedule(players(4), true);
      const keys = schedule.flatMap((r) => r.matches.map((m) => pairKey(m.playerOneId, m.playerTwoId)));

      expect(schedule).toHaveLength(6);
      expect(keys).toHaveLength(12);
      keys.forEach((k) => expect(keys.filter((x) => x === k)).toHaveLength(2));
    });

    it('la vuelta repite las jornadas de la ida con los jugadores intercambiados', () => {
      const schedule = generateLeagueSchedule(players(4), true);
      const ida = schedule.slice(0, 3);
      const vuelta = schedule.slice(3);

      vuelta.forEach((round, i) => {
        expect(round.matches).toEqual(
          ida[i].matches.map((m) => ({ playerOneId: m.playerTwoId, playerTwoId: m.playerOneId })),
        );
      });
    });

    it('con numero impar de jugadores tambien duplica las jornadas', () => {
      expect(generateLeagueSchedule(players(5), true)).toHaveLength(10);
    });
  });

  it('es determinista: la misma entrada da el mismo calendario', () => {
    expect(generateLeagueSchedule(players(8), true)).toEqual(generateLeagueSchedule(players(8), true));
  });

  it('no modifica la lista de jugadores recibida', () => {
    const input = players(5);
    const copy = [...input];

    generateLeagueSchedule(input, true);

    expect(input).toEqual(copy);
  });

  it('lanza un error con menos de 2 jugadores', () => {
    expect(() => generateLeagueSchedule([], false)).toThrow();
    expect(() => generateLeagueSchedule(['a'], false)).toThrow();
  });

  it('lanza un error si hay jugadores repetidos', () => {
    expect(() => generateLeagueSchedule(['a', 'b', 'a'], false)).toThrow();
  });
});

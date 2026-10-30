import { describe, it, expect } from 'vitest';
import {
  bestOfLabel,
  groupMatchesByRound,
  leagueProgress,
  matchSetsSummary,
  playerFullName,
} from './leagueView';
import type { LeagueMatch } from '../types/league';

const match = (overrides: Record<string, unknown> = {}): LeagueMatch =>
  ({
    id: 'm',
    leagueId: 'l1',
    round: 1,
    matchOrder: 1,
    walkover: false,
    status: 'Programado',
    playerOneId: 'a',
    playerTwoId: 'b',
    dateStart: '2026-11-01',
    ...overrides,
  }) as LeagueMatch;

describe('bestOfLabel', () => {
  it.each([
    [1, 'Mejor de 1 set'],
    [2, 'Mejor de 3 sets'],
    [3, 'Mejor de 5 sets'],
    [4, 'Mejor de 7 sets'],
  ])('con %i sets para ganar dice "%s"', (setsToWin, label) => {
    expect(bestOfLabel(setsToWin)).toBe(label);
  });
});

describe('groupMatchesByRound', () => {
  it('agrupa por jornada en orden ascendente y respeta el orden de los partidos', () => {
    const rounds = groupMatchesByRound([
      match({ id: 'c', round: 2, matchOrder: 3 }),
      match({ id: 'b', round: 1, matchOrder: 2 }),
      match({ id: 'a', round: 1, matchOrder: 1 }),
    ]);

    expect(rounds.map((r) => r.round)).toEqual([1, 2]);
    expect(rounds[0].matches.map((m) => m.id)).toEqual(['a', 'b']);
    expect(rounds[1].matches.map((m) => m.id)).toEqual(['c']);
  });

  it('devuelve una lista vacía sin partidos', () => {
    expect(groupMatchesByRound([])).toEqual([]);
  });

  it('no modifica la lista recibida', () => {
    const input = [match({ id: 'b', round: 2 }), match({ id: 'a', round: 1 })];
    const copy = [...input];

    groupMatchesByRound(input);

    expect(input).toEqual(copy);
  });
});

describe('leagueProgress', () => {
  it('cuenta los completados sobre el total sin contar los cancelados', () => {
    const progress = leagueProgress([
      match({ status: 'Completado' }),
      match({ status: 'Completado' }),
      match({ status: 'Programado' }),
      match({ status: 'Cancelado' }),
    ]);

    expect(progress).toEqual({ played: 2, total: 3 });
  });

  it('sin partidos es 0 de 0', () => {
    expect(leagueProgress([])).toEqual({ played: 0, total: 0 });
  });
});

describe('matchSetsSummary', () => {
  it('muestra los sets ganados de cada jugador en un partido completado', () => {
    const summary = matchSetsSummary(
      match({
        status: 'Completado',
        setOnePlayerOne: 11,
        setOnePlayerTwo: 5,
        setTwoPlayerOne: 7,
        setTwoPlayerTwo: 11,
        setThreePlayerOne: 11,
        setThreePlayerTwo: 9,
      }),
    );

    expect(summary).toBe('2 - 1');
  });

  it('un W.O. se muestra como W.O. y no como marcador', () => {
    expect(
      matchSetsSummary(
        match({ status: 'Completado', walkover: true, setOnePlayerOne: 11, setOnePlayerTwo: 0 }),
      ),
    ).toBe('W.O.');
  });

  it.each(['Programado', 'Iniciado', 'Cancelado'] as const)(
    'un partido %s no tiene marcador',
    (status) => {
      expect(matchSetsSummary(match({ status }))).toBe('—');
    },
  );
});

describe('playerFullName', () => {
  it('une nombre y apellido', () => {
    expect(playerFullName({ name: 'Ana', surname: 'Ruiz' })).toBe('Ana Ruiz');
  });

  it('sin apellido deja solo el nombre, sin espacios sobrantes', () => {
    expect(playerFullName({ name: 'Ana', surname: null })).toBe('Ana');
  });

  it('sin jugador devuelve un texto por defecto', () => {
    expect(playerFullName(null)).toBe('Jugador');
    expect(playerFullName(undefined)).toBe('Jugador');
  });
});

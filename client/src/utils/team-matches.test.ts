import { describe, it, expect } from 'vitest';
import type { TeamMatch } from '../types/api';
import { getNextMatch, getTeamMatchOutcome } from './team-matches';

const NOW = new Date('2026-10-15T12:00:00.000Z');

const match = (id: string, date: string, status: TeamMatch['status'] = 'Programado'): TeamMatch => ({
  id,
  rivalName: `Rival ${id}`,
  date,
  isHome: true,
  status,
});

describe('getNextMatch', () => {
  it('devuelve el partido programado más próximo, aunque venga desordenado', () => {
    const matches = [
      match('lejano', '2026-12-01T10:00:00.000Z'),
      match('cercano', '2026-10-20T10:00:00.000Z'),
      match('medio', '2026-11-05T10:00:00.000Z'),
    ];

    expect(getNextMatch(matches, NOW)?.id).toBe('cercano');
  });

  it('ignora los partidos que no están programados', () => {
    const matches = [
      match('cancelado', '2026-10-16T10:00:00.000Z', 'Cancelado'),
      match('completado', '2026-10-17T10:00:00.000Z', 'Completado'),
      match('programado', '2026-10-30T10:00:00.000Z'),
    ];

    expect(getNextMatch(matches, NOW)?.id).toBe('programado');
  });

  it('ignora los partidos que ya pasaron', () => {
    const matches = [match('pasado', '2026-10-01T10:00:00.000Z')];

    expect(getNextMatch(matches, NOW)).toBeNull();
  });

  it('un partido justo a la hora actual todavía cuenta', () => {
    const matches = [match('ahora', NOW.toISOString())];

    expect(getNextMatch(matches, NOW)?.id).toBe('ahora');
  });

  it('sin partidos devuelve null', () => {
    expect(getNextMatch([], NOW)).toBeNull();
  });

  it('no modifica la lista original', () => {
    const matches = [match('b', '2026-11-05T10:00:00.000Z'), match('a', '2026-10-20T10:00:00.000Z')];

    getNextMatch(matches, NOW);

    expect(matches.map((m) => m.id)).toEqual(['b', 'a']);
  });
});

describe('getTeamMatchOutcome', () => {
  const played = (ourScore: number | null, rivalScore: number | null, status: TeamMatch['status'] = 'Completado') =>
    ({ ...match('m', '2026-10-01T10:00:00.000Z', status), ourScore, rivalScore }) as TeamMatch;

  it('una victoria es verde', () => {
    expect(getTeamMatchOutcome(played(6, 4))).toEqual({
      hasScore: true,
      isWin: true,
      isLoss: false,
      statusColor: 'green',
    });
  });

  it('una derrota es roja', () => {
    expect(getTeamMatchOutcome(played(3, 5))).toEqual({
      hasScore: true,
      isWin: false,
      isLoss: true,
      statusColor: 'red',
    });
  });

  it('un empate es amarillo', () => {
    expect(getTeamMatchOutcome(played(5, 5))).toMatchObject({ isWin: false, isLoss: false, statusColor: 'yellow' });
  });

  it('un partido completado sin marcador no tiene resultado y es amarillo', () => {
    expect(getTeamMatchOutcome(played(null, null))).toMatchObject({ hasScore: false, isWin: false, isLoss: false, statusColor: 'yellow' });
  });

  it('un partido programado es azul y uno cancelado, rojo, tengan o no marcador', () => {
    expect(getTeamMatchOutcome(played(null, null, 'Programado')).statusColor).toBe('blue');
    expect(getTeamMatchOutcome(played(null, null, 'Cancelado')).statusColor).toBe('red');
    expect(getTeamMatchOutcome(played(2, 0, 'Programado')).statusColor).toBe('blue');
  });
});

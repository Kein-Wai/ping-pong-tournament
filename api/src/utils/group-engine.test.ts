import { describe, it, expect } from 'vitest';
import { buildGroupsEngine, TournamentSeed } from './group-engine';

/** Jugadores con semilla descendente: el 1 es el mejor. */
const buildPlayers = (numPlayers: number): TournamentSeed[] =>
  Array.from({ length: numPlayers }, (_, index) => ({
    id: `p${index + 1}`,
    seedValue: (numPlayers - index) * 100,
  }));

describe('Reparto en grupos (api/src/utils/group-engine.ts)', () => {
  it('reparte en serpentina: los mejores se alternan entre los grupos', () => {
    const groups = buildGroupsEngine(buildPlayers(8), 4);

    expect(groups.map((group) => group.players)).toEqual([
      ['p1', 'p8'],
      ['p2', 'p7'],
      ['p3', 'p6'],
      ['p4', 'p5'],
    ]);
  });

  it('ordena a los jugadores por su valor de semilla', () => {
    const players: TournamentSeed[] = [
      { id: 'débil', seedValue: 100 },
      { id: 'fuerte', seedValue: 900 },
      { id: 'medio', seedValue: 500 },
    ];

    const groups = buildGroupsEngine(players, 1);

    expect(groups[0].players).toEqual(['fuerte', 'medio', 'débil']);
  });

  it('con un solo grupo mete a todos los jugadores', () => {
    const groups = buildGroupsEngine(buildPlayers(5), 1);

    expect(groups).toHaveLength(1);
    expect(groups[0].players).toEqual(['p1', 'p2', 'p3', 'p4', 'p5']);
  });

  it('numera los grupos desde el 1', () => {
    const groups = buildGroupsEngine(buildPlayers(8), 4);

    expect(groups.map((group) => group.groupIndex)).toEqual([1, 2, 3, 4]);
  });

  it('genera los british rounds con la matriz matematica', () => {
    const groups = buildGroupsEngine(buildPlayers(4), 1);

    expect(groups[0].matches).toEqual([
      { playerOneId: 'p1', playerTwoId: 'p3' },
      { playerOneId: 'p2', playerTwoId: 'p4' },
      { playerOneId: 'p1', playerTwoId: 'p2' },
      { playerOneId: 'p3', playerTwoId: 'p4' },
      { playerOneId: 'p1', playerTwoId: 'p4' },
      { playerOneId: 'p2', playerTwoId: 'p3' },
    ]);
  });

  it('un grupo de dos jugadores genera un solo partido', () => {
    const groups = buildGroupsEngine(buildPlayers(2), 1);

    expect(groups[0].matches).toEqual([{ playerOneId: 'p1', playerTwoId: 'p2' }]);
  });

  it('un grupo de tres jugadores genera tres partidos', () => {
    const groups = buildGroupsEngine(buildPlayers(3), 1);

    expect(groups[0].matches).toEqual([
      { playerOneId: 'p1', playerTwoId: 'p3' },
      { playerOneId: 'p1', playerTwoId: 'p2' },
      { playerOneId: 'p2', playerTwoId: 'p3' },
    ]);
  });

  it('no muta la lista de jugadores de entrada', () => {
    const players = buildPlayers(8);
    const snapshot = JSON.stringify(players);

    buildGroupsEngine(players, 4);

    expect(JSON.stringify(players)).toBe(snapshot);
  });
});

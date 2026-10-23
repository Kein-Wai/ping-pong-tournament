import { describe, it, expect } from 'vitest';
import { computeTournamentFlags, computePodium, computeGroupOptions, groupNumbersToOptions } from './tournament-flags';
import type { Tournament, TournamentClas, TournamentGroupClas } from '../types/tournament';

const baseTournament = (over: Partial<Tournament> = {}): Tournament =>
  ({
    id: 't1',
    name: 'Torneo Test',
    dateStart: '2024-01-01',
    numPlayers: 16,
    status: 'Programado',
    rounds: 'GruposKnockout',
    typeKnockout: 'LlaveA',
    ...over,
  } as Tournament);

const makeClas = (position: number | null, id: string, name: string): TournamentClas => ({
  id,
  position,
  lastRound: null,
  player: { id, name, surname: null, stats: { elo: 100 }, avatarUrl: null },
});

const makeGroupClas = (group: number, id: string): TournamentGroupClas => ({
  id,
  position: 1,
  pointsClas: 0,
  played: 0,
  gamesWon: 0,
  gamesLost: 0,
  setsWon: 0,
  setsLost: 0,
  pointsWon: 0,
  pointsLost: 0,
  tournamentGroup: { group },
  player: { id, name: 'P', surname: null, stats: { elo: 100 }, avatarUrl: null },
});

describe('computeTournamentFlags', () => {
  it('Programado + GruposKnockout activa flags correctos', () => {
    const flags = computeTournamentFlags(baseTournament({ status: 'Programado', rounds: 'GruposKnockout' }));
    expect(flags.isProgramado).toBe(true);
    expect(flags.isGrupos).toBe(false);
    expect(flags.isKnockoutPhase).toBe(false);
    expect(flags.isCompletado).toBe(false);
    expect(flags.hasGroupsFormat).toBe(true);
    expect(flags.hasKnockoutFormat).toBe(true);
  });

  it('estado Grupos activa isGrupos', () => {
    const { isGrupos, isKnockoutPhase } = computeTournamentFlags(
      baseTournament({ status: 'Grupos', rounds: 'GruposKnockout' }),
    );
    expect(isGrupos).toBe(true);
    expect(isKnockoutPhase).toBe(false);
  });

  it('ronda knockout (Octavos) activa isKnockoutPhase', () => {
    const { isKnockoutPhase, isCompletado } = computeTournamentFlags(
      baseTournament({ status: 'Octavos', rounds: 'Knockout' }),
    );
    expect(isKnockoutPhase).toBe(true);
    expect(isCompletado).toBe(false);
  });

  it('estado Completado activa isCompletado', () => {
    const { isCompletado, isProgramado } = computeTournamentFlags(
      baseTournament({ status: 'Completado', rounds: 'GruposKnockout' }),
    );
    expect(isCompletado).toBe(true);
    expect(isProgramado).toBe(false);
  });

  it('rounds TodosvsTodos implica hasGroupsFormat y no hasKnockoutFormat', () => {
    const { hasGroupsFormat, hasKnockoutFormat } = computeTournamentFlags(
      baseTournament({ status: 'Grupos', rounds: 'TodosvsTodos' }),
    );
    expect(hasGroupsFormat).toBe(true);
    expect(hasKnockoutFormat).toBe(false);
  });

  it('rounds Knockout implica hasKnockoutFormat', () => {
    const { hasKnockoutFormat, hasGroupsFormat } = computeTournamentFlags(
      baseTournament({ status: 'Octavos', rounds: 'Knockout' }),
    );
    expect(hasKnockoutFormat).toBe(true);
    expect(hasGroupsFormat).toBe(false);
  });

  it('tournament null devuelve todos los flags falsos', () => {
    expect(computeTournamentFlags(null)).toEqual({
      isProgramado: false,
      isGrupos: false,
      isKnockoutPhase: false,
      isCompletado: false,
      hasGroupsFormat: false,
      hasKnockoutFormat: false,
    });
  });
});

describe('computePodium', () => {
  it('devuelve nulls cuando no hay resultados', () => {
    expect(computePodium(null)).toEqual({
      firstPlace: null,
      secondPlace: null,
      thirdPlace: null,
      otherResults: [],
    });
  });

  it('coloca primero, segundo y tercero por posicion', () => {
    const results = [makeClas(1, 'p1', 'A'), makeClas(2, 'p2', 'B'), makeClas(3, 'p3', 'C'), makeClas(4, 'p4', 'D')];
    const podium = computePodium(results);
    expect(podium.firstPlace?.id).toBe('p1');
    expect(podium.secondPlace?.id).toBe('p2');
    expect(podium.thirdPlace?.id).toBe('p3');
    expect(podium.otherResults).toHaveLength(1);
    expect(podium.otherResults[0].id).toBe('p4');
  });

  it('solo toma el primer tercero cuando hay empate en posicion 3', () => {
    const results = [makeClas(3, 'p3a', 'A'), makeClas(3, 'p3b', 'B')];
    const podium = computePodium(results);
    expect(podium.thirdPlace?.id).toBe('p3a');
    expect(podium.otherResults).toHaveLength(1);
    expect(podium.otherResults[0].id).toBe('p3b');
  });

  it('ordena otherResults por posicion ascendente', () => {
    const results = [makeClas(5, 'p5', 'A'), makeClas(1, 'p1', 'B'), makeClas(7, 'p7', 'C')];
    const { otherResults } = computePodium(results);
    expect(otherResults.map((r) => r.position)).toEqual([5, 7]);
  });

  it('maneja position null en otherResults', () => {
    const results = [makeClas(1, 'p1', 'A'), { ...makeClas(null, 'pn', 'N'), position: null }];
    const { otherResults } = computePodium(results);
    expect(otherResults).toHaveLength(1);
    expect(otherResults[0].id).toBe('pn');
  });
});

describe('computeGroupOptions', () => {
  it('devuelve [] cuando no hay clasificaciones', () => {
    expect(computeGroupOptions(null)).toEqual([]);
  });

  it('genera opciones unicas ordenadas por numero de grupo', () => {
    const groupsClas = [
      makeGroupClas(3, 'g1'),
      makeGroupClas(1, 'g2'),
      makeGroupClas(3, 'g3'),
    ];
    expect(computeGroupOptions(groupsClas)).toEqual([
      { value: '1', label: 'Grupo 1' },
      { value: '3', label: 'Grupo 3' },
    ]);
  });
});

describe('groupNumbersToOptions', () => {
  it('devuelve [] para una lista vacia', () => {
    expect(groupNumbersToOptions([])).toEqual([]);
  });

  it('deduplica y ordena ascendente', () => {
    expect(groupNumbersToOptions([3, 1, 3, 2])).toEqual([
      { value: '1', label: 'Grupo 1' },
      { value: '2', label: 'Grupo 2' },
      { value: '3', label: 'Grupo 3' },
    ]);
  });
});


import { describe, it, expect } from 'vitest';
import type { User } from '../types/api';
import type {
  PlayerPendingSkills,
  PlayerProfile,
  PlayerSkillValues,
  ProfileMatch,
} from '../types/playerProfile';
import {
  countAttendances,
  getEfficiencyData,
  getMatchResult,
  getRivalChartData,
  getSkillsData,
  getTeamCalendar,
} from './player-profile';

type Sets = Array<[number | null, number | null]>;

const ME = { id: 'p1', name: 'Luis', dominantHand: 'Diestro', playstyle: 'Ofensivo' } as User;
const rival = (id: string, dominantHand: User['dominantHand'], playstyle: User['playstyle']) =>
  ({ id, name: id, surname: 'R', dominantHand, playstyle }) as User;

const SET_KEYS = [
  ['setOnePlayerOne', 'setOnePlayerTwo'],
  ['setTwoPlayerOne', 'setTwoPlayerTwo'],
  ['setThreePlayerOne', 'setThreePlayerTwo'],
  ['setFourPlayerOne', 'setFourPlayerTwo'],
  ['setFivePlayerOne', 'setFivePlayerTwo'],
] as const;

/** Partido en el que `p1` es siempre el jugador uno salvo que se indique lo contrario. */
const match = (sets: Sets, opponent: User, asPlayerOne = true): ProfileMatch => {
  const scores = Object.fromEntries(
    SET_KEYS.flatMap(([a, b], i) => [
      [a, sets[i]?.[0] ?? null],
      [b, sets[i]?.[1] ?? null],
    ]),
  );
  return {
    id: 'm',
    dateStart: '2026-10-01T10:00:00.000Z',
    status: 'Completado',
    playerOneId: asPlayerOne ? 'p1' : opponent.id,
    playerTwoId: asPlayerOne ? opponent.id : 'p1',
    playerOne: asPlayerOne ? ME : opponent,
    playerTwo: asPlayerOne ? opponent : ME,
    ...scores,
  } as unknown as ProfileMatch;
};

describe('getMatchResult', () => {
  const zoe = rival('r1', 'Zurdo', 'Defensivo');

  it('una victoria 3-0 como jugador uno', () => {
    const result = getMatchResult(match([[11, 5], [11, 6], [11, 7]], zoe), 'p1');

    expect(result).toMatchObject({ didWin: true, setScore: '3 - 0' });
    expect(result.opponent).toBe(zoe);
  });

  it('una derrota 1-3 como jugador dos: el marcador se muestra desde el punto de vista del jugador', () => {
    const dani = rival('r2', 'Diestro', 'Ofensivo');
    const result = getMatchResult(
      match([[11, 5], [11, 6], [9, 11], [11, 8]], dani, false),
      'p1',
    );

    expect(result).toMatchObject({ didWin: false, setScore: '1 - 3' });
    expect(result.opponent).toBe(dani);
  });

  it('ignora los sets sin jugar (null) y los 0-0', () => {
    const result = getMatchResult(match([[11, 5], [0, 0], [null, null], [11, 9]], zoe), 'p1');

    expect(result.setScore).toBe('2 - 0');
  });

  it('un empate a sets cuenta como derrota', () => {
    const result = getMatchResult(match([[11, 5], [5, 11]], zoe), 'p1');

    expect(result).toMatchObject({ didWin: false, setScore: '1 - 1' });
  });

  it('un set ganado por el rival suma al rival', () => {
    const result = getMatchResult(match([[7, 11]], zoe), 'p1');

    expect(result.setScore).toBe('0 - 1');
  });
});

describe('getRivalChartData', () => {
  const zurdoDefensivo = rival('r1', 'Zurdo', 'Defensivo');
  const diestroOfensivo = rival('r2', 'Diestro', 'Ofensivo');
  const win = [[11, 5], [11, 6]] as Sets;
  const loss = [[5, 11], [6, 11]] as Sets;

  it('reparte victorias y derrotas por mano y por estilo del rival', () => {
    const matches = [
      match(win, zurdoDefensivo),
      match(win, zurdoDefensivo),
      match(loss, zurdoDefensivo),
      // Como jugador dos, los sets 11-5 y 11-6 los gana el rival: derrota.
      match(win, diestroOfensivo, false),
    ];

    const { mano, estilo } = getRivalChartData(matches, 'p1');

    expect(mano).toEqual([
      { Rasgo: 'vs Diestros', Victorias: 0, Derrotas: 1 },
      { Rasgo: 'vs Zurdos', Victorias: 2, Derrotas: 1 },
    ]);
    expect(estilo).toEqual([
      { Rasgo: 'vs Ofensivos', Victorias: 0, Derrotas: 1 },
      { Rasgo: 'vs Defensivos', Victorias: 2, Derrotas: 1 },
    ]);
  });

  it('un rival sin mano o estilo registrados no cuenta', () => {
    const sinDatos = rival('r3', null, null);

    const { mano, estilo } = getRivalChartData([match(win, sinDatos)], 'p1');

    expect(mano.map((row) => row.Victorias + row.Derrotas)).toEqual([0, 0]);
    expect(estilo.map((row) => row.Victorias + row.Derrotas)).toEqual([0, 0]);
  });

  it('sin partidos devuelve las cuatro filas a cero', () => {
    const { mano, estilo } = getRivalChartData([], 'p1');

    expect(mano).toHaveLength(2);
    expect(estilo).toHaveLength(2);
    expect([...mano, ...estilo].every((row) => row.Victorias === 0 && row.Derrotas === 0)).toBe(true);
  });
});

describe('getEfficiencyData', () => {
  const stats = {
    elo: 1200,
    matchWon: 3,
    matchLost: 1,
    setWon: 9,
    setLost: 4,
    pointWon: 150,
    pointLost: 100,
    tournamentWon: 1,
    tournamentPart: 2,
  };

  it('sin partidos no hay datos', () => {
    expect(getEfficiencyData({ ...stats, matchWon: 0, matchLost: 0 })).toEqual([]);
    expect(getEfficiencyData(undefined)).toEqual([]);
  });

  it('calcula los porcentajes de partidos, sets, puntos y torneos', () => {
    expect(getEfficiencyData(stats)).toEqual([
      { metric: 'Partidos', Victorias: 75, Derrotas: 25 },
      { metric: 'Sets', Victorias: 69, Derrotas: 31 },
      { metric: 'Puntos', Victorias: 60, Derrotas: 40 },
      { metric: 'Campeon Torneos', Victorias: 50, Participaciones: 100 },
    ]);
  });

  it('sin sets, puntos ni torneos esas filas salen a cero', () => {
    const data = getEfficiencyData({
      ...stats,
      setWon: 0,
      setLost: 0,
      pointWon: 0,
      pointLost: 0,
      tournamentWon: 0,
      tournamentPart: 0,
    });

    expect(data.slice(1)).toEqual([
      { metric: 'Sets', Victorias: 0, Derrotas: 0 },
      { metric: 'Puntos', Victorias: 0, Derrotas: 0 },
      { metric: 'Campeon Torneos', Victorias: 0, Participaciones: 0 },
    ]);
  });
});

describe('getSkillsData', () => {
  const skills: PlayerSkillValues = {
    derechaPlano: 70,
    revesPlano: 65,
    topspinDerecha: 60,
    topspinReves: 55,
    corte: 50,
    bloqueoDerecha: 45,
    bloqueoReves: 40,
    servicio: 35,
    recepcion: 30,
    movilidad: 25,
    fortalezaMental: 20,
    experiencia: 15,
  };
  const noPending = Object.fromEntries(Object.keys(skills).map((k) => [k, null])) as PlayerPendingSkills;

  it('sin habilidades no hay datos', () => {
    expect(getSkillsData(undefined, noPending)).toEqual([]);
  });

  it('devuelve las doce habilidades con su etiqueta corta y en orden', () => {
    const data = getSkillsData(skills, noPending);

    expect(data.map((d) => d.attribute)).toEqual([
      'Plano Der.',
      'Plano Rev.',
      'Top Der.',
      'Top Rev.',
      'Corte',
      'Bloqueo Der.',
      'Bloqueo Rev.',
      'Servicio',
      'Recepción',
      'Movilidad',
      'Mentalidad',
      'Experiencia',
    ]);
    expect(data.map((d) => d.value)).toEqual([70, 65, 60, 55, 50, 45, 40, 35, 30, 25, 20, 15]);
  });

  it('suma la mejora pendiente para obtener el potencial', () => {
    const data = getSkillsData(skills, { ...noPending, derechaPlano: 1.5, servicio: 4 });

    expect(data[0]).toEqual({ attribute: 'Plano Der.', value: 70, pending: 1.5, potential: 71.5 });
    expect(data[7]).toEqual({ attribute: 'Servicio', value: 35, pending: 4, potential: 39 });
    expect(data[1]).toEqual({ attribute: 'Plano Rev.', value: 65, pending: 0, potential: 65 });
  });

  it('sin mejoras pendientes (undefined) el potencial es el valor', () => {
    const data = getSkillsData(skills, undefined);

    expect(data.every((d) => d.pending === 0 && d.potential === d.value)).toBe(true);
  });
});

describe('getTeamCalendar', () => {
  const NOW = new Date('2026-10-15T12:00:00.000Z');
  const teamMatch = (id: string, date: string, status = 'Programado') => ({
    id,
    rivalName: `Rival ${id}`,
    date,
    isHome: true,
    location: null,
    status,
  });
  const teams: PlayerProfile['teams'] = [
    {
      id: 't1',
      name: 'Equipo A',
      category: 'Senior',
      matches: [
        teamMatch('lejano', '2026-12-01T10:00:00.000Z'),
        teamMatch('proximo', '2026-10-20T10:00:00.000Z'),
        teamMatch('jugado', '2026-09-10T10:00:00.000Z', 'Completado'),
      ],
    },
    {
      id: 't2',
      name: 'Equipo B',
      category: 'Sub-18',
      matches: [teamMatch('b-pasado', '2026-10-01T10:00:00.000Z')],
    },
  ];

  it('junta los partidos de todos los equipos añadiendo el nombre del equipo', () => {
    const { all } = getTeamCalendar(teams, NOW);

    expect(all.map((m) => `${m.id}:${m.teamName}`)).toEqual([
      'lejano:Equipo A',
      'proximo:Equipo A',
      'jugado:Equipo A',
      'b-pasado:Equipo B',
    ]);
  });

  it('el siguiente compromiso es el programado más próximo que no ha pasado', () => {
    const { nextMatch } = getTeamCalendar(teams, NOW);

    expect(nextMatch?.id).toBe('proximo');
  });

  it('el resto va del más reciente al más antiguo, sin el siguiente compromiso', () => {
    const { others } = getTeamCalendar(teams, NOW);

    expect(others.map((m) => m.id)).toEqual(['lejano', 'b-pasado', 'jugado']);
  });

  it('sin equipos o sin partidos devuelve todo vacío', () => {
    expect(getTeamCalendar(undefined, NOW)).toEqual({ all: [], nextMatch: null, others: [] });
    expect(getTeamCalendar([], NOW)).toEqual({ all: [], nextMatch: null, others: [] });
  });

  it('un partido programado ya pasado no es el siguiente compromiso', () => {
    const { nextMatch, others } = getTeamCalendar(
      [{ id: 't', name: 'T', category: 'C', matches: [teamMatch('viejo', '2026-10-01T10:00:00.000Z')] }],
      NOW,
    );

    expect(nextMatch).toBeNull();
    expect(others.map((m) => m.id)).toEqual(['viejo']);
  });
});

describe('countAttendances', () => {
  const NOW = new Date('2026-10-15T12:00:00.000Z');
  const at = (date: string) => ({ generalTraining: { date } });

  it('cuenta el total y las del mes y año actuales', () => {
    const result = countAttendances(
      [at('2026-10-10T12:00:00.000Z'), at('2026-10-02T12:00:00.000Z'), at('2025-10-10T12:00:00.000Z'), at('2026-09-10T12:00:00.000Z')],
      NOW,
    );

    expect(result).toEqual({ total: 4, thisMonth: 2 });
  });

  it('sin asistencias devuelve ceros', () => {
    expect(countAttendances(undefined, NOW)).toEqual({ total: 0, thisMonth: 0 });
    expect(countAttendances([], NOW)).toEqual({ total: 0, thisMonth: 0 });
  });
});

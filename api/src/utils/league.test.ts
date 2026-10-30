import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { League, PrismaClient } from '@prisma/client';
import {
  buildWalkoverScore,
  cancelLeague,
  finalizeLeague,
  getLeagueStandings,
  startLeague,
  withdrawPlayer,
} from './league';
import { calculateMatchResults } from './match';
import { updateMatch } from './match-result';
import { ApiError } from '../http/response';

// Los efectos de guardar un resultado (ELO, estadisticas) tienen sus propios tests.
vi.mock('./match-result', () => ({ updateMatch: vi.fn() }));

const league = (overrides: Partial<League> = {}): League =>
  ({
    id: 'league-1',
    clubId: 'club-1',
    seasonId: 'season-1',
    dateStart: new Date('2026-11-01'),
    status: 'Programado',
    setsToWin: 2,
    doubleRound: false,
    ...overrides,
  }) as League;

const participants = (...entries: [string, string][]) =>
  entries.map(([playerId, status]) => ({ playerId, status }));

/** Cliente de pruebas: cada modelo es un vi.fn() y $transaction ejecuta el callback con el mismo cliente. */
const fakePrisma = () => {
  const client = {
    leagueParticipant: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      update: vi.fn(),
      deleteMany: vi.fn(),
    },
    league: { updateMany: vi.fn().mockResolvedValue({ count: 1 }), update: vi.fn() },
    match: { createMany: vi.fn(), findMany: vi.fn(), updateMany: vi.fn() },
    leagueClas: { findMany: vi.fn(), createMany: vi.fn(), deleteMany: vi.fn() },
    $transaction: vi.fn(),
  };
  client.$transaction.mockImplementation(async (callback: (tx: typeof client) => unknown) =>
    callback(client),
  );
  return client;
};

const asPrisma = (client: ReturnType<typeof fakePrisma>) => client as unknown as PrismaClient;

const rejectedWith = async (promise: Promise<unknown>): Promise<ApiError> => {
  try {
    await promise;
  } catch (error) {
    return error as ApiError;
  }
  throw new Error('Se esperaba un error');
};

describe('buildWalkoverScore', () => {
  it('da los sets necesarios al jugador uno con 11-0 en cada set', () => {
    const score = buildWalkoverScore(2, true);

    expect(score).toMatchObject({
      setOnePlayerOne: 11,
      setOnePlayerTwo: 0,
      setTwoPlayerOne: 11,
      setTwoPlayerTwo: 0,
      setThreePlayerOne: 0,
      setThreePlayerTwo: 0,
    });
  });

  it('da los sets al jugador dos cuando es el ganador', () => {
    const score = buildWalkoverScore(2, false);

    expect(score).toMatchObject({ setOnePlayerOne: 0, setOnePlayerTwo: 11 });
  });

  it.each([1, 2, 3, 4])('con %i sets para ganar el ganador se deduce de los sets', (setsToWin) => {
    const results = calculateMatchResults(buildWalkoverScore(setsToWin, false));

    expect(results.p2Sets).toBe(setsToWin);
    expect(results.p1Sets).toBe(0);
  });
});

describe('startLeague', () => {
  let prisma: ReturnType<typeof fakePrisma>;

  beforeEach(() => {
    prisma = fakePrisma();
  });

  const confirmed = (n: number) =>
    participants(...Array.from({ length: n }, (_, i): [string, string] => [`p${i + 1}`, 'Confirmado']));

  it('genera todos los partidos Programados con jornada, fecha de inicio y temporada', async () => {
    prisma.leagueParticipant.findMany.mockResolvedValue(confirmed(4));

    await startLeague(asPrisma(prisma), league());

    const { data } = prisma.match.createMany.mock.calls[0][0];
    expect(data).toHaveLength(6);
    data.forEach((m: Record<string, unknown>) => {
      expect(m).toMatchObject({
        leagueId: 'league-1',
        seasonId: 'season-1',
        status: 'Programado',
        dateStart: new Date('2026-11-01'),
      });
      expect(typeof m.round).toBe('number');
    });
    expect(new Set(data.map((m: { round: number }) => m.round))).toEqual(new Set([1, 2, 3]));
  });

  it('con ida y vuelta genera el doble de partidos', async () => {
    prisma.leagueParticipant.findMany.mockResolvedValue(confirmed(4));

    await startLeague(asPrisma(prisma), league({ doubleRound: true }));

    expect(prisma.match.createMany.mock.calls[0][0].data).toHaveLength(12);
  });

  it('descarta las inscripciones pendientes y pasa la liga a Iniciado con su número de jugadores', async () => {
    prisma.leagueParticipant.findMany.mockResolvedValue(confirmed(3));

    await startLeague(asPrisma(prisma), league());

    expect(prisma.leagueParticipant.deleteMany).toHaveBeenCalledWith({
      where: { leagueId: 'league-1', status: 'Pendiente' },
    });
    expect(prisma.league.updateMany.mock.calls[0][0]).toMatchObject({
      where: { id: 'league-1', status: 'Programado' },
      data: { status: 'Iniciado', numPlayers: 3 },
    });
  });

  it('exige al menos 3 jugadores confirmados y no escribe nada', async () => {
    prisma.leagueParticipant.findMany.mockResolvedValue(confirmed(2));

    const error = await rejectedWith(startLeague(asPrisma(prisma), league()));

    expect(error.status).toBe(400);
    expect(prisma.match.createMany).not.toHaveBeenCalled();
    expect(prisma.league.updateMany).not.toHaveBeenCalled();
  });

  it('responde 409 si otra petición ya inició la liga', async () => {
    prisma.leagueParticipant.findMany.mockResolvedValue(confirmed(4));
    prisma.league.updateMany.mockResolvedValue({ count: 0 });

    const error = await rejectedWith(startLeague(asPrisma(prisma), league()));

    expect(error.status).toBe(409);
    expect(prisma.match.createMany).not.toHaveBeenCalled();
  });
});

describe('finalizeLeague', () => {
  it('cancela los partidos pendientes, guarda la foto final y completa la liga', async () => {
    const prisma = fakePrisma();
    prisma.leagueParticipant.findMany.mockResolvedValue(
      participants(['a', 'Confirmado'], ['b', 'Confirmado'], ['c', 'NoPresentado']),
    );
    prisma.match.findMany.mockResolvedValue([
      { playerOneId: 'a', playerTwoId: 'b', status: 'Completado', walkover: false, setOnePlayerOne: 11, setOnePlayerTwo: 5, setTwoPlayerOne: 11, setTwoPlayerTwo: 7 },
    ]);

    await finalizeLeague(prisma as never, 'league-1');

    expect(prisma.match.findMany.mock.calls[0][0].where).toEqual({ leagueId: 'league-1', status: 'Completado' });

    expect(prisma.match.updateMany.mock.calls[0][0]).toMatchObject({
      where: { leagueId: 'league-1', status: { in: ['Programado', 'Iniciado', 'Abierto'] } },
      data: { status: 'Cancelado' },
    });
    const rows = prisma.leagueClas.createMany.mock.calls[0][0].data;
    expect(rows).toHaveLength(3);
    const byPlayer = Object.fromEntries(rows.map((r: { playerId: string }) => [r.playerId, r]));
    expect(byPlayer.a).toMatchObject({ leagueId: 'league-1', position: 1, pointsClas: 2, played: 1 });
    expect(byPlayer.b).toMatchObject({ position: 2, pointsClas: 1 });
    expect(byPlayer.c).toMatchObject({ position: 3, pointsClas: 0, played: 0 });
    expect(prisma.league.updateMany.mock.calls[0][0]).toMatchObject({
      where: { id: 'league-1', status: 'Iniciado' },
      data: { status: 'Completado' },
    });
  });

  it('si otra petición ya cerró la liga, no vuelve a escribir nada', async () => {
    const prisma = fakePrisma();
    prisma.league.updateMany.mockResolvedValue({ count: 0 });

    await finalizeLeague(prisma as never, 'league-1');

    expect(prisma.match.updateMany).not.toHaveBeenCalled();
    expect(prisma.leagueClas.deleteMany).not.toHaveBeenCalled();
    expect(prisma.leagueClas.createMany).not.toHaveBeenCalled();
  });

  it('sustituye una foto final anterior en vez de duplicarla', async () => {
    const prisma = fakePrisma();
    prisma.leagueParticipant.findMany.mockResolvedValue(participants(['a', 'Confirmado']));
    prisma.match.findMany.mockResolvedValue([]);

    await finalizeLeague(prisma as never, 'league-1');

    expect(prisma.leagueClas.deleteMany).toHaveBeenCalledWith({ where: { leagueId: 'league-1' } });
  });
});

describe('withdrawPlayer', () => {
  let prisma: ReturnType<typeof fakePrisma>;

  beforeEach(() => {
    prisma = fakePrisma();
    vi.mocked(updateMatch).mockReset();
    prisma.leagueParticipant.findUnique.mockResolvedValue({ playerId: 'b', status: 'Confirmado' });
  });

  it('marca al jugador como No presentado y da cada partido pendiente por W.O. al rival', async () => {
    prisma.match.findMany.mockResolvedValue([
      { id: 'm1', playerOneId: 'a', playerTwoId: 'b', status: 'Programado' },
      { id: 'm2', playerOneId: 'b', playerTwoId: 'c', status: 'Programado' },
    ]);

    await withdrawPlayer(asPrisma(prisma), league({ status: 'Iniciado' }), 'b');

    expect(prisma.leagueParticipant.update.mock.calls[0][0].data).toEqual({ status: 'NoPresentado' });
    const calls = vi.mocked(updateMatch).mock.calls;
    expect(calls).toHaveLength(2);
    const [, , data1] = calls[0];
    const [, , data2] = calls[1];
    expect(data1).toMatchObject({ status: 'Completado', walkover: true });
    expect(calculateMatchResults(data1 as never)).toMatchObject({ p1Sets: 2, p2Sets: 0 });
    expect(calculateMatchResults(data2 as never)).toMatchObject({ p1Sets: 0, p2Sets: 2 });
  });

  it('solo busca partidos pendientes del jugador en esta liga', async () => {
    prisma.match.findMany.mockResolvedValue([]);

    await withdrawPlayer(asPrisma(prisma), league({ status: 'Iniciado' }), 'b');

    const { where } = prisma.match.findMany.mock.calls[0][0];
    expect(where).toMatchObject({
      leagueId: 'league-1',
      status: { in: ['Programado', 'Iniciado', 'Abierto'] },
      OR: [{ playerOneId: 'b' }, { playerTwoId: 'b' }],
    });
  });

  it.each(['Programado', 'Completado', 'Cancelado'] as const)(
    'solo se puede retirar a un jugador de una liga Iniciada (no %s)',
    async (status) => {
      const error = await rejectedWith(withdrawPlayer(asPrisma(prisma), league({ status }), 'b'));

      expect(error.status).toBe(400);
      expect(updateMatch).not.toHaveBeenCalled();
    },
  );

  it('responde 404 si el jugador no participa', async () => {
    prisma.leagueParticipant.findUnique.mockResolvedValue(null);

    const error = await rejectedWith(withdrawPlayer(asPrisma(prisma), league({ status: 'Iniciado' }), 'b'));

    expect(error.status).toBe(404);
  });

  it('responde 400 si el jugador ya estaba retirado', async () => {
    prisma.leagueParticipant.findUnique.mockResolvedValue({ playerId: 'b', status: 'NoPresentado' });

    const error = await rejectedWith(withdrawPlayer(asPrisma(prisma), league({ status: 'Iniciado' }), 'b'));

    expect(error.status).toBe(400);
    expect(updateMatch).not.toHaveBeenCalled();
  });
});

describe('cancelLeague', () => {
  it.each(['Programado', 'Iniciado'] as const)('cancela una liga %s y sus partidos pendientes', async (status) => {
    const prisma = fakePrisma();

    await cancelLeague(asPrisma(prisma), league({ status }));

    expect(prisma.match.updateMany.mock.calls[0][0]).toMatchObject({
      where: { leagueId: 'league-1', status: { in: ['Programado', 'Iniciado', 'Abierto'] } },
      data: { status: 'Cancelado' },
    });
    expect(prisma.league.update.mock.calls[0][0].data).toEqual({ status: 'Cancelado' });
  });

  it.each(['Completado', 'Cancelado'] as const)('no cancela una liga %s', async (status) => {
    const prisma = fakePrisma();

    const error = await rejectedWith(cancelLeague(asPrisma(prisma), league({ status })));

    expect(error.status).toBe(400);
    expect(prisma.league.update).not.toHaveBeenCalled();
  });
});

describe('getLeagueStandings', () => {
  it('en una liga Iniciada calcula la tabla con los partidos completados, incluidos los retirados', async () => {
    const prisma = fakePrisma();
    prisma.leagueParticipant.findMany.mockResolvedValue(
      participants(['a', 'Confirmado'], ['b', 'Confirmado'], ['c', 'NoPresentado']),
    );
    prisma.match.findMany.mockResolvedValue([
      { playerOneId: 'a', playerTwoId: 'b', status: 'Completado', walkover: false, setOnePlayerOne: 11, setOnePlayerTwo: 5, setTwoPlayerOne: 11, setTwoPlayerTwo: 7 },
    ]);

    const result = await getLeagueStandings(asPrisma(prisma), league({ status: 'Iniciado' }));

    expect(result.final).toBe(false);
    expect(result.standings.map((s) => s.playerId)).toEqual(['a', 'b', 'c']);
    expect(result.standings[0]).toMatchObject({ position: 1, pointsClas: 2 });
    expect(prisma.match.findMany.mock.calls[0][0].where).toMatchObject({
      leagueId: 'league-1',
      status: 'Completado',
    });
  });

  it('en una liga Completada devuelve la foto final guardada', async () => {
    const prisma = fakePrisma();
    prisma.leagueClas.findMany.mockResolvedValue([
      { playerId: 'a', position: 1, pointsClas: 5, played: 3, gamesWon: 2, gamesLost: 1, setsWon: 4, setsLost: 2, pointsWon: 60, pointsLost: 40 },
    ]);

    const result = await getLeagueStandings(asPrisma(prisma), league({ status: 'Completado' }));

    expect(result.final).toBe(true);
    expect(result.standings).toEqual([
      expect.objectContaining({ playerId: 'a', position: 1, pointsClas: 5, played: 3 }),
    ]);
    expect(prisma.match.findMany).not.toHaveBeenCalled();
  });
});

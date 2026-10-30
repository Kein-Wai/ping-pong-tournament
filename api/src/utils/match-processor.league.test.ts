import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { Match, PrismaClient } from '@prisma/client';
import { processMatchResult } from './match-processor';
import { finalizeLeague } from './league';

// El cierre de la liga tiene sus propios tests (league.test.ts).
vi.mock('./league', () => ({ finalizeLeague: vi.fn() }));

const prisma = {
  league: { findUnique: vi.fn() },
  match: { count: vi.fn() },
  $transaction: vi.fn(),
};
const asPrisma = () => prisma as unknown as PrismaClient;

const leagueMatch = (overrides: Partial<Match> = {}): Match =>
  ({ id: 'm1', leagueId: 'league-1', tournamentId: null, status: 'Completado', ...overrides }) as Match;

describe('processMatchResult: partidos de liga', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    prisma.league.findUnique.mockResolvedValue({ id: 'league-1', status: 'Iniciado' });
    prisma.match.count.mockResolvedValue(0);
    prisma.$transaction.mockImplementation(async (callback: (tx: unknown) => unknown) => callback(prisma));
  });

  it('completa la liga cuando ya no quedan partidos pendientes', async () => {
    await processMatchResult(asPrisma(), leagueMatch());

    expect(prisma.match.count.mock.calls[0][0].where).toMatchObject({
      leagueId: 'league-1',
      status: { in: ['Programado', 'Iniciado', 'Abierto'] },
    });
    expect(finalizeLeague).toHaveBeenCalledWith(prisma, 'league-1');
  });

  it('no completa la liga mientras queden partidos pendientes', async () => {
    prisma.match.count.mockResolvedValue(2);

    await processMatchResult(asPrisma(), leagueMatch());

    expect(finalizeLeague).not.toHaveBeenCalled();
  });

  it.each(['Programado', 'Completado', 'Cancelado'])('no toca una liga que está %s', async (status) => {
    prisma.league.findUnique.mockResolvedValue({ id: 'league-1', status });

    await processMatchResult(asPrisma(), leagueMatch());

    expect(finalizeLeague).not.toHaveBeenCalled();
  });

  it('ignora un partido de liga que no está completado', async () => {
    await processMatchResult(asPrisma(), leagueMatch({ status: 'Programado' }));

    expect(prisma.league.findUnique).not.toHaveBeenCalled();
    expect(finalizeLeague).not.toHaveBeenCalled();
  });
});

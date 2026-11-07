import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { Prisma } from '@prisma/client';
import type { UserPayload } from '../middleware/auth.middleware';
import type { SyncManualMatchInput } from '../schemas/manualMatch';
import { syncManualMatch } from './manual-match-sync';

vi.mock('./season', () => ({ resolveCurrentSeason: vi.fn().mockResolvedValue({ id: 'season-1' }) }));
const completeManualMatch = vi.hoisted(() => vi.fn());
vi.mock('./manual-match-completion', () => ({ completeManualMatch }));

const MATCH_ID = '11111111-1111-4111-8111-111111111111';
const SYNC_1 = '22222222-2222-4222-8222-222222222222';
const SYNC_2 = '33333333-3333-4333-8333-333333333333';
const POINT_A = '44444444-4444-4444-8444-444444444444';

const PLAYER: UserPayload = { id: 'player-1', role: 'Player', clubId: 'club-1', clubStatus: 'Aprobado' } as UserPayload;
const COACH: UserPayload = { id: 'coach-1', role: 'AdminClub', clubId: 'club-1', clubStatus: 'Aprobado' } as UserPayload;

const input = (overrides: Partial<SyncManualMatchInput> = {}): SyncManualMatchInput => ({
  syncId: SYNC_1,
  baseVersion: null,
  match: {
    location: 'Casa',
    matchType: 'Amistoso',
    format: 'Individual',
    analysisType: 'Extenso',
    setsToWin: 3,
    opponentName: 'Rival',
    status: 'Iniciado',
  } as SyncManualMatchInput['match'],
  points: [{ id: POINT_A, setNumber: 1, pointOrder: 1, isWon: true }],
  result: null,
  ...overrides,
});

const existingRow = (overrides: Record<string, unknown> = {}) => ({
  id: MATCH_ID,
  userId: 'player-1',
  version: 3,
  status: 'Iniciado',
  lastSyncId: null,
  user: { clubId: 'club-1', clubStatus: 'Aprobado', userType: { name: 'Player' } },
  ...overrides,
});

const makeTx = (existing: unknown = null) => ({
  manualMatch: {
    findUnique: vi
      .fn()
      // 1.ª lectura: el partido existente (o null); 2.ª: el partido ya guardado para devolverlo.
      .mockResolvedValueOnce(existing)
      .mockResolvedValue({ id: MATCH_ID, version: 99, points: [] }),
    create: vi.fn().mockResolvedValue({}),
    update: vi.fn().mockResolvedValue({}),
  },
  pointAnalysis: {
    findMany: vi.fn().mockResolvedValue([]),
    deleteMany: vi.fn().mockResolvedValue({ count: 0 }),
    createMany: vi.fn().mockResolvedValue({ count: 1 }),
  },
  user: { findFirst: vi.fn() },
});

const run = (tx: ReturnType<typeof makeTx>, doc: SyncManualMatchInput, actor = PLAYER) =>
  syncManualMatch(tx as unknown as Prisma.TransactionClient, actor, MATCH_ID, doc);

describe('syncManualMatch', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    completeManualMatch.mockResolvedValue(true);
  });

  describe('partido creado sin conexión', () => {
    it('lo inserta con el id del móvil, versión 1 y sus puntos', async () => {
      const tx = makeTx(null);

      const outcome = await run(tx, input());

      expect(outcome.kind).toBe('ok');
      expect(tx.manualMatch.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          id: MATCH_ID,
          userId: 'player-1',
          seasonId: 'season-1',
          status: 'Iniciado',
          opponentName: 'Rival',
          version: 1,
          lastSyncId: SYNC_1,
        }),
      });
      expect(tx.pointAnalysis.createMany).toHaveBeenCalledWith({
        data: [expect.objectContaining({ id: POINT_A, manualMatchId: MATCH_ID, isWon: true })],
      });
    });

    it('si el móvil dice que ya existía una versión y no está, no lo crea', async () => {
      const tx = makeTx(null);

      const outcome = await run(tx, input({ baseVersion: 2 }));

      expect(outcome.kind).toBe('not-found');
      expect(tx.manualMatch.create).not.toHaveBeenCalled();
    });

    it('un entrenador lo crea a nombre de un jugador de su club', async () => {
      const tx = makeTx(null);
      tx.user.findFirst.mockResolvedValue({ id: 'player-9' });
      const doc = input();
      doc.match = { ...doc.match, playerId: 'player-9' };

      await run(tx, doc, COACH);

      expect(tx.manualMatch.create).toHaveBeenCalledWith({
        data: expect.objectContaining({ userId: 'player-9', coachId: 'coach-1' }),
      });
    });

    it('un jugador no puede crear el análisis de otro', async () => {
      const tx = makeTx(null);
      const doc = input();
      doc.match = { ...doc.match, playerId: 'player-9' };

      const outcome = await run(tx, doc, PLAYER);

      expect(outcome.kind).toBe('forbidden');
      expect(tx.manualMatch.create).not.toHaveBeenCalled();
    });

    it('un entrenador no puede crearlo para un jugador que no es de su club', async () => {
      const tx = makeTx(null);
      tx.user.findFirst.mockResolvedValue(null);
      const doc = input();
      doc.match = { ...doc.match, playerId: 'extraño' };

      expect((await run(tx, doc, COACH)).kind).toBe('not-found');
    });

    it('si llega finalizado lo guarda y lo completa con su resultado una sola vez', async () => {
      const tx = makeTx(null);
      const result = { mySets: 3, opponentSets: 0, setScores: [{ myScore: 11, oppScore: 2 }] };

      await run(tx, input({ match: { ...input().match, status: 'Completado' }, result }));

      expect(tx.manualMatch.create).toHaveBeenCalledWith({
        data: expect.objectContaining({ status: 'Iniciado' }),
      });
      expect(completeManualMatch).toHaveBeenCalledWith(tx, {
        matchId: MATCH_ID,
        userId: 'player-1',
        result,
      });
    });
  });

  describe('partido ya existente', () => {
    it('con la versión esperada reemplaza sus datos y sus puntos y sube la versión', async () => {
      const tx = makeTx(existingRow());

      const outcome = await run(tx, input({ baseVersion: 3, syncId: SYNC_2 }));

      expect(outcome.kind).toBe('ok');
      expect(tx.pointAnalysis.deleteMany).toHaveBeenCalledWith({ where: { manualMatchId: MATCH_ID } });
      expect(tx.pointAnalysis.createMany).toHaveBeenCalled();
      expect(tx.manualMatch.update).toHaveBeenCalledWith({
        where: { id: MATCH_ID },
        data: expect.objectContaining({
          opponentName: 'Rival',
          version: { increment: 1 },
          lastSyncId: SYNC_2,
        }),
      });
    });

    it('con otra versión responde conflicto y no toca nada', async () => {
      const tx = makeTx(existingRow({ version: 5 }));

      const outcome = await run(tx, input({ baseVersion: 3 }));

      expect(outcome.kind).toBe('conflict');
      expect(tx.manualMatch.update).not.toHaveBeenCalled();
      expect(tx.pointAnalysis.deleteMany).not.toHaveBeenCalled();
    });

    it('repetir un envío ya aplicado no cambia nada y devuelve el estado actual', async () => {
      const tx = makeTx(existingRow({ version: 4, lastSyncId: SYNC_1 }));

      const outcome = await run(tx, input({ baseVersion: 3, syncId: SYNC_1 }));

      expect(outcome.kind).toBe('ok');
      expect(tx.manualMatch.update).not.toHaveBeenCalled();
      expect(tx.pointAnalysis.deleteMany).not.toHaveBeenCalled();
      expect(completeManualMatch).not.toHaveBeenCalled();
    });

    it('un partido ya finalizado no admite otro envío distinto', async () => {
      const tx = makeTx(existingRow({ status: 'Completado' }));

      const outcome = await run(tx, input({ baseVersion: 3 }));

      expect(outcome.kind).toBe('conflict');
      expect(tx.manualMatch.update).not.toHaveBeenCalled();
    });

    it('finalizarlo suma las estadísticas al dueño del análisis, no a quien sincroniza', async () => {
      const tx = makeTx(existingRow({ userId: 'player-1' }));
      tx.user.findFirst.mockResolvedValue(null);
      const result = { mySets: 3, opponentSets: 1, setScores: null };
      const coachRow = existingRow();

      const withCoach = makeTx(coachRow);
      await run(
        withCoach,
        input({ baseVersion: 3, match: { ...input().match, status: 'Completado' }, result }),
        COACH,
      );

      expect(completeManualMatch).toHaveBeenCalledWith(
        withCoach,
        expect.objectContaining({ userId: 'player-1' }),
      );
    });

    it('si el usuario ya no tiene acceso al partido responde que no existe', async () => {
      const tx = makeTx(existingRow({ userId: 'otro', user: { clubId: 'club-2', clubStatus: 'Aprobado', userType: { name: 'Player' } } }));

      const outcome = await run(tx, input({ baseVersion: 3 }));

      expect(outcome.kind).toBe('not-found');
      expect(tx.manualMatch.update).not.toHaveBeenCalled();
    });

    it('rechaza puntos cuyo id ya pertenece a otro partido', async () => {
      const tx = makeTx(existingRow());
      tx.pointAnalysis.findMany.mockResolvedValue([{ id: POINT_A }]);

      const outcome = await run(tx, input({ baseVersion: 3 }));

      expect(outcome.kind).toBe('conflict');
      expect(tx.pointAnalysis.deleteMany).not.toHaveBeenCalled();
    });
  });
});

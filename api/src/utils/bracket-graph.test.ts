import { describe, it, expect, vi, beforeEach } from 'vitest';
import { KnockoutType, SortKnockout } from '@prisma/client';
import { createKnockoutDraw, saveKnockoutBracket } from '../../src/utils/knockout';
import { BYE_USER_ID, TBD_USER_ID } from '../../src/constants';

let idCounter = 1;
vi.mock('crypto', () => ({
  randomUUID: () => `M-${String(idCounter++).padStart(3, '0')}`,
}));

let capturedBrackets: any[] = [];

const prismaMock = {
  match: {
    findUnique: async ({ where }: any) => {
      for (const b of capturedBrackets) {
        const m = b.matches.find((x: any) => x.id === where.id);
        if (m) return m;
      }
      return null;
    },
    update: async ({ where, data }: any) => {
      for (const b of capturedBrackets) {
        const m = b.matches.find((x: any) => x.id === where.id);
        if (m) Object.assign(m, data);
      }
    },
    createMany: async ({ data }: any) => {
      capturedBrackets[capturedBrackets.length - 1].matches.push(...data);
      return { count: data.length };
    },
  },
  tournamentKnockout: {
    create: async ({ data }: any) => {
      const id = `KNOCKOUT_${data.positions}`;
      capturedBrackets.push({ knockoutId: id, ...data, matches: [] });
      return { id };
    },
  },
  tournament: {
    update: async () => {},
  },
  $transaction: async function (callback: any) {
    return callback(this);
  },
} as any;

const generateMockPlayers = (numPlayers: number) => {
  return Array.from({ length: numPlayers }).map((_, i) => ({
    id: `JUGADOR_${i + 1}`,
    playerId: `JUGADOR_${i + 1}`,
    position: 1,
    groupNumber: i + 1,
  }));
};

const printGraph = (numPlayers: number) => {
  console.log(`\n================================================================`);
  console.log(`🏆 GRAFO DE TUBERÍAS (FULL CASCADA) PARA ${numPlayers} JUGADORES 🏆`);
  console.log(`================================================================`);

  capturedBrackets.forEach((bracket) => {
    console.log(`\n📦 CAJA: ${bracket.round} | Puestos en Juego: [${bracket.positions}]`);
    console.log(`----------------------------------------------------------------`);

    bracket.matches.forEach((m: any) => {
      const p1 =
        m.playerOneId === BYE_USER_ID
          ? '👻 BYE'
          : m.playerOneId === TBD_USER_ID
            ? 'TBD'
            : m.playerOneId;
      const p2 =
        m.playerTwoId === BYE_USER_ID
          ? '👻 BYE'
          : m.playerTwoId === TBD_USER_ID
            ? 'TBD'
            : m.playerTwoId;

      const winnerPipe = m.winnerGoesToMatchId
        ? `🟢 Gana ➔ ${m.winnerGoesToMatchId}`
        : '🏆 FIN (Medalla)';
      const loserPipe = m.loserGoesToMatchId
        ? `🔴 Pierde ➔ ${m.loserGoesToMatchId}`
        : '🛑 FIN (Eliminado)';

      console.log(` [${m.id}] ${p1} vs ${p2}`);
      console.log(`         ↳ ${winnerPipe}`);
      console.log(`         ↳ ${loserPipe}`);
    });
  });
  console.log(`\n`);
};

describe('Motor de Grafo - Full Cascada', () => {
  beforeEach(() => {
    idCounter = 1;
    capturedBrackets = [];
    vi.clearAllMocks();
  });

  const testCases = [4, 8, 16, 23];

  testCases.forEach((numPlayers) => {
    it(`Debería tejer las tuberías para ${numPlayers} jugadores`, async () => {
      const players = generateMockPlayers(numPlayers);

      const firstRoundMatches = createKnockoutDraw(players, SortKnockout.Siembra, true);

      await saveKnockoutBracket(
        prismaMock,
        'TORNEO_TEST',
        KnockoutType.A,
        firstRoundMatches,
        new Date(),
        true,
      );

      printGraph(numPlayers);

      expect(capturedBrackets.length).toBeGreaterThan(0);
    });
  });
});

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { KnockoutType, SortKnockout } from '@prisma/client';
import { createKnockoutDraw, saveKnockoutBracket } from '../../src/utils/knockout';
import { BYE_USER_ID, TBD_USER_ID } from '../../src/constants';

// ============================================================================
// 🪄 TRUCO DE MAGIA: HACKEAMOS LA GENERACIÓN DE UUIDs
// Para que la consola sea legible por humanos (M-001, M-002...)
// ============================================================================
let idCounter = 1;
vi.mock('crypto', () => ({
  randomUUID: () => `M-${String(idCounter++).padStart(3, '0')}`,
}));

// ============================================================================
// MOCK DE PRISMA: Atrapamos los datos en el aire antes de que toquen la BD
// ============================================================================
let capturedBrackets: any[] = [];

const prismaMock = {
  match: {
    findUnique: async ({ where }: any) => {
      // Buscamos el partido en nuestra memoria capturada
      for (const b of capturedBrackets) {
        const m = b.matches.find((x: any) => x.id === where.id);
        if (m) return m;
      }
      return null;
    },
    update: async ({ where, data }: any) => {
      // Actualizamos al jugador que avanza (Cambiamos el TBD por el ID real)
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
    // Le pasamos nuestro propio prismaMock simulando ser la transacción (tx)
    return callback(this);
  },
} as any;

// Helper para crear jugadores rápidos
const generateMockPlayers = (numPlayers: number) => {
  return Array.from({ length: numPlayers }).map((_, i) => ({
    id: `JUGADOR_${i + 1}`,
    playerId: `JUGADOR_${i + 1}`,
    position: 1, // Simulamos que todos quedaron 1º (el seeding ya lo probamos)
    groupNumber: i + 1,
  }));
};

// ============================================================================
// HELPER VISUAL: Imprimir el grafo en la consola
// ============================================================================
const printGraph = (numPlayers: number) => {
  console.log(`\n================================================================`);
  console.log(`🏆 GRAFO DE TUBERÍAS (FULL CASCADA) PARA ${numPlayers} JUGADORES 🏆`);
  console.log(`================================================================`);

  capturedBrackets.forEach((bracket) => {
    console.log(`\n📦 CAJA: ${bracket.round} | Puestos en Juego: [${bracket.positions}]`);
    console.log(`----------------------------------------------------------------`);

    bracket.matches.forEach((m: any) => {
      // Limpiamos los nombres para la consola
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

// ============================================================================
// LOS TESTS
// ============================================================================
describe('Motor de Grafo - Full Cascada', () => {
  beforeEach(() => {
    // Reseteamos las memorias antes de cada test
    idCounter = 1;
    capturedBrackets = [];
    vi.clearAllMocks();
  });

  const testCases = [4, 8, 16, 23];

  testCases.forEach((numPlayers) => {
    it(`Debería tejer las tuberías para ${numPlayers} jugadores`, async () => {
      const players = generateMockPlayers(numPlayers);

      // 1. Generamos los cruces matemáticos (con Byes si faltan)
      const firstRoundMatches = createKnockoutDraw(players, SortKnockout.Siembra, true);

      // 2. Ejecutamos nuestra nueva función mágica que crea el Grafo
      await saveKnockoutBracket(
        prismaMock,
        'TORNEO_TEST',
        KnockoutType.A,
        firstRoundMatches,
        new Date(),
        true, // ¡ALLPOS ACTIVADO!
      );

      // 3. Imprimimos el resultado para tu deleite visual
      printGraph(numPlayers);

      // 4. Aserciones básicas
      expect(capturedBrackets.length).toBeGreaterThan(0);
    });
  });
});

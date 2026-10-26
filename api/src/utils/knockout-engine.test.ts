import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { MatchStatus, RoundKnockouts, SortKnockout } from '@prisma/client';
import {
  createKnockoutDraw,
  buildKnockoutBracketEngine,
  KnockoutSeed,
  ROUND_PROGRESSION,
} from './knockout-engine';

const { idCounter } = vi.hoisted(() => ({ idCounter: { value: 1 } }));

vi.mock('crypto', () => ({
  randomUUID: () => `M-${String(idCounter.value++).padStart(3, '0')}`,
}));

/** Jugadores repartidos en grupos, con su posicion dentro del grupo. */
const generatePlayers = (numPlayers: number, numGroups = 2): KnockoutSeed[] => {
  const players: KnockoutSeed[] = [];
  let currentGroup = 1;
  let currentPosition = 1;

  for (let i = 1; i <= numPlayers; i++) {
    players.push({
      id: `Jugador_${i}`,
      position: currentPosition,
      groupNumber: currentGroup,
    });

    currentGroup++;
    if (currentGroup > numGroups) {
      currentGroup = 1;
      currentPosition++;
    }
  }

  return players;
};

/** Partidos de primera ronda en los que se enfrentan dos jugadores del mismo grupo. */
const sameGroupPairs = (matches: ReturnType<typeof createKnockoutDraw>): number =>
  matches.filter(
    (match) =>
      match.playerOne &&
      match.playerTwo &&
      match.playerOne.groupNumber &&
      match.playerTwo.groupNumber &&
      match.playerOne.groupNumber === match.playerTwo.groupNumber,
  ).length;

describe('Motor de eliminatorias (api/src/utils/knockout-engine.ts)', () => {
  beforeEach(() => {
    idCounter.value = 1;
    vi.spyOn(Math, 'random').mockReturnValue(0.5);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('createKnockoutDraw', () => {
    it('lanza un error si no hay suficientes jugadores', () => {
      expect(() => createKnockoutDraw([], SortKnockout.Siembra)).toThrow(/suficientes/);
      expect(() =>
        createKnockoutDraw([{ id: 'p1', position: 1 }], SortKnockout.Siembra),
      ).toThrow(/suficientes/);
    });

    it('ajusta el cuadro a la siguiente potencia de dos', () => {
      const cases: Array<[number, number]> = [
        [6, 4],
        [9, 8],
        [12, 8],
        [16, 8],
        [23, 16],
        [32, 16],
      ];

      cases.forEach(([numPlayers, expectedMatches]) => {
        const matches = createKnockoutDraw(generatePlayers(numPlayers), SortKnockout.Siembra);
        expect(matches).toHaveLength(expectedMatches);
      });
    });

    it('rellena los huecos sobrantes con byes', () => {
      const matches = createKnockoutDraw(generatePlayers(6), SortKnockout.Siembra);

      const byes = matches.reduce(
        (total, match) => total + (match.playerOne ? 0 : 1) + (match.playerTwo ? 0 : 1),
        0,
      );

      expect(byes).toBe(2);
    });

    it('deja siempre al menos un jugador en cada partido', () => {
      const matches = createKnockoutDraw(generatePlayers(23), SortKnockout.Siembra);

      matches.forEach((match) => {
        expect(match.playerOne || match.playerTwo).toBeTruthy();
      });
    });

    it('con siembra aleatoria ocupa todos los huecos', () => {
      const matches = createKnockoutDraw(generatePlayers(8), SortKnockout.Aleatorio);

      expect(matches).toHaveLength(4);
      matches.forEach((match) => {
        expect(match.playerOne).toBeTruthy();
        expect(match.playerTwo).toBeTruthy();
        expect(match.isByeMatch).toBe(false);
      });
    });

    it('la siembra estandar coloca al mejor y al segundo en mitades opuestas', () => {
      // Un jugador por grupo: no hay cruces que resolver, asi que la siembra es
      // la estandar de la ITTF.
      const players = generatePlayers(8, 8);
      const matches = createKnockoutDraw(players, SortKnockout.Siembra);

      // El mejor abre el cuadro y el segundo queda en la otra mitad: solo
      // pueden enfrentarse en la final.
      expect(matches[0].playerOne?.id).toBe('Jugador_1');
      expect(matches[3].playerTwo?.id).toBe('Jugador_2');
    });

    it('evita que dos jugadores del mismo grupo se enfrenten en primera ronda', () => {
      const matches = createKnockoutDraw(generatePlayers(16, 4), SortKnockout.Siembra);

      expect(sameGroupPairs(matches)).toBe(0);
    });
  });

  describe('buildKnockoutBracketEngine', () => {
    it('devuelve el indice de la ronda inicial', () => {
      const firstRoundMatches = createKnockoutDraw(generatePlayers(8), SortKnockout.Siembra);
      const { initialRoundIndex } = buildKnockoutBracketEngine(firstRoundMatches, false);

      expect(initialRoundIndex).toBe(ROUND_PROGRESSION.indexOf(RoundKnockouts.Cuartos));
    });

    it('construye la ronda inicial con el tamaño del cuadro', () => {
      const firstRoundMatches = createKnockoutDraw(generatePlayers(8), SortKnockout.Siembra);
      const { brackets } = buildKnockoutBracketEngine(firstRoundMatches, false);

      expect(brackets[0].matches).toHaveLength(4);
      expect(brackets[0].posStart).toBe(1);
      expect(brackets[0].posEnd).toBe(8);
    });

    it('enlaza al ganador con un partido de la ronda siguiente', () => {
      const firstRoundMatches = createKnockoutDraw(generatePlayers(8), SortKnockout.Siembra);
      const { brackets } = buildKnockoutBracketEngine(firstRoundMatches, false);

      brackets[0].matches.forEach((match) => {
        expect(match.winnerGoesToMatchId).toBeTruthy();
        const targetExists = brackets.some((bracket) =>
          bracket.matches.some((candidate) => candidate.id === match.winnerGoesToMatchId),
        );
        expect(targetExists).toBe(true);
      });
    });

    it('marca como completados los partidos con bye', () => {
      const firstRoundMatches = createKnockoutDraw(generatePlayers(6), SortKnockout.Siembra);
      const { brackets } = buildKnockoutBracketEngine(firstRoundMatches, false);

      const byeMatches = brackets[0].matches.filter((match) => match.isBye);
      expect(byeMatches.length).toBeGreaterThan(0);
      byeMatches.forEach((match) => {
        expect(match.status).toBe(MatchStatus.Completado);
      });
    });

    it('sin posiciones para todos, el perdedor se clasifica directamente', () => {
      const firstRoundMatches = createKnockoutDraw(generatePlayers(8), SortKnockout.Siembra);
      const { brackets } = buildKnockoutBracketEngine(firstRoundMatches, false);

      const withLoserBracket = brackets[0].matches.filter((match) => match.loserGoesToMatchId);
      expect(withLoserBracket.length).toBe(0);
    });

    it('con posiciones para todos crea la ronda de perdedores', () => {
      const firstRoundMatches = createKnockoutDraw(generatePlayers(8), SortKnockout.Siembra);
      const { brackets } = buildKnockoutBracketEngine(firstRoundMatches, true);

      const withLoserBracket = brackets[0].matches.filter((match) => match.loserGoesToMatchId);
      expect(withLoserBracket.length).toBeGreaterThan(0);
    });
  });
});

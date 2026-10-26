import { describe, it, expect } from 'vitest';
import { assignFirstRound } from './knockout-assignment';
import { KnockoutSeed } from './knockout-engine';

/** Jugadores de un grupo: posicion dentro del grupo y grupo. */
const buildPlayers = (numPlayers: number, numGroups = 4): KnockoutSeed[] => {
  const players: KnockoutSeed[] = [];
  let currentGroup = 1;
  let currentPosition = 1;

  for (let i = 1; i <= numPlayers; i++) {
    players.push({
      id: `p${i}`,
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

/** En que mitad del cuadro cae un hueco. */
const halfOf = (slot: number, bracketSize: number): number =>
  Math.floor(slot / (bracketSize / 2));

/** En que cuarto del cuadro cae un hueco. */
const quarterOf = (slot: number, bracketSize: number): number =>
  Math.floor(slot / (bracketSize / 4));

/** Hueco que ocupa un jugador, por su id. */
const slotOf = (slots: (KnockoutSeed | null)[], id: string): number =>
  slots.findIndex((slot) => slot !== null && slot.id === id);

describe('Reparto de la primera ronda (api/src/utils/knockout-assignment.ts)', () => {
  describe('Anclaje estricto de las semillas 1 y 2', () => {
    it('las semillas 1 y 2 quedan fijas en mitades opuestas', () => {
      [4, 8, 16, 32, 64].forEach((bracketSize) => {
        const players = buildPlayers(bracketSize, bracketSize);
        const slots = assignFirstRound(players, bracketSize, () => 0.5);

        const first = slotOf(slots, 'p1');
        const second = slotOf(slots, 'p2');

        expect(halfOf(first, bracketSize)).not.toBe(halfOf(second, bracketSize));
      });
    });

    it('las semillas 1 y 2 no se mueven aunque haya que resolver un conflicto', () => {
      // Los cuatro primeros son del mismo grupo: hay que resolver el conflicto
      // sin desplazar a los cabezas de serie.
      const players = buildPlayers(8, 1);
      const slots = assignFirstRound(players, 8, () => 0.5);

      const first = slotOf(slots, 'p1');
      const second = slotOf(slots, 'p2');

      expect(first).toBe(0);
      expect(second).toBe(7);
    });
  });

  describe('Sorteo controlado de las semillas 3 y 4', () => {
    it('caen en mitades opuestas: una junto al 1 y otra junto al 2', () => {
      [8, 16, 32, 64].forEach((bracketSize) => {
        const players = buildPlayers(bracketSize, bracketSize);
        const slots = assignFirstRound(players, bracketSize, () => 0.5);

        const third = slotOf(slots, 'p3');
        const fourth = slotOf(slots, 'p4');

        expect(halfOf(third, bracketSize)).not.toBe(halfOf(fourth, bracketSize));
      });
    });

    it('en cada mitad, la semilla 3 o 4 cae en un cuarto distinto al del 1 o 2', () => {
      const bracketSize = 16;
      const players = buildPlayers(bracketSize, bracketSize);
      const slots = assignFirstRound(players, bracketSize, () => 0.5);

      const head = slotOf(slots, 'p1');
      const second = slotOf(slots, 'p2');
      const third = slotOf(slots, 'p3');
      const fourth = slotOf(slots, 'p4');

      // El 3 y el 4 se cruzan con el 1 o con el 2 en semifinales.
      const thirdPairsWith = halfOf(third, bracketSize) === halfOf(head, bracketSize) ? head : second;
      const fourthPairsWith = halfOf(fourth, bracketSize) === halfOf(head, bracketSize) ? head : second;

      expect(quarterOf(third, bracketSize)).not.toBe(quarterOf(thirdPairsWith, bracketSize));
      expect(quarterOf(fourth, bracketSize)).not.toBe(quarterOf(fourthPairsWith, bracketSize));
    });

    it('el reparto de las semillas 3 y 4 varia entre sorteos', () => {
      const bracketSize = 16;
      const players = buildPlayers(bracketSize, bracketSize);
      const placements = new Set<string>();

      for (let attempt = 0; attempt < 30; attempt++) {
        const slots = assignFirstRound(players, bracketSize);
        placements.add(`${slotOf(slots, 'p3')}-${slotOf(slots, 'p4')}`);
      }

      expect(placements.size).toBeGreaterThan(1);
    });
  });

  describe('Byes para los cabezas de serie mas altos', () => {
    it('con 12 jugadores en un cuadro de 16, los 4 byes son para el 1, 2, 3 y 4', () => {
      const bracketSize = 16;
      const players = buildPlayers(12, bracketSize);
      const slots = assignFirstRound(players, bracketSize, () => 0.5);

      const emptySlots = slots
        .map((slot, index) => (slot === null ? index : -1))
        .filter((index) => index >= 0);

      expect(emptySlots).toHaveLength(4);

      // Cada hueco vacio es el rival de una de las cuatro primeras semillas.
      ['p1', 'p2', 'p3', 'p4'].forEach((id) => {
        const playerSlot = slotOf(slots, id);
        const opponentSlot = playerSlot % 2 === 0 ? playerSlot + 1 : playerSlot - 1;

        expect(slots[opponentSlot]).toBeNull();
        expect(emptySlots).toContain(opponentSlot);
      });
    });

    it('las semillas con bye pasan solas a la siguiente ronda', () => {
      const bracketSize = 16;
      const players = buildPlayers(12, bracketSize);
      const slots = assignFirstRound(players, bracketSize, () => 0.5);

      ['p1', 'p2', 'p3', 'p4'].forEach((id) => {
        const playerSlot = slotOf(slots, id);
        const opponentSlot = playerSlot % 2 === 0 ? playerSlot + 1 : playerSlot - 1;

        expect(slots[playerSlot]).not.toBeNull();
        expect(slots[opponentSlot]).toBeNull();
      });
    });
  });

  describe('Anti-cruce de grupos', () => {
    it('no empareja a dos jugadores del mismo grupo en la primera ronda', () => {
      [
        [8, 2],
        [16, 4],
        [32, 4],
        [32, 8],
        [64, 8],
      ].forEach(([numPlayers, numGroups]) => {
        const players = buildPlayers(numPlayers, numGroups);
        const slots = assignFirstRound(players, numPlayers, () => 0.5);

        for (let index = 0; index < slots.length; index += 2) {
          const one = slots[index];
          const two = slots[index + 1];

          if (one && two) {
            expect(one.groupNumber).not.toBe(two.groupNumber);
          }
        }
      });
    });

    it('el resultado no depende del azar: el mismo azar da el mismo cuadro', () => {
      const players = buildPlayers(16, 4);

      const first = assignFirstRound(players, 16, () => 0.5);
      const second = assignFirstRound(players, 16, () => 0.5);

      expect(first.map((slot) => slot?.id ?? null)).toEqual(
        second.map((slot) => slot?.id ?? null),
      );
    });
  });
});

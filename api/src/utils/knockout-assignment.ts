import type { KnockoutSeed } from './knockout-engine';

/** Huecos de la primera ronda: un jugador o un hueco vacio (bye). */
export type FirstRoundSlots = (KnockoutSeed | null)[];

/**
 * Nivel de siembra de una semilla: 1 | 2 | 3-4 | 5-8 | 9-16 | 17-32…
 * Las semillas de un mismo nivel se sortean entre si; las de los niveles 0 y 1
 * (las semillas 1 y 2) son fijas.
 */
const levelOfSeed = (seed: number): number => Math.ceil(Math.log2(seed));

/**
 * Patron de siembra estandar de la ITTF: 1, 8, 5, 4, 3, 6, 7, 2 para un cuadro
 * de 8; 1, 16, 9, 8, 5, 12… para uno de 16.
 */
export const generateStandardSeedPattern = (size: number): number[] => {
  let seeds = [1, 2];

  for (let currentSize = 4; currentSize <= size; currentSize *= 2) {
    const nextSeeds: number[] = [];

    for (let i = 0; i < seeds.length; i++) {
      const seed = seeds[i];
      if (i % 2 === 0) {
        nextSeeds.push(seed);
        nextSeeds.push(currentSize - seed + 1);
      } else {
        nextSeeds.push(currentSize - seed + 1);
        nextSeeds.push(seed);
      }
    }
    seeds = nextSeeds;
  }

  return seeds;
};

const shuffleWith = <T>(items: T[], random: () => number): T[] => {
  const shuffled = [...items];

  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }

  return shuffled;
};

/**
 * Sorteo por bloques: dentro de cada nivel, las semillas se reparten al azar
 * entre los huecos de ese nivel.
 *
 * - El nivel 0 (semilla 1) y el nivel 1 (semilla 2) tienen un solo hueco: las
 *   semillas 1 y 2 quedan fijas en extremos opuestos del cuadro.
 * - El nivel 2 (semillas 3 y 4) se sortea entre sus dos huecos, que estan en
 *   mitades opuestas: asi cada una se cruza con el 1 o con el 2 en semifinales.
 * - Los niveles siguientes (5-8, 9-16, …) siguen la misma logica.
 */
const drawLevelBlocks = (pattern: number[], random: () => number): number[] => {
  const drawn = [...pattern];
  const slotsByLevel = new Map<number, number[]>();

  pattern.forEach((seed, slot) => {
    const level = levelOfSeed(seed);
    slotsByLevel.set(level, [...(slotsByLevel.get(level) ?? []), slot]);
  });

  for (const slots of slotsByLevel.values()) {
    if (slots.length < 2) continue;

    const shuffled = shuffleWith(
      slots.map((slot) => pattern[slot]),
      random,
    );
    slots.forEach((slot, index) => {
      drawn[slot] = shuffled[index];
    });
  }

  return drawn;
};

/** Coloca a los jugadores en los huecos: el puesto i ocupa el hueco de la semilla i. */
const placePlayers = (
  players: KnockoutSeed[],
  pattern: number[],
): FirstRoundSlots => {
  const slots: FirstRoundSlots = new Array(pattern.length).fill(null);
  const slotBySeed = new Map<number, number>();

  pattern.forEach((seed, slot) => slotBySeed.set(seed, slot));

  players.forEach((player, index) => {
    const slot = slotBySeed.get(index + 1);
    if (slot !== undefined) slots[slot] = player;
  });

  return slots;
};

/**
 * Los huecos vacios se emparejan con los cabezas de serie mas altos: el 1, luego
 * el 2, y asi sucesivamente. Cada uno se queda solo en su partido y pasa
 * directo a la siguiente ronda.
 *
 * Solo se desplazan los rivales: los cabezas de serie nunca se mueven.
 */
const placeByes = (slots: FirstRoundSlots, players: KnockoutSeed[]): void => {
  const byeCount = slots.length - players.length;
  if (byeCount <= 0) return;

  const reservedEmpty = new Set<number>();

  for (let rank = 0; rank < byeCount; rank++) {
    const headSeed = players[rank];
    const playerSlot = slots.findIndex((slot) => slot !== null && slot.id === headSeed.id);
    if (playerSlot === -1) continue;

    const opponentSlot = playerSlot % 2 === 0 ? playerSlot + 1 : playerSlot - 1;

    if (slots[opponentSlot] === null) {
      reservedEmpty.add(opponentSlot);
      continue;
    }

    const freeEmpty = slots.findIndex(
      (slot, index) => slot === null && !reservedEmpty.has(index) && index !== opponentSlot,
    );
    if (freeEmpty === -1) continue;

    // El rival se va al hueco vacio y su sitio queda para el bye.
    const displaced = slots[opponentSlot];
    slots[opponentSlot] = slots[freeEmpty];
    slots[freeEmpty] = displaced;
    reservedEmpty.add(opponentSlot);
  }
};

const sameGroup = (a: KnockoutSeed | null, b: KnockoutSeed | null): boolean =>
  Boolean(a && b && a.groupNumber && b.groupNumber && a.groupNumber === b.groupNumber);

/** Parejas de la primera ronda en las que se enfrentan dos jugadores del mismo grupo. */
const findConflictedPairs = (slots: FirstRoundSlots): number[] => {
  const pairs: number[] = [];

  for (let index = 0; index < slots.length; index += 2) {
    if (sameGroup(slots[index], slots[index + 1])) pairs.push(index);
  }

  return pairs;
};

/**
 * Busca al jugador al que se puede ceder el hueco en conflicto: uno de otro
 * grupo, que no mueva a los cabezas de serie y cuyo companero no quede en
 * conflicto con el jugador que se desplaza.
 */
const findDonorSlot = (
  slots: FirstRoundSlots,
  conflictedSlot: number,
  frozenSlots: number[],
): number => {
  const conflictedPlayer = slots[conflictedSlot];
  if (!conflictedPlayer) return -1;

  const conflictedPairStart = conflictedSlot - (conflictedSlot % 2);

  for (let candidate = 0; candidate < slots.length; candidate += 2) {
    if (candidate === conflictedPairStart) continue;

    for (const donorSlot of [candidate, candidate + 1]) {
      if (frozenSlots.includes(donorSlot)) continue;

      const donor = slots[donorSlot];
      if (!donor) continue;
      if (donor.groupNumber && donor.groupNumber === conflictedPlayer.groupNumber) continue;

      const donorPartnerSlot = donorSlot % 2 === 0 ? donorSlot + 1 : donorSlot - 1;
      if (
        donorPartnerSlot !== conflictedSlot &&
        sameGroup(conflictedPlayer, slots[donorPartnerSlot])
      ) {
        continue;
      }

      return donorSlot;
    }
  }

  return -1;
};

/**
 * Evita que dos jugadores del mismo grupo se enfrenten en la primera ronda.
 *
 * El metodo es una reparacion monotona: cada intercambio aceptado reduce
 * estrictamente el numero de parejas en conflicto, por lo que el algoritmo
 * termina y nunca oscila. Los dos cabezas de serie quedan congelados: no se
 * desplazan nunca, ni siquiera para resolver un conflicto.
 */
const resolveGroupConflicts = (
  slots: FirstRoundSlots,
  frozenSlots: number[],
): FirstRoundSlots => {
  const result = [...slots];

  for (;;) {
    const conflicts = findConflictedPairs(result);
    if (conflicts.length === 0) return result;

    let improved = false;

    for (const pairStart of conflicts) {
      const conflictedSlot = frozenSlots.includes(pairStart) ? pairStart + 1 : pairStart;
      const donorSlot = findDonorSlot(result, conflictedSlot, frozenSlots);
      if (donorSlot === -1) continue;

      const displaced = result[conflictedSlot];
      result[conflictedSlot] = result[donorSlot];
      result[donorSlot] = displaced;

      improved = true;
      break;
    }

    if (!improved) return result;
  }
};

/**
 * Reparte a los jugadores clasificados entre los huecos de la primera ronda.
 *
 * Modulo PURO: no toca la base de datos. Aplica las reglas de siembra:
 * 1 y 2 fijos en mitades opuestas, sorteo por bloques para el resto, byes para
 * los cabezas de serie mas altos y ningun emparejamiento del mismo grupo en
 * primera ronda.
 */
export const assignFirstRound = (
  rankedPlayers: KnockoutSeed[],
  bracketSize: number,
  random: () => number = Math.random,
): FirstRoundSlots => {
  const pattern = drawLevelBlocks(generateStandardSeedPattern(bracketSize), random);
  const slots = placePlayers(rankedPlayers, pattern);

  placeByes(slots, rankedPlayers);

  const slotBySeed = new Map<number, number>();
  pattern.forEach((seed, slot) => {
    if (!slotBySeed.has(seed)) slotBySeed.set(seed, slot);
  });

  const frozenSlots = [slotBySeed.get(1), slotBySeed.get(2)].filter(
    (slot): slot is number => slot !== undefined,
  );

  return resolveGroupConflicts(slots, frozenSlots);
};

import { PrismaClient, TypeKnockout } from '@prisma/client';
import { SortKnockout } from '@prisma/client';

const getNextPowerOfTwo = (n: number) => Math.pow(2, Math.ceil(Math.log2(n)));

const shuffle = <T>(array: T[]): T[] => {
  const arr = [...array];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
};

const generateStandardSeedPattern = (size: number): number[] => {
  let seeds = [1, 2];
  for (let currentSize = 4; currentSize <= size; currentSize *= 2) {
    const nextSeeds: number[] = [];
    for (const seed of seeds) {
      nextSeeds.push(seed);
      nextSeeds.push(currentSize - seed + 1);
    }
    seeds = nextSeeds;
  }
  return seeds;
};

export const harvestKnockoutPlayers = async (prisma: PrismaClient, tournamentId: string) => {
  // 1. Obtenemos las reglas del torneo
  const tournament = await prisma.tournament.findUnique({
    where: { id: tournamentId },
    select: {
      playersKnockout: true, // Cuántos pasan por grupo
      typeKnockout: true, // LlaveA o LlaveAB
    },
  });

  if (!tournament) throw new Error('Torneo no encontrado');
  if (!tournament.playersKnockout)
    throw new Error('Configuración de eliminatorias incompleta (falta playersKnockout)');

  // 2. Buscamos todos los grupos que pertenecen a este torneo
  const groups = await prisma.tournamentGroup.findMany({
    where: { tournamentId },
    select: { id: true, group: true },
    orderBy: { group: 'asc' }, // Ordenamos A, B, C... vital para luego cruzar A vs B
  });

  const groupIds = groups.map((g) => g.id);

  if (groupIds.length === 0) throw new Error('No hay grupos en este torneo');

  // 3. Traemos TODA la clasificación de esos grupos, ya ordenada por posición
  const classifications = await prisma.tournamentGroupClas.findMany({
    where: { tournamentGroupId: { in: groupIds } },
    orderBy: [
      { tournamentGroupId: 'asc' }, // Agrupados por grupo
      { position: 'asc' }, // Del 1º al último
    ],
  });

  // 4. Preparamos los "sacos" para las llaves
  const bracketA: any[] = [];
  const bracketB: any[] = [];

  // 5. El Reparto Matemático
  for (const clas of classifications) {
    if (clas.position > 0 && clas.position <= tournament.playersKnockout) {
      bracketA.push({
        ...clas,
        // (Opcional pero útil) Buscamos el número del grupo para tenerlo a mano en el Paso 2
        groupNumber: groups.find((g) => g.id === clas.tournamentGroupId)?.group,
      });
    } else if (clas.position > tournament.playersKnockout) {
      if (tournament.typeKnockout === TypeKnockout.LlaveAB) {
        bracketB.push({
          ...clas,
          groupNumber: groups.find((g) => g.id === clas.tournamentGroupId)?.group,
        });
      }
    }
  }

  return {
    success: true,
    typeKnockout: tournament.typeKnockout,
    playersKnockout: tournament.playersKnockout,
    numGroups: groups.length, // Se lo pasaremos al Paso 2 para saber cómo cruzar
    bracketA,
    bracketB,
  };
};

export const createKnockoutDraw = (
  classifiedPlayers: any[],
  sortType: SortKnockout,
  allPos: boolean, // Lo guardamos para el Paso 3 (creación de partidos extra)
) => {
  const numPlayers = classifiedPlayers.length;
  if (numPlayers < 2) throw new Error('No hay suficientes jugadores para eliminatorias');

  const bracketSize = getNextPowerOfTwo(numPlayers); // Calculamos $2^x$

  // Array de huecos del cuadro, inicializado con "Exentos" (null)
  const drawSlots: (any | null)[] = new Array(bracketSize).fill(null);

  if (sortType === SortKnockout.Aleatorio) {
    // ---------------------------------------------------------
    // LÓGICA ALEATORIA (Sorteo Puro)
    // ---------------------------------------------------------
    const shuffledPlayers = shuffle(classifiedPlayers);
    // Repartimos los jugadores aleatoriamente. Los huecos restantes se quedan null (Byes)
    // Para no poner todos los byes al final, podemos barajar las posiciones iniciales:
    const randomPositions = shuffle(Array.from({ length: bracketSize }, (_, i) => i));

    shuffledPlayers.forEach((player, index) => {
      drawSlots[randomPositions[index]] = player;
    });
  } else {
    // ---------------------------------------------------------
    // LÓGICA PROTEGIDA (Tu esquema 'RoundRobin' / Seeding ITTF)
    // ---------------------------------------------------------

    // 1. "Rankear" a los jugadores para saber quién es el cabeza de serie 1, 2, 3...
    // Primero los ordenamos por su posición en el grupo (todos los 1ºs van antes que los 2ºs).
    // Si hay empate (ej. todos los 1ºs), el desempate es el NÚMERO DE GRUPO.
    // El 1º del Grupo 1 es el sembrado #1, el 1º del Grupo 2 es el sembrado #2, etc.
    const rankedPlayers = [...classifiedPlayers].sort((a, b) => {
      // Factor 1: Posición final en su grupo (Ascendente: 1 antes que 2)
      if (a.position !== b.position) {
        return a.position - b.position;
      }

      // Factor 2: El orden original de los grupos (Ascendente: Grupo 1 antes que Grupo 2)
      return (a.groupNumber || 0) - (b.groupNumber || 0);
    });

    // 2. Aplicamos tu lógica de sorteo por bloques (Tiers)
    const seededPlayers: any[] = [];

    // Tier 1: Cabezas 1 y 2 (Posiciones fijas)
    if (rankedPlayers[0]) seededPlayers[1] = rankedPlayers[0];
    if (rankedPlayers[1]) seededPlayers[2] = rankedPlayers[1];

    // Tier 2: Cabezas 3 y 4 (Sorteo entre ellos)
    const tier3_4 = shuffle(rankedPlayers.slice(2, 4));
    if (tier3_4[0]) seededPlayers[3] = tier3_4[0];
    if (tier3_4[1]) seededPlayers[4] = tier3_4[1];

    // Tier 3: Cabezas 5 a 8
    const tier5_8 = shuffle(rankedPlayers.slice(4, 8));
    tier5_8.forEach((p, i) => (seededPlayers[5 + i] = p));

    // Tier 4: Cabezas 9 a 16
    const tier9_16 = shuffle(rankedPlayers.slice(8, 16));
    tier9_16.forEach((p, i) => (seededPlayers[9 + i] = p));

    // Tier 5: El resto (Sorteo puro)
    const rest = shuffle(rankedPlayers.slice(16));
    rest.forEach((p, i) => (seededPlayers[17 + i] = p));

    // 3. Obtener el mapa de distribución matemática del cuadro
    const seedPattern = generateStandardSeedPattern(bracketSize);

    // 4. Inyectar a los jugadores en los "Slots" del cuadro basándonos en su semilla
    for (let i = 0; i < bracketSize; i++) {
      const seedNumber = seedPattern[i]; // Ej: El primer hueco es para la semilla 1
      drawSlots[i] = seededPlayers[seedNumber] || null; // Si no hay jugador, es un BYE (null)
    }
  }

  // Emparejamos de 2 en 2 para generar los Partidos (Matches) de la Ronda 1
  const firstRoundMatches = [];
  for (let i = 0; i < drawSlots.length; i += 2) {
    firstRoundMatches.push({
      playerOne: drawSlots[i],
      playerTwo: drawSlots[i + 1],
      isByeMatch: drawSlots[i] === null || drawSlots[i + 1] === null,
    });
  }

  return firstRoundMatches;
};

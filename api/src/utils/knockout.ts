import {
  PrismaClient,
  TypeKnockout,
  SortKnockout,
  KnockoutType,
  RoundKnockouts,
  TournamentStatus,
  MatchStatus,
} from '@prisma/client';

import { BYE_USER_ID, TBD_USER_ID } from '../constants';
import { calculateMatchResults } from './match';
import { randomUUID } from 'crypto';

const ROUND_PROGRESSION = [
  RoundKnockouts.R128avos,
  RoundKnockouts.R64avos,
  RoundKnockouts.R32avos,
  RoundKnockouts.R16avos,
  RoundKnockouts.Octavos,
  RoundKnockouts.Cuartos,
  RoundKnockouts.Semifinales,
  RoundKnockouts.Final,
];

// Helper para determinar la ronda inicial basándonos en la cantidad de partidos
const determineInitialRound = (numMatches: number): RoundKnockouts => {
  switch (numMatches) {
    case 1:
      return RoundKnockouts.Final;
    case 2:
      return RoundKnockouts.Semifinales;
    case 4:
      return RoundKnockouts.Cuartos;
    case 8:
      return RoundKnockouts.Octavos;
    case 16:
      return RoundKnockouts.R16avos;
    case 32:
      return RoundKnockouts.R32avos;
    case 64:
      return RoundKnockouts.R64avos;
    case 128:
      return RoundKnockouts.R128avos;
    default:
      throw new Error(`Número de partidos de primera ronda no soportado: ${numMatches}`);
  }
};

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

export const saveKnockoutBracket = async (
  prisma: PrismaClient,
  tournamentId: string,
  type: KnockoutType,
  firstRoundMatches: any[],
  dateStart: Date,
  allPos: boolean = false, // <-- El parámetro que nos pide la "Full Cascada"
) => {
  if (firstRoundMatches.length === 0) throw new Error('No hay partidos para guardar.');

  const bracketSize = firstRoundMatches.length * 2;
  const initialRoundIndex = ROUND_PROGRESSION.indexOf(
    determineInitialRound(firstRoundMatches.length),
  );

  // 1. Iniciamos el primer bloque (La primera ronda)
  let currentBrackets = [
    {
      matches: firstRoundMatches.map((m, idx) => {
        const isBye = !m.playerOne || !m.playerTwo;
        return {
          id: randomUUID(), // 🚀 Generamos el ID aquí para poder vincularlo
          p1Id: m.playerOne ? m.playerOne.playerId : BYE_USER_ID,
          p2Id: m.playerTwo ? m.playerTwo.playerId : BYE_USER_ID,
          matchOrder: idx,
          winnerGoesToMatchId: null as string | null,
          loserGoesToMatchId: null as string | null,
          status: isBye ? MatchStatus.Completado : MatchStatus.Programado,
          isBye,
        };
      }),
      posStart: 1,
      posEnd: bracketSize,
      roundIndex: initialRoundIndex,
    },
  ];

  const allGeneratedBrackets: any[] = [];

  // 2. EL MOTOR DE EXPANSIÓN (Grafo)
  while (currentBrackets.length > 0) {
    const nextBrackets = [];

    for (const bracket of currentBrackets) {
      allGeneratedBrackets.push(bracket); // Guardamos este bloque para insertarlo luego

      // Si este bloque solo tiene 1 partido, es una "Final" de posición, no hay más allá.
      if (bracket.matches.length === 1) continue;

      const midPos = Math.floor((bracket.posStart + bracket.posEnd) / 2);
      const winnerMatches = [];
      const loserMatches = [];

      // Emparejamos los partidos de 2 en 2
      let nextMatchOrder = 0;
      for (let i = 0; i < bracket.matches.length; i += 2) {
        const m1 = bracket.matches[i]; // Partido de arriba (Par)
        const m2 = bracket.matches[i + 1]; // Partido de abajo (Impar)

        // Creamos los nodos vacíos del futuro
        const wMatch = {
          id: randomUUID(),
          p1Id: TBD_USER_ID,
          p2Id: TBD_USER_ID,
          matchOrder: nextMatchOrder,
          winnerGoesToMatchId: null,
          loserGoesToMatchId: null,
          status: MatchStatus.Programado,
          isBye: false,
        };
        const lMatch = {
          id: randomUUID(),
          p1Id: TBD_USER_ID,
          p2Id: TBD_USER_ID,
          matchOrder: nextMatchOrder,
          winnerGoesToMatchId: null,
          loserGoesToMatchId: null,
          status: MatchStatus.Programado,
          isBye: false,
        };

        // 🕸️ ¡LA MAGIA DEL GRAFO! Enlazamos el presente con el futuro
        m1.winnerGoesToMatchId = wMatch.id;
        m1.loserGoesToMatchId = lMatch.id;
        m2.winnerGoesToMatchId = wMatch.id;
        m2.loserGoesToMatchId = lMatch.id;

        winnerMatches.push(wMatch);
        loserMatches.push(lMatch);
        nextMatchOrder++;
      }

      // La ruta de los ganadores SIEMPRE se crea
      nextBrackets.push({
        matches: winnerMatches,
        posStart: bracket.posStart,
        posEnd: midPos,
        roundIndex: bracket.roundIndex + 1,
      });

      // La ruta de perdedores se crea si 'allPos' es true,
      // o si es la lucha por el 3º y 4º puesto (posStart=1, posEnd=4).
      if (allPos || (bracket.posStart === 1 && bracket.posEnd === 4)) {
        nextBrackets.push({
          matches: loserMatches,
          posStart: midPos + 1,
          posEnd: bracket.posEnd,
          roundIndex: bracket.roundIndex + 1,
        });
      } else {
        // Si no se juega esta consolación, borramos el enlace para que el Vigía no busque fantasmas
        for (let i = 0; i < bracket.matches.length; i++) {
          bracket.matches[i].loserGoesToMatchId = null;
        }
      }
    }
    currentBrackets = nextBrackets;
  }

  // 3. LA TRANSACCIÓN (Volcado masivo a BD)
  const byeMatchesIdsToTrigger: string[] = [];

  await prisma.$transaction(async (tx) => {
    for (const bracket of allGeneratedBrackets) {
      // Creamos el contenedor
      const knockout = await tx.tournamentKnockout.create({
        data: {
          tournamentId,
          type,
          round: ROUND_PROGRESSION[bracket.roundIndex],
          status: MatchStatus.Programado,
          positions: `${bracket.posStart}-${bracket.posEnd}`, // Ej: "1-8" o "5-8"
        },
      });

      // Preparamos los partidos
      const matchesData = bracket.matches.map((m: any) => {
        if (m.isBye) byeMatchesIdsToTrigger.push(m.id); // Guardamos los BYE para activarlos luego

        return {
          id: m.id, // Forzamos el ID que generamos para que el Grafo no se rompa
          dateStart,
          tournamentId,
          knockoutId: knockout.id,
          playerOneId: m.p1Id,
          playerTwoId: m.p2Id,
          matchOrder: m.matchOrder,
          status: m.status,
          setOnePlayerOne: m.isBye && m.p1Id !== BYE_USER_ID ? 11 : 0,
          setOnePlayerTwo: m.isBye && m.p2Id !== BYE_USER_ID ? 11 : 0,
          winnerGoesToMatchId: m.winnerGoesToMatchId,
          loserGoesToMatchId: m.loserGoesToMatchId,
        };
      });

      await tx.match.createMany({ data: matchesData });
    }

    if (type === KnockoutType.A) {
      await tx.tournament.update({
        where: { id: tournamentId },
        data: { status: TournamentStatus.R128avos }, // Opcional: ajustar al status real
      });
    }
  });

  // 4. AUTO-RESOLVER LOS BYES
  // Lanzamos el Vigía contra los partidos fantasma para que empujen al jugador real a la 2ª Ronda
  for (const byeMatchId of byeMatchesIdsToTrigger) {
    await processKnockoutAdvancement(prisma, byeMatchId);
  }

  return { success: true };
};

export const processKnockoutAdvancement = async (prisma: PrismaClient, matchId: string) => {
  const completedMatch = await prisma.match.findUnique({
    where: { id: matchId },
  });

  if (!completedMatch || completedMatch.status !== 'Completado') return;

  // Calculamos el ganador como siempre
  const matchResults = calculateMatchResults(completedMatch);

  if (!matchResults.p1WinsMatch && !matchResults.p2WinsMatch) {
    // Si no hay ganador claro (empate a 0), puede ser un error manual.
    // Ojo: Si era un BYE (11-0), sí hay ganador.
    return;
  }

  const winnerId = matchResults.p1WinsMatch
    ? completedMatch.playerOneId
    : completedMatch.playerTwoId;
  const loserId = matchResults.p1WinsMatch
    ? completedMatch.playerTwoId
    : completedMatch.playerOneId;

  // Actualizamos atómicamente siguiendo el Grafo
  await prisma.$transaction(async (tx) => {
    // ¿Va el ganador a algún sitio?
    if (completedMatch.winnerGoesToMatchId) {
      // Saber si le toca arriba o abajo es tan fácil como mirar si su partido de origen era par o impar
      const isSlotOne = (completedMatch.matchOrder ?? 0) % 2 === 0;

      await tx.match.update({
        where: { id: completedMatch.winnerGoesToMatchId },
        data: isSlotOne ? { playerOneId: winnerId } : { playerTwoId: winnerId },
      });
    }

    // ¿Va el perdedor a algún sitio? (Solo pasará si allPos es true o es el 3º y 4º puesto)
    if (completedMatch.loserGoesToMatchId) {
      const isSlotOne = (completedMatch.matchOrder ?? 0) % 2 === 0;

      await tx.match.update({
        where: { id: completedMatch.loserGoesToMatchId },
        data: isSlotOne ? { playerOneId: loserId } : { playerTwoId: loserId },
      });
    }
  });
};

export const fetchTournamentBracket = async (
  prisma: PrismaClient,
  tournamentId: string,
  type: KnockoutType = KnockoutType.A,
) => {
  const knockouts = await prisma.tournamentKnockout.findMany({
    where: {
      tournamentId,
      type,
    },
    include: {
      matches: {
        orderBy: {
          matchOrder: 'asc', // El frontend recibirá los partidos en el orden perfecto
        },
        include: {
          playerOne: {
            select: { id: true, name: true, surname: true },
          },
          playerTwo: {
            select: { id: true, name: true, surname: true },
          },
        },
      },
    },
  });

  return knockouts;
};

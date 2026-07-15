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
  type: KnockoutType, // 'A' o 'B' (Principal o Consolación)
  firstRoundMatches: any[], // El array que devolvió createKnockoutDraw en el Paso 2
  dateStart: Date, // Fecha prevista para los partidos
) => {
  if (firstRoundMatches.length === 0) {
    throw new Error('No hay partidos para guardar.');
  }

  // 1. Calculamos cuál es la primera ronda (ej: si hay 8 partidos, son Octavos)
  const initialRound = determineInitialRound(firstRoundMatches.length);

  // 2. Iniciamos la Transacción Atómica
  return await prisma.$transaction(async (tx) => {
    // --- 2.1 Crear el Contenedor (TournamentKnockout) ---
    const knockout = await tx.tournamentKnockout.create({
      data: {
        tournamentId,
        type,
        round: initialRound,
        status: MatchStatus.Programado,
      },
    });

    // --- 2.2 Preparar los datos de los Partidos ---
    // Usamos createMany para optimizar si la BD lo soporta, o generamos un array de promesas.
    // Dado que necesitamos flexibilidad por si hay BYEs, lo haremos preparando el array.
    const matchDataToInsert: any[] = [];
    const completedByeMatches: any[] = []; // Opcional: para loguear o gestionar Byes
    let matchIndex = 0;

    for (const match of firstRoundMatches) {
      // Magia de los BYEs: Si uno de los jugadores es null, el partido es un BYE.
      // En la vida real, el jugador que SÍ existe gana automáticamente o avanza.
      // Pero nuestro esquema exige playerOneId y playerTwoId (String, NO null).

      const p1 = match.playerOne;
      const p2 = match.playerTwo;
      const isBye = !p1 || !p2;

      const status = isBye ? MatchStatus.Completado : MatchStatus.Programado;

      // Lógica simple de BYE (Si p1 no existe, gana p2. Si p2 no existe, gana p1)
      let finalP1Id = p1 ? p1.playerId : BYE_USER_ID; // Ojo: asegúrate de usar la propiedad correcta (playerId, userId, etc.)
      let finalP2Id = p2 ? p2.playerId : BYE_USER_ID;

      matchDataToInsert.push({
        dateStart,
        tournamentId,
        knockoutId: knockout.id,
        playerOneId: finalP1Id,
        playerTwoId: finalP2Id,
        status,
        // Si es un BYE, opcionalmente puedes forzar un marcador (ej. 11-0)
        setOnePlayerOne: isBye && p1 ? 11 : 0,
        setOnePlayerTwo: isBye && p2 ? 11 : 0,
        matchOrder: matchIndex,
      });
      matchIndex++;
    }

    // --- 2.3 Insertar todos los partidos de la ronda ---
    await tx.match.createMany({
      data: matchDataToInsert,
    });

    // --- 2.4 Actualizar el Estado del Torneo ---
    // Si estamos creando la Llave A, avanzamos el estado del torneo
    // a la ronda correspondiente.
    if (type === KnockoutType.A) {
      await tx.tournament.update({
        where: { id: tournamentId },
        data: {
          // Casteamos status porque determinamos la ronda y coinciden los nombres en los enums
          // (ej: RoundKnockouts.Octavos -> TournamentStatus.Octavos)
          status: initialRound as unknown as TournamentStatus,
        },
      });
    }

    const startIndex = ROUND_PROGRESSION.indexOf(initialRound);
    let currentMatchesCount = firstRoundMatches.length;

    // Iteramos por las rondas que quedan hasta llegar a la Final
    for (let i = startIndex + 1; i < ROUND_PROGRESSION.length; i++) {
      const nextRoundName = ROUND_PROGRESSION[i];
      currentMatchesCount = currentMatchesCount / 2; // Si eran 8, ahora son 4 (Cuartos)

      if (currentMatchesCount < 1) break;

      // 1. Creamos el contenedor (TournamentKnockout) de la futura ronda
      const futureKnockout = await tx.tournamentKnockout.create({
        data: {
          tournamentId,
          type,
          round: nextRoundName,
          status: MatchStatus.Programado,
        },
      });

      // 2. Preparamos N partidos completamente vacíos (TBD vs TBD)
      const futureMatches = Array.from({ length: currentMatchesCount }).map((_, idx) => ({
        dateStart, // De momento ponemos la misma fecha de inicio
        tournamentId,
        knockoutId: futureKnockout.id,
        playerOneId: TBD_USER_ID,
        playerTwoId: TBD_USER_ID,
        status: MatchStatus.Programado,
        order: idx,
      }));

      // 3. Los insertamos de golpe
      await tx.match.createMany({
        data: futureMatches,
      });
    }

    return {
      success: true,
      knockoutId: knockout.id,
      matchesCreated: matchDataToInsert.length,
      initialRound,
    };
  });
};

export const processKnockoutAdvancement = async (prisma: PrismaClient, matchId: string) => {
  // 1. Obtenemos el partido recién completado con la info de su eliminatoria
  const completedMatch = await prisma.match.findUnique({
    where: { id: matchId },
    include: { knockout: true },
  });

  if (!completedMatch || completedMatch.status !== 'Completado' || !completedMatch.knockout) {
    return;
  }

  // 2. Usamos tu utilidad para obtener el resultado limpio
  const matchResults = calculateMatchResults(completedMatch);

  // Si no hay un ganador claro (ej. empate a 0 sets por un error humano), abortamos
  if (!matchResults.p1WinsMatch && !matchResults.p2WinsMatch) {
    console.warn(`Partido ${matchId} completado pero sin ganador claro. No se avanza a nadie.`);
    return;
  }

  // Determinamos el ID del ganador gracias a tus booleanos
  const winnerId = matchResults.p1WinsMatch
    ? completedMatch.playerOneId
    : completedMatch.playerTwoId;

  // 3. Averiguamos cuál es la siguiente ronda
  const currentRoundName = completedMatch.knockout.round;
  const currentRoundIndex = ROUND_PROGRESSION.indexOf(currentRoundName);

  if (currentRoundIndex === ROUND_PROGRESSION.length - 1) {
    console.log(`🏆 ¡El jugador ${winnerId} ha ganado el torneo!`);
    return;
  }

  const nextRoundName = ROUND_PROGRESSION[currentRoundIndex + 1];

  // 4. Ejecutamos la matemática para encontrar su sitio en la siguiente ronda
  await prisma.$transaction(async (tx) => {
    const currentRoundMatches = await tx.match.findMany({
      where: { knockoutId: completedMatch.knockoutId },
      orderBy: { matchOrder: 'asc' }, // (Recuerda el tip del order si los UUIDs v4 te dan problemas)
    });

    const matchIndex = currentRoundMatches.findIndex((m) => m.id === matchId);
    if (matchIndex === -1) throw new Error('Error crítico: Partido no encontrado en su ronda');

    const nextKnockout = await tx.tournamentKnockout.findFirst({
      where: {
        tournamentId: completedMatch.knockout!.tournamentId,
        type: completedMatch.knockout!.type,
        round: nextRoundName,
      },
    });

    if (!nextKnockout) return;

    const nextRoundMatches = await tx.match.findMany({
      where: { knockoutId: nextKnockout.id },
      orderBy: { matchOrder: 'asc' },
    });

    // La fórmula matemática de emparejamiento
    const nextMatchIndex = Math.floor(matchIndex / 2);
    const isSlotOne = matchIndex % 2 === 0;

    const targetMatch = nextRoundMatches[nextMatchIndex];
    if (!targetMatch) return;

    // Actualizamos el hueco TBD con el ID del ganador real
    const updateData = isSlotOne ? { playerOneId: winnerId } : { playerTwoId: winnerId };

    await tx.match.update({
      where: { id: targetMatch.id },
      data: updateData,
    });
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

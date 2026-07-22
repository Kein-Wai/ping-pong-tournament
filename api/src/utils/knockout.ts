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

export const harvestKnockoutPlayers = async (prisma: PrismaClient, tournamentId: string) => {
  const tournament = await prisma.tournament.findUnique({
    where: { id: tournamentId },
    select: {
      playersKnockout: true,
      typeKnockout: true,
    },
  });

  if (!tournament) throw new Error('Torneo no encontrado');
  if (!tournament.playersKnockout)
    throw new Error('Configuración de eliminatorias incompleta (falta playersKnockout)');

  const groups = await prisma.tournamentGroup.findMany({
    where: { tournamentId },
    select: { id: true, group: true },
    orderBy: { group: 'asc' },
  });

  const groupIds = groups.map((g) => g.id);

  if (groupIds.length === 0) throw new Error('No hay grupos en este torneo');

  const classifications = await prisma.tournamentGroupClas.findMany({
    where: { tournamentGroupId: { in: groupIds } },
    orderBy: [{ tournamentGroupId: 'asc' }, { position: 'asc' }],
  });

  const bracketA: any[] = [];
  const bracketB: any[] = [];

  for (const clas of classifications) {
    if (clas.position > 0 && clas.position <= tournament.playersKnockout) {
      bracketA.push({
        ...clas,

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
    numGroups: groups.length,
    bracketA,
    bracketB,
  };
};

export const createKnockoutDraw = (
  classifiedPlayers: any[],
  sortType: SortKnockout,
  allPos: boolean,
) => {
  const numPlayers = classifiedPlayers.length;
  if (numPlayers < 2) throw new Error('No hay suficientes jugadores para eliminatorias');

  const bracketSize = getNextPowerOfTwo(numPlayers);

  const drawSlots: (any | null)[] = new Array(bracketSize).fill(null);

  if (sortType === SortKnockout.Aleatorio) {
    const shuffledPlayers = shuffle(classifiedPlayers);

    const randomPositions = shuffle(Array.from({ length: bracketSize }, (_, i) => i));

    shuffledPlayers.forEach((player, index) => {
      drawSlots[randomPositions[index]] = player;
    });
  } else {
    const rankedPlayers = [...classifiedPlayers].sort((a, b) => {
      if (a.position !== b.position) {
        return a.position - b.position;
      }

      return (a.groupNumber || 0) - (b.groupNumber || 0);
    });

    const seededPlayers: any[] = [];

    if (rankedPlayers[0]) seededPlayers[1] = rankedPlayers[0];
    if (rankedPlayers[1]) seededPlayers[2] = rankedPlayers[1];

    const tier3_4 = shuffle(rankedPlayers.slice(2, 4));
    if (tier3_4[0]) seededPlayers[3] = tier3_4[0];
    if (tier3_4[1]) seededPlayers[4] = tier3_4[1];

    const tier5_8 = shuffle(rankedPlayers.slice(4, 8));
    tier5_8.forEach((p, i) => (seededPlayers[5 + i] = p));

    const tier9_16 = shuffle(rankedPlayers.slice(8, 16));
    tier9_16.forEach((p, i) => (seededPlayers[9 + i] = p));

    const rest = shuffle(rankedPlayers.slice(16));
    rest.forEach((p, i) => (seededPlayers[17 + i] = p));

    const seedPattern = generateStandardSeedPattern(bracketSize);

    for (let i = 0; i < bracketSize; i++) {
      const seedNumber = seedPattern[i];
      drawSlots[i] = seededPlayers[seedNumber] || null;
    }
  }

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
  allPos: boolean = false,
) => {
  if (firstRoundMatches.length === 0) throw new Error('No hay partidos para guardar.');

  const bracketSize = firstRoundMatches.length * 2;
  const initialRoundIndex = ROUND_PROGRESSION.indexOf(
    determineInitialRound(firstRoundMatches.length),
  );

  let currentBrackets = [
    {
      matches: firstRoundMatches.map((m, idx) => {
        const isBye = !m.playerOne || !m.playerTwo;
        return {
          id: randomUUID(),
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

  while (currentBrackets.length > 0) {
    const nextBrackets = [];

    for (const bracket of currentBrackets) {
      allGeneratedBrackets.push(bracket);

      if (bracket.matches.length === 1) continue;

      const midPos = Math.floor((bracket.posStart + bracket.posEnd) / 2);
      const winnerMatches = [];
      const loserMatches = [];

      let nextMatchOrder = 0;
      for (let i = 0; i < bracket.matches.length; i += 2) {
        const m1 = bracket.matches[i];
        const m2 = bracket.matches[i + 1];

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

        m1.winnerGoesToMatchId = wMatch.id;
        m1.loserGoesToMatchId = lMatch.id;
        m2.winnerGoesToMatchId = wMatch.id;
        m2.loserGoesToMatchId = lMatch.id;

        winnerMatches.push(wMatch);
        loserMatches.push(lMatch);
        nextMatchOrder++;
      }

      nextBrackets.push({
        matches: winnerMatches,
        posStart: bracket.posStart,
        posEnd: midPos,
        roundIndex: bracket.roundIndex + 1,
      });

      if (allPos || (bracket.posStart === 1 && bracket.posEnd === 4)) {
        nextBrackets.push({
          matches: loserMatches,
          posStart: midPos + 1,
          posEnd: bracket.posEnd,
          roundIndex: bracket.roundIndex + 1,
        });
      } else {
        for (let i = 0; i < bracket.matches.length; i++) {
          bracket.matches[i].loserGoesToMatchId = null;
        }
      }
    }
    currentBrackets = nextBrackets;
  }

  const byeMatchesIdsToTrigger: string[] = [];

  await prisma.$transaction(async (tx) => {
    for (const bracket of allGeneratedBrackets) {
      const knockout = await tx.tournamentKnockout.create({
        data: {
          tournamentId,
          type,
          round: ROUND_PROGRESSION[bracket.roundIndex],
          status: MatchStatus.Programado,
          positions: `${bracket.posStart}-${bracket.posEnd}`,
        },
      });

      const matchesData = bracket.matches.map((m: any) => {
        if (m.isBye) byeMatchesIdsToTrigger.push(m.id);

        return {
          id: m.id,
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
      // ✅ Usamos initialRoundIndex, que se calculó al principio de la función
      await tx.tournament.update({
        where: { id: tournamentId },
        data: { status: ROUND_PROGRESSION[initialRoundIndex] as any },
      });
    }
  });

  for (const byeMatchId of byeMatchesIdsToTrigger) {
    await processKnockoutAdvancement(prisma, byeMatchId);
  }

  return { success: true };
};

// Añade esta función helper justo encima de processKnockoutAdvancement
const recordTournamentClassification = async (
  tx: any,
  match: any,
  playerId: string,
  isWinner: boolean,
) => {
  // Evitamos registrar a fantasmas o TBDs
  if (playerId === BYE_USER_ID || playerId === TBD_USER_ID) return;

  // Verificamos si ya está clasificado para no duplicar (ej. si hubo un recálculo)
  const existing = await tx.tournamentClas.findFirst({
    where: { tournamentId: match.tournamentId, playerId },
  });
  if (existing) return;

  const round = match.knockout.round;
  const type = match.knockout.type;
  const positions = match.knockout.positions;
  let position = 0;

  // Cálculo de posiciones estándar para la Llave A (Campeón, Subcampeón, Semifinalistas=3, Cuartos=5...)
  if (type === 'A') {
    if (round === 'Final') {
      if (positions === '1-2') {
        position = isWinner ? 1 : 2;
      } else if (positions === '3-4') {
        position = isWinner ? 3 : 4;
      } else {
        position = isWinner ? 1 : 2; // Fallback por seguridad
      }
    } else if (!isWinner) {
      switch (round) {
        case 'Semifinales':
          position = 3;
          break;
        case 'Cuartos':
          position = 5;
          break;
        case 'Octavos':
          position = 9;
          break;
        case 'R16avos':
          position = 17;
          break;
        case 'R32avos':
          position = 33;
          break;
        case 'R64avos':
          position = 65;
          break;
        case 'R128avos':
          position = 129;
          break;
      }
    }
  }

  // Guardamos la clasificación final en la nueva tabla
  await tx.tournamentClas.create({
    data: {
      tournamentId: match.tournamentId,
      playerId: playerId,
      lastRound: round,
      position: position,
    },
  });
};

export const processKnockoutAdvancement = async (prisma: PrismaClient, matchId: string) => {
  const completedMatch = await prisma.match.findUnique({
    where: { id: matchId },
    include: { knockout: true },
  });

  if (!completedMatch || completedMatch.status !== 'Completado' || !completedMatch.knockout) return;

  const matchResults = calculateMatchResults(completedMatch);

  // Si nadie ganó (ej. empate a 0 o partido cancelado rarísimo), salimos
  if (!matchResults.p1WinsMatch && !matchResults.p2WinsMatch) {
    return;
  }

  const winnerId = matchResults.p1WinsMatch
    ? completedMatch.playerOneId
    : completedMatch.playerTwoId;
  const loserId = matchResults.p1WinsMatch
    ? completedMatch.playerTwoId
    : completedMatch.playerOneId;

  await prisma.$transaction(async (tx) => {
    // --- LÓGICA DEL GANADOR ---
    if (completedMatch.winnerGoesToMatchId) {
      const isSlotOne = (completedMatch.matchOrder ?? 0) % 2 === 0;
      await tx.match.update({
        where: { id: completedMatch.winnerGoesToMatchId },
        data: isSlotOne ? { playerOneId: winnerId } : { playerTwoId: winnerId },
      });
    } else {
      // Si el ganador no va a ningún otro partido, ha conseguido su medalla
      await recordTournamentClassification(tx, completedMatch, winnerId, true);
    }

    // --- LÓGICA DEL PERDEDOR ---
    if (completedMatch.loserGoesToMatchId) {
      const isSlotOne = (completedMatch.matchOrder ?? 0) % 2 === 0;
      await tx.match.update({
        where: { id: completedMatch.loserGoesToMatchId },
        data: isSlotOne ? { playerOneId: loserId } : { playerTwoId: loserId },
      });
    } else {
      // Si el perdedor no va a ningún otro partido, ESTÁ ELIMINADO
      await recordTournamentClassification(tx, completedMatch, loserId, false);
    }

    // --- 🚨 COMPROBACIÓN DE FIN DE TORNEO 🚨 ---
    // Contamos si queda algún partido sin completar en TODO el torneo
    const pendingMatchesCount = await tx.match.count({
      where: {
        tournamentId: completedMatch.tournamentId,
        status: { not: 'Completado' },
      },
    });

    if (pendingMatchesCount === 0) {
      await tx.tournament.update({
        where: { id: completedMatch.tournamentId! },
        data: { status: 'Completado' }, // 👈 Solo termina cuando se ha jugado HASTA EL ÚLTIMO partido
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
          matchOrder: 'asc',
        },
        include: {
          playerOne: {
            select: { id: true, name: true, surname: true, stats: true },
          },
          playerTwo: {
            select: { id: true, name: true, surname: true, stats: true },
          },
        },
      },
    },
  });
  const roundOrder: Record<string, number> = {
    R128avos: 1,
    R64avos: 2,
    R32avos: 3,
    R16avos: 4,
    Octavos: 5,
    Cuartos: 6,
    Semifinales: 7,
    Final: 8,
  };

  knockouts.sort((a, b) => {
    const diff = roundOrder[a.round] - roundOrder[b.round];
    if (diff !== 0) return diff;

    // Si ambas son "Final", el 3er Puesto (posiciones 3-4) va después de la Gran Final (1-2)
    if (a.positions && b.positions) {
      return parseInt(a.positions.split('-')[0]) - parseInt(b.positions.split('-')[0]);
    }
    return 0;
  });

  return knockouts;
};

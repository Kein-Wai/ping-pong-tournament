import {
  PrismaClient,
  TypeKnockout,
  SortKnockout,
  KnockoutType,
  RoundKnockouts,
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

// ==========================================
// 1. INTERFACES UNIVERSALES
// ==========================================
export interface KnockoutSeed {
  id: string; // ID agnóstico (UUID de Prisma, o string como "JugadorExcel-1")
  position: number;
  groupNumber?: number;
}

export interface KnockoutMatchNode {
  id: string;
  p1Id: string;
  p2Id: string;
  matchOrder: number;
  winnerGoesToMatchId: string | null;
  loserGoesToMatchId: string | null;
  status: string;
  isBye: boolean;
}

export interface KnockoutBracketNode {
  roundIndex: number;
  posStart: number;
  posEnd: number;
  matches: KnockoutMatchNode[];
}

// ==========================================
// 2. MOTORES MATEMÁTICOS (Puros, sin DB)
// ==========================================

export const createKnockoutDraw = (
  classifiedPlayers: KnockoutSeed[],
  sortType: SortKnockout,
  allPos: boolean,
) => {
  const numPlayers = classifiedPlayers.length;
  if (numPlayers < 2) throw new Error('No hay suficientes jugadores para eliminatorias');

  const bracketSize = getNextPowerOfTwo(numPlayers);
  const drawSlots: (KnockoutSeed | null)[] = new Array(bracketSize).fill(null);

  if (sortType === SortKnockout.Aleatorio) {
    const shuffledPlayers = shuffle(classifiedPlayers);
    const randomPositions = shuffle(Array.from({ length: bracketSize }, (_, i) => i));

    shuffledPlayers.forEach((player, index) => {
      drawSlots[randomPositions[index]] = player;
    });
  } else {
    const rankedPlayers = [...classifiedPlayers].sort((a, b) => {
      if (a.position !== b.position) return a.position - b.position;
      return (a.groupNumber || 0) - (b.groupNumber || 0);
    });

    const seededPlayers: KnockoutSeed[] = [];
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

  // ==========================================
  // 🚀 NUEVO: RESOLUCIÓN DE CONFLICTOS (ANTI-CRUCE)
  // Evitar que dos jugadores del mismo grupo se enfrenten en 1ª ronda
  // ==========================================
  let hasConflicts = true;
  let attempts = 0;

  while (hasConflicts && attempts < 50) {
    hasConflicts = false;
    // Revisamos los enfrentamientos de dos en dos (1 vs 2, 3 vs 4, etc.)
    for (let i = 0; i < drawSlots.length; i += 2) {
      const p1 = drawSlots[i];
      const p2 = drawSlots[i + 1];

      // Si ambos existen y son del mismo grupo...
      if (p1 && p2 && p1.groupNumber && p2.groupNumber && p1.groupNumber === p2.groupNumber) {
        hasConflicts = true;

        // Buscamos otro jugador en todo el cuadro que tenga LA MISMA posición (ej: otro 2º de grupo)
        // para intercambiarlo y romper el cruce, manteniendo el equilibrio de la siembra.
        const swapIdx = drawSlots.findIndex(
          (candidate, j) =>
            candidate && candidate.position === p2.position && j !== i && j !== i + 1,
        );

        if (swapIdx !== -1) {
          const temp = drawSlots[i + 1];
          drawSlots[i + 1] = drawSlots[swapIdx];
          drawSlots[swapIdx] = temp;
        } else {
          // Fallback extremo: si no hay otro de su misma posición, lo cambiamos por el primero que pillemos
          const fallbackIdx = drawSlots.findIndex((c, j) => c && j !== i && j !== i + 1);
          if (fallbackIdx !== -1) {
            const temp = drawSlots[i + 1];
            drawSlots[i + 1] = drawSlots[fallbackIdx];
            drawSlots[fallbackIdx] = temp;
          }
        }
      }
    }
    attempts++; // Seguro para evitar bucles infinitos
  }

  // ==========================================
  // CONSTRUCCIÓN FINAL
  // ==========================================
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

export const buildKnockoutBracketEngine = (
  firstRoundMatches: any[],
  allPos: boolean,
): { brackets: KnockoutBracketNode[]; initialRoundIndex: number } => {
  const bracketSize = firstRoundMatches.length * 2;
  const initialRoundIndex = ROUND_PROGRESSION.indexOf(
    determineInitialRound(firstRoundMatches.length),
  );

  let currentBrackets: KnockoutBracketNode[] = [
    {
      matches: firstRoundMatches.map((m, idx) => {
        const isBye = !m.playerOne || !m.playerTwo;
        return {
          id: randomUUID(),
          p1Id: m.playerOne ? m.playerOne.id : BYE_USER_ID,
          p2Id: m.playerTwo ? m.playerTwo.id : BYE_USER_ID,
          matchOrder: idx,
          winnerGoesToMatchId: null,
          loserGoesToMatchId: null,
          status: isBye ? MatchStatus.Completado : MatchStatus.Programado,
          isBye,
        };
      }),
      posStart: 1,
      posEnd: bracketSize,
      roundIndex: initialRoundIndex,
    },
  ];

  const allGeneratedBrackets: KnockoutBracketNode[] = [];

  while (currentBrackets.length > 0) {
    const nextBrackets: KnockoutBracketNode[] = [];

    for (const bracket of currentBrackets) {
      allGeneratedBrackets.push(bracket);

      if (bracket.matches.length === 1) continue;

      const midPos = Math.floor((bracket.posStart + bracket.posEnd) / 2);
      const winnerMatches: KnockoutMatchNode[] = [];
      const loserMatches: KnockoutMatchNode[] = [];

      let nextMatchOrder = 0;
      for (let i = 0; i < bracket.matches.length; i += 2) {
        const m1 = bracket.matches[i];
        const m2 = bracket.matches[i + 1];

        const wMatch: KnockoutMatchNode = {
          id: randomUUID(),
          p1Id: TBD_USER_ID,
          p2Id: TBD_USER_ID,
          matchOrder: nextMatchOrder,
          winnerGoesToMatchId: null,
          loserGoesToMatchId: null,
          status: MatchStatus.Programado,
          isBye: false,
        };
        const lMatch: KnockoutMatchNode = {
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

  return { brackets: allGeneratedBrackets, initialRoundIndex };
};

// ==========================================
// 3. ADAPTADORES DE BASE DE DATOS (El flujo actual)
// ==========================================

export const harvestKnockoutPlayers = async (prisma: PrismaClient, tournamentId: string) => {
  const tournament = await prisma.tournament.findUnique({
    where: { id: tournamentId },
    select: { playersKnockout: true, typeKnockout: true },
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

  const bracketA: KnockoutSeed[] = [];
  const bracketB: KnockoutSeed[] = [];

  for (const clas of classifications) {
    const seed: KnockoutSeed = {
      id: clas.playerId,
      position: clas.position,
      groupNumber: groups.find((g) => g.id === clas.tournamentGroupId)?.group,
    };

    if (clas.position > 0 && clas.position <= tournament.playersKnockout) {
      bracketA.push(seed);
    } else if (clas.position > tournament.playersKnockout) {
      if (tournament.typeKnockout === TypeKnockout.LlaveAB) {
        bracketB.push(seed);
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

const recordTournamentClassification = async (
  tx: any,
  match: any,
  playerId: string,
  isWinner: boolean,
) => {
  if (playerId === BYE_USER_ID || playerId === TBD_USER_ID) return;

  const existing = await tx.tournamentClas.findFirst({
    where: { tournamentId: match.tournamentId, playerId },
  });
  if (existing) return;

  const round = match.knockout.round;
  const type = match.knockout.type;
  const positions = match.knockout.positions;
  let position = 0;
  let offset = 0;
  let tournamentSeasonId = null;

  const tournament = await tx.tournament.findUnique({
    where: { id: match.tournamentId },
    select: { numGroup: true, playersKnockout: true, seasonId: true },
  });

  if (tournament) {
    tournamentSeasonId = tournament.seasonId;
    if (type === 'B') {
      offset = (tournament.numGroup || 0) * (tournament.playersKnockout || 0);
    }
  }

  let basePosition = 0;

  if (round === 'Final') {
    if (positions && positions.includes('-')) {
      const pStart = parseInt(positions.split('-')[0]);
      const pEnd = parseInt(positions.split('-')[1]);
      basePosition = isWinner ? pStart : pEnd;
    } else {
      basePosition = isWinner ? 1 : 2;
    }
  } else if (!isWinner) {
    switch (round) {
      case 'Semifinales':
        basePosition = 3;
        break;
      case 'Cuartos':
        basePosition = 5;
        break;
      case 'Octavos':
        basePosition = 9;
        break;
      case 'R16avos':
        basePosition = 17;
        break;
      case 'R32avos':
        basePosition = 33;
        break;
      case 'R64avos':
        basePosition = 65;
        break;
      case 'R128avos':
        basePosition = 129;
        break;
    }
  }

  if (basePosition > 0) {
    position = basePosition + offset;
  }

  await tx.tournamentClas.create({
    data: {
      tournamentId: match.tournamentId,
      playerId: playerId,
      lastRound: round,
      position: position,
    },
  });

  if (position === 1 && tournamentSeasonId) {
    await tx.stats.updateMany({
      where: { userId: playerId, seasonId: tournamentSeasonId },
      data: { tournamentWon: { increment: 1 } },
    });
  }
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

  // 🚀 LLAMADA AL MOTOR PURO PARA CREAR LA ESTRUCTURA DEL CUADRO
  const { brackets, initialRoundIndex } = buildKnockoutBracketEngine(firstRoundMatches, allPos);

  const byeMatchesIdsToTrigger: string[] = [];

  // Lo guardamos todo de golpe
  await prisma.$transaction(async (tx) => {
    for (const bracket of brackets) {
      const knockout = await tx.tournamentKnockout.create({
        data: {
          tournamentId,
          type,
          round: ROUND_PROGRESSION[bracket.roundIndex],
          status: MatchStatus.Programado,
          positions: `${bracket.posStart}-${bracket.posEnd}`,
        },
      });

      const matchesData = bracket.matches.map((m) => {
        if (m.isBye) byeMatchesIdsToTrigger.push(m.id);

        return {
          id: m.id,
          dateStart,
          tournamentId,
          knockoutId: knockout.id,
          playerOneId: m.p1Id,
          playerTwoId: m.p2Id,
          matchOrder: m.matchOrder,
          status: m.status as MatchStatus,
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
        data: { status: ROUND_PROGRESSION[initialRoundIndex] as any },
      });
    }
  });

  // Autocompletamos los partidos contra fantasmas
  for (const byeMatchId of byeMatchesIdsToTrigger) {
    await processKnockoutAdvancement(prisma, byeMatchId);
  }

  return { success: true };
};

export const processKnockoutAdvancement = async (prisma: PrismaClient, matchId: string) => {
  const completedMatch = await prisma.match.findUnique({
    where: { id: matchId },
    include: { knockout: true },
  });

  if (!completedMatch || completedMatch.status !== 'Completado' || !completedMatch.knockout) return;

  const matchResults = calculateMatchResults(completedMatch);

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
    // Ganador
    if (completedMatch.winnerGoesToMatchId) {
      const isSlotOne = (completedMatch.matchOrder ?? 0) % 2 === 0;
      await tx.match.update({
        where: { id: completedMatch.winnerGoesToMatchId },
        data: isSlotOne ? { playerOneId: winnerId } : { playerTwoId: winnerId },
      });
    } else {
      await recordTournamentClassification(tx, completedMatch, winnerId, true);
    }

    // Perdedor
    if (completedMatch.loserGoesToMatchId) {
      const isSlotOne = (completedMatch.matchOrder ?? 0) % 2 === 0;
      await tx.match.update({
        where: { id: completedMatch.loserGoesToMatchId },
        data: isSlotOne ? { playerOneId: loserId } : { playerTwoId: loserId },
      });
    } else {
      await recordTournamentClassification(tx, completedMatch, loserId, false);
    }

    const pendingMatchesCount = await tx.match.count({
      where: {
        tournamentId: completedMatch.tournamentId,
        status: { not: 'Completado' },
      },
    });

    if (pendingMatchesCount === 0) {
      await tx.tournament.update({
        where: { id: completedMatch.tournamentId! },
        data: { status: 'Completado' },
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
    where: { tournamentId, type },
    include: {
      matches: {
        orderBy: { matchOrder: 'asc' },
        include: {
          playerOne: { select: { id: true, name: true, surname: true, stats: true } },
          playerTwo: { select: { id: true, name: true, surname: true, stats: true } },
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
    if (a.positions && b.positions) {
      return parseInt(a.positions.split('-')[0]) - parseInt(b.positions.split('-')[0]);
    }
    return 0;
  });

  return knockouts;
};

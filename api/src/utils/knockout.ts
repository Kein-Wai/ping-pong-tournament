import {
  Prisma,
  PrismaClient,
  KnockoutType,
  MatchStatus,
  RoundKnockouts,
  TournamentStatus,
  TypeKnockout,
} from '@prisma/client';

import { BYE_USER_ID, TBD_USER_ID } from '../constants';
import { calculateMatchResults } from './match';
import {
  buildKnockoutBracketEngine,
  FirstRoundMatch,
  KnockoutSeed,
  ROUND_PROGRESSION,
} from './knockout-engine';
import { computeKnockoutPosition } from './tournament-positions';

/** Partido de eliminatorias con su ronda cargada. */
type KnockoutMatch = Prisma.MatchGetPayload<{ include: { knockout: true } }>;

/**
 * Equivalencia entre la ronda de eliminatorias y el estado del torneo: cuando
 * arranca una ronda, el torneo pasa a ese mismo estado.
 */
const TOURNAMENT_STATUS_BY_ROUND = new Map<RoundKnockouts, TournamentStatus>([
  [RoundKnockouts.R128avos, TournamentStatus.R128avos],
  [RoundKnockouts.R64avos, TournamentStatus.R64avos],
  [RoundKnockouts.R32avos, TournamentStatus.R32avos],
  [RoundKnockouts.R16avos, TournamentStatus.R16avos],
  [RoundKnockouts.Octavos, TournamentStatus.Octavos],
  [RoundKnockouts.Cuartos, TournamentStatus.Cuartos],
  [RoundKnockouts.Semifinales, TournamentStatus.Semifinales],
  [RoundKnockouts.Final, TournamentStatus.Final],
]);

/**
 * Cosecha los jugadores que se clasifican a eliminatorias, repartidos entre la
 * llave A y la llave B segun su posicion en la fase de grupos.
 */
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

  const groupIds = groups.map((group) => group.id);
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
      groupNumber: groups.find((group) => group.id === clas.tournamentGroupId)?.group,
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

/**
 * Fija la clasificacion final de un jugador de eliminatorias.
 *
 * La posicion la calcula el modulo puro `tournament-positions`; aqui solo se
 * escribe. Si el jugador ya estaba clasificado no se duplica la fila.
 */
const recordTournamentClassification = async (
  tx: Prisma.TransactionClient,
  match: KnockoutMatch,
  playerId: string,
  isWinner: boolean,
) => {
  if (playerId === BYE_USER_ID || playerId === TBD_USER_ID) return;

  // El torneo de un partido de eliminatorias siempre existe: el filtro de
  // Prisma no admite null en una FK obligatoria.
  const tournamentId = match.tournamentId as string;

  const existing = await tx.tournamentClas.findFirst({
    where: { tournamentId, playerId },
  });
  if (existing) return;

  const tournament = await tx.tournament.findUnique({
    where: { id: tournamentId },
    select: { numGroup: true, playersKnockout: true, seasonId: true },
  });

  const tournamentSeasonId = tournament?.seasonId ?? null;

  const position = computeKnockoutPosition({
    round: match.knockout?.round ?? '',
    positions: match.knockout?.positions ?? null,
    isWinner,
    isSecondBracket: match.knockout?.type === KnockoutType.B,
    numGroups: tournament?.numGroup || 0,
    playersKnockout: tournament?.playersKnockout || 0,
  });

  await tx.tournamentClas.create({
    data: {
      tournamentId,
      playerId,
      lastRound: match.knockout?.round,
      position,
    },
  });

  if (position === 1 && tournamentSeasonId) {
    await tx.stats.updateMany({
      where: { userId: playerId, seasonId: tournamentSeasonId },
      data: { tournamentWon: { increment: 1 } },
    });
  }
};

/**
 * Guarda el cuadro de eliminatorias en la base de datos.
 *
 * La estructura del cuadro la construye el motor puro `knockout-engine`; aqui
 * se persiste y se avanzan los partidos con bye.
 */
export const saveKnockoutBracket = async (
  prisma: PrismaClient,
  tournamentId: string,
  type: KnockoutType,
  firstRoundMatches: FirstRoundMatch[],
  dateStart: Date,
  allPos: boolean = false,
) => {
  if (firstRoundMatches.length === 0) throw new Error('No hay partidos para guardar.');

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

      const matchesData = bracket.matches.map((match) => {
        if (match.isBye) byeMatchesIdsToTrigger.push(match.id);

        return {
          id: match.id,
          dateStart,
          tournamentId,
          knockoutId: knockout.id,
          playerOneId: match.p1Id,
          playerTwoId: match.p2Id,
          matchOrder: match.matchOrder,
          status: match.status,
          setOnePlayerOne: match.isBye && match.p1Id !== BYE_USER_ID ? 11 : 0,
          setOnePlayerTwo: match.isBye && match.p2Id !== BYE_USER_ID ? 11 : 0,
          winnerGoesToMatchId: match.winnerGoesToMatchId,
          loserGoesToMatchId: match.loserGoesToMatchId,
        };
      });

      await tx.match.createMany({ data: matchesData });
    }

    if (type === KnockoutType.A) {
      const round = ROUND_PROGRESSION[initialRoundIndex];
      const status = TOURNAMENT_STATUS_BY_ROUND.get(round) ?? TournamentStatus.Programado;

      await tx.tournament.update({
        where: { id: tournamentId },
        data: { status },
      });
    }
  });

  // Autocompletamos los partidos contra fantasmas
  for (const byeMatchId of byeMatchesIdsToTrigger) {
    await processKnockoutAdvancement(prisma, byeMatchId);
  }

  return { success: true };
};

/**
 * Avanza el cuadro tras completar un partido: el ganador continua por su
 * camino y el perdedor se clasifica si no tiene ronda de perdedores.
 */
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

  // El torneo de un partido de eliminatorias siempre existe: el filtro de
  // Prisma no admite null en una FK obligatoria.
  const tournamentId = completedMatch.tournamentId as string;

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
        tournamentId,
        status: { not: 'Completado' },
      },
    });

    if (pendingMatchesCount === 0) {
      await tx.tournament.update({
        where: { id: tournamentId },
        data: { status: 'Completado' },
      });
    }
  });
};

/** Lee el cuadro de eliminatorias de un torneo, ordenado por ronda. */
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

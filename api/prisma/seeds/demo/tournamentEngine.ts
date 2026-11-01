import { Prisma, PrismaClient, Rounds, SortGroups, SortKnockout, TypeKnockout } from '@prisma/client';
import { BYE_USER_ID, TBD_USER_ID } from '../../../src/constants';
import { generateTournamentGroups } from '../../../src/utils/group-generator';
import { processKnockoutAdvancement } from '../../../src/utils/knockout';
import { updateMatch } from '../../../src/utils/match-result';
import { Rng, daysFromToday } from './random';

/**
 * Momento del ciclo de vida en el que se deja un torneo. Los tres "casi" son
 * para probar a mano la transición que dispara el último partido de cada fase.
 */
export type TournamentStage =
  | 'programado'
  | 'grupos'
  | 'gruposCasiCompletos'
  | 'knockout'
  | 'knockoutCasiCompleto'
  | 'completado';

export interface TournamentSpec {
  name: string;
  size: number;
  rounds: Rounds;
  numGroup: number;
  numGroupPlayers: number;
  playersKnockout: number | null;
  typeKnockout: TypeKnockout;
  allPos: boolean;
  stage: TournamentStage;
  /** Días respecto a hoy: negativo si ya se jugó, positivo si está por venir. */
  daysFromToday: number;
  levelTournament: 'Principiante' | 'Intermedio' | 'Avanzado' | 'Federado' | 'Mixto';
  setsToWinGroup: number;
  setsToWinKnockout: number;
  /** Rango de ELO del que salen los inscritos; sin rango, cualquiera del club. */
  eloRange?: [number, number];
  /** Inscripciones sin confirmar que se añaden además de los confirmados. */
  extraPending?: number;
  /** Rondas de eliminatorias que se juegan enteras cuando el estado es `knockout`. */
  knockoutPasses?: number;
}

interface EngineContext {
  prisma: PrismaClient;
  rng: Rng;
  seasonId: string;
  clubId: string;
}

const SET_FIELDS = [
  ['setOnePlayerOne', 'setOnePlayerTwo'],
  ['setTwoPlayerOne', 'setTwoPlayerTwo'],
  ['setThreePlayerOne', 'setThreePlayerTwo'],
  ['setFourPlayerOne', 'setFourPlayerTwo'],
  ['setFivePlayerOne', 'setFivePlayerTwo'],
  ['setSixPlayerOne', 'setSixPlayerTwo'],
  ['setSevenPlayerOne', 'setSevenPlayerTwo'],
] as const;

/**
 * Marcador de un partido: la probabilidad de ganar cada set sale de la
 * diferencia de ELO, así que los favoritos ganan más a menudo pero no siempre.
 */
const simulateSets = (rng: Rng, eloOne: number, eloTwo: number, setsToWin: number) => {
  const matchProbability = 1 / (1 + 10 ** ((eloTwo - eloOne) / 400));
  const setProbability = 0.5 + (matchProbability - 0.5) * 0.7;
  const sets: [number, number][] = [];
  let setsOne = 0;
  let setsTwo = 0;

  while (setsOne < setsToWin && setsTwo < setsToWin) {
    const oneWins = rng.chance(setProbability);
    const isDeuce = rng.chance(0.2);
    const loser = isDeuce ? rng.int(10, 14) : Math.max(rng.int(1, 9), rng.int(0, 9));
    const winner = isDeuce ? loser + 2 : 11;

    sets.push(oneWins ? [winner, loser] : [loser, winner]);
    if (oneWins) setsOne++;
    else setsTwo++;
  }

  return sets;
};

/**
 * Completa un partido por el mismo camino que la API (`updateMatch`): así los
 * stats, el ELO, las tablas de grupo y el avance del cuadro son los reales y no
 * una copia que se pueda desincronizar.
 */
const playMatch = async (ctx: EngineContext, matchId: string, setsToWin: number) => {
  const { prisma, rng, seasonId } = ctx;
  const existing = await prisma.match.findUniqueOrThrow({ where: { id: matchId } });

  // Un EXENTO (bye) llega a las llaves de puestos como perdedor de un partido sin rival: se resuelve
  // como walkover 11-0, sin stats ni ELO (no hay rival real), y el cuadro avanza igual.
  if (existing.playerOneId === BYE_USER_ID || existing.playerTwoId === BYE_USER_ID) {
    const playerOneWins = existing.playerTwoId === BYE_USER_ID;
    await prisma.match.update({
      where: { id: matchId },
      data: {
        setOnePlayerOne: playerOneWins ? 11 : 0,
        setOnePlayerTwo: playerOneWins ? 0 : 11,
        status: 'Completado',
        seasonId,
      },
    });
    await processKnockoutAdvancement(prisma, matchId);
    return;
  }

  const stats = await prisma.stats.findMany({
    where: { userId: { in: [existing.playerOneId, existing.playerTwoId] }, seasonId },
  });
  const eloOf = (userId: string) => stats.find((s) => s.userId === userId)?.elo ?? 500;

  const sets = simulateSets(rng, eloOf(existing.playerOneId), eloOf(existing.playerTwoId), setsToWin);
  const scores: Prisma.MatchUncheckedUpdateInput = {};
  sets.forEach(([one, two], index) => {
    const [fieldOne, fieldTwo] = SET_FIELDS[index];
    scores[fieldOne] = one;
    scores[fieldTwo] = two;
  });

  await updateMatch(prisma, existing, { ...scores, status: 'Completado', seasonId });
};

const playablePhaseMatches = (prisma: PrismaClient, tournamentId: string, phase: 'group' | 'knockout') =>
  prisma.match.findMany({
    where: {
      tournamentId,
      status: 'Programado',
      playerOneId: { not: TBD_USER_ID },
      playerTwoId: { not: TBD_USER_ID },
      ...(phase === 'group' ? { groupId: { not: null } } : { knockoutId: { not: null } }),
    },
    include: { knockout: true },
    orderBy: { matchOrder: 'asc' },
  });

/** Elige a los inscritos: primero los del rango de ELO pedido y, si faltan, los más cercanos. */
const pickParticipants = async (ctx: EngineContext, spec: TournamentSpec, count: number) => {
  const stats = await ctx.prisma.stats.findMany({
    where: { seasonId: ctx.seasonId, user: { clubId: ctx.clubId, userType: { name: 'Player' } } },
    select: { userId: true, elo: true },
  });
  const [minElo, maxElo] = spec.eloRange ?? [0, Number.MAX_SAFE_INTEGER];
  const inRange = ctx.rng.shuffle(stats.filter((s) => (s.elo ?? 0) >= minElo && (s.elo ?? 0) <= maxElo));
  const rest = ctx.rng.shuffle(stats.filter((s) => !inRange.includes(s)));

  return [...inRange, ...rest].slice(0, count).map((s) => s.userId);
};

const playGroupPhase = async (ctx: EngineContext, tournamentId: string, spec: TournamentSpec) => {
  const matches = ctx.rng.shuffle(await playablePhaseMatches(ctx.prisma, tournamentId, 'group'));
  const toPlay =
    spec.stage === 'grupos'
      ? matches.slice(0, Math.floor(matches.length * 0.55))
      : matches.slice(0, matches.length - (spec.stage === 'gruposCasiCompletos' ? 1 : 0));

  for (const match of toPlay) {
    await playMatch(ctx, match.id, spec.setsToWinGroup);
  }
};

/** La final de la llave A es la que se deja sin jugar en `knockoutCasiCompleto`. */
const isMainFinal = (match: { knockout: { type: string; round: string; positions: string | null } | null }) =>
  match.knockout?.type === 'A' && match.knockout.round === 'Final' && match.knockout.positions?.startsWith('1-');

const playKnockoutPhase = async (ctx: EngineContext, tournamentId: string, spec: TournamentSpec) => {
  const maxPasses = spec.stage === 'knockout' ? (spec.knockoutPasses ?? 1) : Number.POSITIVE_INFINITY;
  let pass = 0;

  for (;;) {
    let playable = await playablePhaseMatches(ctx.prisma, tournamentId, 'knockout');
    if (spec.stage === 'knockoutCasiCompleto') playable = playable.filter((m) => !isMainFinal(m));
    if (playable.length === 0) return;

    // Tras las rondas completas se juega solo la mitad de la siguiente: así queda un cuadro a medias.
    const isPartialPass = pass >= maxPasses;
    const toPlay = isPartialPass ? playable.slice(0, Math.floor(playable.length / 2)) : playable;

    for (const match of toPlay) {
      await playMatch(ctx, match.id, spec.setsToWinKnockout);
    }
    if (isPartialPass) return;
    pass++;
  }
};

/** Crea un torneo, inscribe a sus jugadores y lo lleva hasta el estado pedido. */
export const createDemoTournament = async (ctx: EngineContext, spec: TournamentSpec) => {
  const { prisma, seasonId, clubId } = ctx;
  const date = daysFromToday(spec.daysFromToday);

  const tournament = await prisma.tournament.create({
    data: {
      name: spec.name,
      dateStart: date,
      clubId,
      seasonId,
      numPlayers: spec.size,
      numGroup: spec.numGroup,
      numGroupPlayers: spec.numGroupPlayers,
      typeTournament: 'Interno',
      levelTournament: spec.levelTournament,
      rounds: spec.rounds,
      status: 'Programado',
      typeKnockout: spec.typeKnockout,
      playersKnockout: spec.playersKnockout,
      sortGroups: SortGroups.Snake,
      sortKnockout: SortKnockout.Siembra,
      allPos: spec.allPos,
      groupsCreated: false,
      knockoutCreated: false,
      setsToWinGroup: spec.setsToWinGroup,
      setsToWinKnockout: spec.setsToWinKnockout,
    },
  });

  const pending = spec.extraPending ?? 0;
  const picked = await pickParticipants(ctx, spec, spec.size + pending);
  const confirmed = picked.slice(0, spec.size);
  const unconfirmed = picked.slice(spec.size);

  await prisma.tournamentParticipant.createMany({
    data: [
      ...confirmed.map((playerId) => ({ tournamentId: tournament.id, playerId, status: 'Confirmado' as const })),
      ...unconfirmed.map((playerId, i) => ({
        tournamentId: tournament.id,
        playerId,
        status: i === unconfirmed.length - 1 && unconfirmed.length > 1 ? ('NoPresentado' as const) : ('Pendiente' as const),
      })),
    ],
  });
  await prisma.stats.updateMany({
    where: { userId: { in: confirmed }, seasonId },
    data: { tournamentPart: { increment: 1 } },
  });

  if (spec.stage !== 'programado') {
    await generateTournamentGroups(prisma, tournament.id);
    await prisma.match.updateMany({ where: { tournamentId: tournament.id }, data: { seasonId } });
    await playGroupPhase(ctx, tournament.id, spec);

    if (['knockout', 'knockoutCasiCompleto', 'completado'].includes(spec.stage)) {
      await playKnockoutPhase(ctx, tournament.id, spec);
    }

    // Los partidos de eliminatorias los crea el motor sin temporada ni fecha del torneo.
    await prisma.match.updateMany({ where: { tournamentId: tournament.id }, data: { seasonId, dateStart: date } });
  }

  const final = await prisma.tournament.findUniqueOrThrow({
    where: { id: tournament.id },
    select: { status: true },
  });
  const matches = await prisma.match.groupBy({
    by: ['status'],
    where: { tournamentId: tournament.id },
    _count: true,
  });
  const summary = matches.map((m) => `${m._count} ${m.status}`).join(', ');
  console.log(`   • ${spec.name} (${spec.size} jug.) → ${final.status} [${summary || 'sin partidos'}]`);

  return tournament;
};

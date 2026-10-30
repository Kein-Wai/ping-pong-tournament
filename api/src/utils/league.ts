import { MatchStatus, PlayerTournamentStatus } from '@prisma/client';
import type { League, Prisma, PrismaClient } from '@prisma/client';
import { ApiError } from '../http/response';
import { generateLeagueSchedule } from './league-schedule';
import { computeLeagueStandings } from './league-standings';
import type { PlayerStanding } from './group-standings';
import { updateMatch } from './match-result';

/** Mínimo de jugadores confirmados para poder iniciar una liga. */
export const MIN_LEAGUE_PLAYERS = 3;

/** Partidos que todavía no tienen resultado y pueden darse por cancelados o W.O. */
const PENDING_STATUSES = [MatchStatus.Programado, MatchStatus.Iniciado, MatchStatus.Abierto];

/** Puntos de cada set que gana el jugador en un W.O. (nunca 0-0: ese set no contaría). */
const WALKOVER_SET_POINTS = 11;

const SET_FIELDS = [
  ['setOnePlayerOne', 'setOnePlayerTwo'],
  ['setTwoPlayerOne', 'setTwoPlayerTwo'],
  ['setThreePlayerOne', 'setThreePlayerTwo'],
  ['setFourPlayerOne', 'setFourPlayerTwo'],
  ['setFivePlayerOne', 'setFivePlayerTwo'],
  ['setSixPlayerOne', 'setSixPlayerTwo'],
  ['setSevenPlayerOne', 'setSevenPlayerTwo'],
] as const;

/** Fila de la clasificación de una liga: la de `computeLeagueStandings` sin su id interno. */
export type LeagueStandingRow = Omit<PlayerStanding, 'id'>;

/**
 * Marcador convencional de un W.O.: el ganador se lleva los sets necesarios por
 * 11-0. Ver ADR 0002: así el ganador se deduce de los sets como en cualquier
 * partido y el ELO y la clasificación no necesitan lógica aparte.
 */
export const buildWalkoverScore = (
  setsToWin: number,
  winnerIsPlayerOne: boolean,
): Record<(typeof SET_FIELDS)[number][number], number> => {
  const score = {} as Record<(typeof SET_FIELDS)[number][number], number>;
  SET_FIELDS.forEach(([playerOneField, playerTwoField], index) => {
    const won = index < setsToWin;
    score[playerOneField] = won && winnerIsPlayerOne ? WALKOVER_SET_POINTS : 0;
    score[playerTwoField] = won && !winnerIsPlayerOne ? WALKOVER_SET_POINTS : 0;
  });
  return score;
};

/**
 * Inicia una liga: descarta las inscripciones pendientes, genera todos los
 * partidos Programados (sin fecha propia: llevan la de inicio de la liga hasta
 * que se juegan) y bloquea la lista de jugadores.
 */
export const startLeague = async (prisma: PrismaClient, league: League): Promise<void> => {
  await prisma.$transaction(async (tx) => {
    const confirmed = await tx.leagueParticipant.findMany({
      where: { leagueId: league.id, status: PlayerTournamentStatus.Confirmado },
      orderBy: { registeredAt: 'asc' },
    });
    if (confirmed.length < MIN_LEAGUE_PLAYERS) {
      throw new ApiError(400, `Se necesitan al menos ${MIN_LEAGUE_PLAYERS} jugadores confirmados`);
    }

    // Reclamar la liga con la condición de estado evita que dos peticiones simultáneas la inicien dos veces.
    const claimed = await tx.league.updateMany({
      where: { id: league.id, status: MatchStatus.Programado },
      data: { status: MatchStatus.Iniciado, numPlayers: confirmed.length },
    });
    if (claimed.count === 0) {
      throw new ApiError(409, 'La liga ya no está Programada');
    }

    await tx.leagueParticipant.deleteMany({
      where: { leagueId: league.id, status: PlayerTournamentStatus.Pendiente },
    });

    const schedule = generateLeagueSchedule(
      confirmed.map((participant) => participant.playerId),
      league.doubleRound,
    );
    let matchOrder = 0;
    await tx.match.createMany({
      data: schedule.flatMap((round) =>
        round.matches.map((matchup) => ({
          leagueId: league.id,
          seasonId: league.seasonId,
          dateStart: league.dateStart,
          round: round.round,
          matchOrder: ++matchOrder,
          playerOneId: matchup.playerOneId,
          playerTwoId: matchup.playerTwoId,
          status: MatchStatus.Programado,
        })),
      ),
    });
  });
};

/** Jugadores que figuran en la clasificación: los confirmados y los que se retiraron. */
const loadStandingPlayerIds = async (
  tx: Prisma.TransactionClient | PrismaClient,
  leagueId: string,
): Promise<string[]> => {
  const players = await tx.leagueParticipant.findMany({
    where: {
      leagueId,
      status: { in: [PlayerTournamentStatus.Confirmado, PlayerTournamentStatus.NoPresentado] },
    },
    select: { playerId: true },
    orderBy: { registeredAt: 'asc' },
  });
  return players.map((player) => player.playerId);
};

/**
 * Cierra una liga: cancela los partidos sin jugar, guarda la clasificación
 * final (ver ADR 0001) y la pasa a Completado. Recibe un cliente de
 * transacción para poder llamarse junto a la escritura que la dispara.
 */
export const finalizeLeague = async (
  tx: Prisma.TransactionClient,
  leagueId: string,
): Promise<void> => {
  // Reclamar el cierre con la condición de estado evita que dos resultados simultáneos
  // lo hagan dos veces: el segundo ve la liga ya Completada y no escribe nada.
  const claimed = await tx.league.updateMany({
    where: { id: leagueId, status: MatchStatus.Iniciado },
    data: { status: MatchStatus.Completado },
  });
  if (claimed.count === 0) return;

  const [playerIds, matches] = await Promise.all([
    loadStandingPlayerIds(tx, leagueId),
    tx.match.findMany({ where: { leagueId, status: MatchStatus.Completado } }),
  ]);

  await tx.match.updateMany({
    where: { leagueId, status: { in: PENDING_STATUSES } },
    data: { status: MatchStatus.Cancelado },
  });

  const standings = computeLeagueStandings(playerIds, matches);

  await tx.leagueClas.deleteMany({ where: { leagueId } });
  await tx.leagueClas.createMany({
    data: standings.map(({ id: _id, ...row }) => ({ ...row, leagueId })),
  });
};

/** Cancela una liga Programada o Iniciada y sus partidos sin jugar. Lo ya jugado se conserva. */
export const cancelLeague = async (prisma: PrismaClient, league: League): Promise<void> => {
  if (league.status !== MatchStatus.Programado && league.status !== MatchStatus.Iniciado) {
    throw new ApiError(400, 'Solo se puede cancelar una liga Programada o Iniciada');
  }

  await prisma.$transaction(async (tx) => {
    await tx.match.updateMany({
      where: { leagueId: league.id, status: { in: PENDING_STATUSES } },
      data: { status: MatchStatus.Cancelado },
    });
    await tx.league.update({ where: { id: league.id }, data: { status: MatchStatus.Cancelado } });
  });
};

/**
 * Retira a un jugador de una liga Iniciada: cada partido que le queda se da por
 * W.O. a su rival (con el ELO que corresponde a una derrota) y el jugador pasa
 * a No presentado.
 *
 * Se marca al jugador al final: si un partido falla a mitad, repetir la
 * retirada sigue funcionando y termina los que quedaron.
 */
export const withdrawPlayer = async (
  prisma: PrismaClient,
  league: League,
  playerId: string,
): Promise<void> => {
  if (league.status !== MatchStatus.Iniciado) {
    throw new ApiError(400, 'Solo se puede retirar a un jugador de una liga iniciada');
  }

  const key = { leagueId_playerId: { leagueId: league.id, playerId } };
  const participant = await prisma.leagueParticipant.findUnique({ where: key });
  if (!participant) {
    throw new ApiError(404, 'Participante no encontrado');
  }
  if (participant.status === PlayerTournamentStatus.NoPresentado) {
    throw new ApiError(400, 'El jugador ya está retirado de la liga');
  }

  const pending = await prisma.match.findMany({
    where: {
      leagueId: league.id,
      status: { in: PENDING_STATUSES },
      OR: [{ playerOneId: playerId }, { playerTwoId: playerId }],
    },
    orderBy: [{ round: 'asc' }, { matchOrder: 'asc' }],
  });

  // Uno a uno: cada resultado actualiza el ELO de los dos jugadores.
  for (const match of pending) {
    const winnerIsPlayerOne = match.playerTwoId === playerId;
    await updateMatch(prisma, match, {
      ...buildWalkoverScore(league.setsToWin, winnerIsPlayerOne),
      status: MatchStatus.Completado,
      walkover: true,
      dateStart: new Date(),
    });
  }

  await prisma.leagueParticipant.update({
    where: key,
    data: { status: PlayerTournamentStatus.NoPresentado },
  });
};

/**
 * Clasificación de una liga: la foto final guardada si está Completada y, en
 * cualquier otro caso, la calculada al momento con los partidos completados.
 */
export const getLeagueStandings = async (
  prisma: PrismaClient,
  league: League,
): Promise<{ final: boolean; standings: LeagueStandingRow[] }> => {
  if (league.status === MatchStatus.Completado) {
    const rows = await prisma.leagueClas.findMany({
      where: { leagueId: league.id },
      orderBy: { position: 'asc' },
    });
    return {
      final: true,
      standings: rows.map((row) => ({
        playerId: row.playerId,
        played: row.played ?? 0,
        gamesWon: row.gamesWon ?? 0,
        gamesLost: row.gamesLost ?? 0,
        setsWon: row.setsWon ?? 0,
        setsLost: row.setsLost ?? 0,
        pointsWon: row.pointsWon ?? 0,
        pointsLost: row.pointsLost ?? 0,
        pointsClas: row.pointsClas ?? 0,
        position: row.position ?? 0,
      })),
    };
  }

  const [playerIds, matches] = await Promise.all([
    loadStandingPlayerIds(prisma, league.id),
    prisma.match.findMany({ where: { leagueId: league.id, status: MatchStatus.Completado } }),
  ]);
  const standings = computeLeagueStandings(playerIds, matches).map(({ id: _id, ...row }) => row);

  return { final: false, standings };
};

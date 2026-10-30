import { Request, Response, Router } from 'express';
import type { ZodType } from 'zod';
import { MatchStatus, PlayerTournamentStatus, Prisma } from '@prisma/client';
import prisma from '../db';
import {
  addLeagueParticipantsSchema,
  createLeagueSchema,
  updateLeagueParticipantStatusSchema,
  updateLeagueSchema,
} from '../schemas/league';
import { UserPayload, requireAdminClub } from '../middleware/auth.middleware';
import { buildClubScope, canAccessClub, hasClubPermission, isOutOfClubScope } from '../utils/auth';
import { resolveCurrentSeason } from '../utils/season';
import { asyncHandler, sendData, sendError, sendMessage } from '../http/response';
import {
  cancelLeague,
  finalizeLeague,
  getLeagueStandings,
  startLeague,
  withdrawPlayer,
} from '../utils/league';

const router = Router();

const NOT_FOUND = 'Liga no encontrada';
const ONLY_PROGRAMMED = 'Solo se puede hacer mientras la liga está Programada';

/** Un jugador solo ve ligas de su club y únicamente si el club ya lo ha aprobado. */
const canViewLeague = (user: UserPayload | undefined, clubId: string | null): boolean => {
  if (!canAccessClub(user, clubId)) return false;

  return user?.role !== 'Player' || user.clubStatus === 'Aprobado';
};

const isUniqueViolation = (error: unknown): boolean =>
  error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002';

/** Datos del jugador que salen en las respuestas: nunca la fila de usuario entera (credenciales). */
const PUBLIC_PLAYER_SELECT = { id: true, name: true, surname: true, avatarUrl: true } as const;

/** Valida el cuerpo con Zod; si es inválido responde 400 y devuelve null. */
const parseBody = <T>(schema: ZodType<T>, req: Request, res: Response): T | null => {
  const validation = schema.safeParse(req.body);
  if (!validation.success) {
    sendError(res, 400, 'Datos inválidos', validation.error.issues[0]?.message);
    return null;
  }
  return validation.data;
};

/** Carga la liga y comprueba que el usuario puede verla. Responde 404 y devuelve null si no. */
const loadViewableLeague = async (req: Request, res: Response) => {
  const league = await prisma.league.findUnique({ where: { id: req.params.id as string } });
  if (!league || !canViewLeague(req.user, league.clubId)) {
    sendError(res, 404, NOT_FOUND);
    return null;
  }
  return league;
};

router.get('/', asyncHandler(async (req, res) => {
  const user = req.user;
  const isUnapprovedPlayer = user?.role === 'Player' && user.clubStatus !== 'Aprobado';
  if (isOutOfClubScope(user) || isUnapprovedPlayer) {
    return sendData(res, []);
  }

  const leagues = await prisma.league.findMany({
    where: buildClubScope(user),
    include: { _count: { select: { participants: true } } },
    orderBy: { dateStart: 'desc' },
  });

  return sendData(res, leagues);
}, 'Error al obtener las ligas'));

router.post('/', requireAdminClub, asyncHandler(async (req, res) => {
  const body = parseBody(createLeagueSchema, req, res);
  if (!body) return;

  // El club sale siempre del token, nunca del cuerpo de la petición.
  const clubId = req.user?.clubId;
  if (!clubId) {
    return sendError(res, 403, 'Solo un administrador de club puede crear ligas');
  }

  const season = await resolveCurrentSeason(prisma);
  const { dateStart, ...rest } = body;

  try {
    const league = await prisma.league.create({
      data: { ...rest, dateStart: new Date(dateStart), clubId, seasonId: season.id },
    });
    return sendData(res, league, 201);
  } catch (error) {
    if (isUniqueViolation(error)) {
      return sendError(res, 409, 'Ya existe una liga con ese nombre en tu club');
    }
    throw error;
  }
}, 'Error al crear la liga'));

router.get('/:id', asyncHandler(async (req, res) => {
  const league = await prisma.league.findUnique({
    where: { id: req.params.id as string },
    include: {
      participants: {
        include: { player: { select: PUBLIC_PLAYER_SELECT } },
        orderBy: { registeredAt: 'asc' },
      },
    },
  });

  if (!league || !canViewLeague(req.user, league.clubId)) {
    return sendError(res, 404, NOT_FOUND);
  }

  return sendData(res, league);
}, 'Error al obtener la liga'));

/**
 * Carga la liga y comprueba que el usuario puede gestionarla. Responde 404 o 403
 * (o 400 si se exige `programmedOnly` y la liga ya empezó) y devuelve null cuando
 * no puede seguir.
 */
const loadManagedLeague = async (
  req: Request,
  res: Response,
  { programmedOnly = false }: { programmedOnly?: boolean } = {},
) => {
  const league = await prisma.league.findUnique({ where: { id: req.params.id as string } });
  if (!league) {
    sendError(res, 404, NOT_FOUND);
    return null;
  }
  if (!hasClubPermission(req.user, league.clubId)) {
    sendError(res, 403, 'No tienes permiso sobre esta liga');
    return null;
  }
  if (programmedOnly && league.status !== MatchStatus.Programado) {
    sendError(res, 400, ONLY_PROGRAMMED);
    return null;
  }
  return league;
};

router.put('/:id', requireAdminClub, asyncHandler(async (req, res) => {
  const body = parseBody(updateLeagueSchema, req, res);
  if (!body) return;

  const league = await loadManagedLeague(req, res, { programmedOnly: true });
  if (!league) return;

  const { dateStart, ...rest } = body;
  try {
    const updated = await prisma.league.update({
      where: { id: league.id },
      data: { ...rest, ...(dateStart ? { dateStart: new Date(dateStart) } : {}) },
    });
    return sendData(res, updated);
  } catch (error) {
    if (isUniqueViolation(error)) {
      return sendError(res, 409, 'Ya existe una liga con ese nombre en tu club');
    }
    throw error;
  }
}, 'Error al actualizar la liga'));

router.delete('/:id', requireAdminClub, asyncHandler(async (req, res) => {
  const league = await loadManagedLeague(req, res);
  if (!league) return;
  if (league.status !== MatchStatus.Programado) {
    return sendError(res, 400, 'Una liga iniciada no se puede borrar, solo cancelar');
  }

  await prisma.league.delete({ where: { id: league.id } });
  return sendMessage(res, 'Liga eliminada');
}, 'Error al eliminar la liga'));

router.post('/:id/participants', requireAdminClub, asyncHandler(async (req, res) => {
  const body = parseBody(addLeagueParticipantsSchema, req, res);
  if (!body) return;

  const league = await loadManagedLeague(req, res, { programmedOnly: true });
  if (!league) return;

  if (!league.clubId) {
    return sendError(res, 400, 'La liga no pertenece a ningún club');
  }

  // Solo se añaden jugadores del propio club de la liga; un id repetido cuenta una vez.
  const playerIds = [...new Set(body.playerIds)];
  const [clubPlayers, existing] = await Promise.all([
    prisma.user.findMany({
      where: { id: { in: playerIds }, clubId: league.clubId },
      select: { id: true },
    }),
    prisma.leagueParticipant.findMany({
      where: { leagueId: league.id, playerId: { in: playerIds } },
      select: { playerId: true },
    }),
  ]);
  if (clubPlayers.length !== playerIds.length) {
    return sendError(res, 400, 'Todos los jugadores deben pertenecer al club de la liga');
  }

  const alreadyIn = new Set(existing.map((participant) => participant.playerId));
  const toAdd = playerIds.filter((id) => !alreadyIn.has(id));

  await prisma.leagueParticipant.createMany({
    data: toAdd.map((playerId) => ({
      leagueId: league.id,
      playerId,
      status: PlayerTournamentStatus.Confirmado,
    })),
  });

  return sendMessage(res, 'Jugadores añadidos con éxito', 201);
}, 'Error al añadir jugadores a la liga'));

router.put('/:id/participants/:playerId/status', requireAdminClub, asyncHandler(async (req, res) => {
  const body = parseBody(updateLeagueParticipantStatusSchema, req, res);
  if (!body) return;

  const league = await loadManagedLeague(req, res, { programmedOnly: true });
  if (!league) return;

  const key = { leagueId_playerId: { leagueId: league.id, playerId: req.params.playerId as string } };
  const participant = await prisma.leagueParticipant.findUnique({ where: key });
  if (!participant) {
    return sendError(res, 404, 'Participante no encontrado');
  }

  await prisma.leagueParticipant.update({ where: key, data: { status: body.status } });
  return sendMessage(res, `Jugador marcado como ${body.status}`);
}, 'Error al actualizar el estado del participante'));

router.delete('/:id/participants/:playerId', requireAdminClub, asyncHandler(async (req, res) => {
  const league = await loadManagedLeague(req, res, { programmedOnly: true });
  if (!league) return;

  const key = { leagueId_playerId: { leagueId: league.id, playerId: req.params.playerId as string } };
  const participant = await prisma.leagueParticipant.findUnique({ where: key });
  if (!participant) {
    return sendError(res, 404, 'Participante no encontrado');
  }

  await prisma.leagueParticipant.delete({ where: key });
  return sendMessage(res, 'Jugador quitado de la liga');
}, 'Error al quitar al jugador de la liga'));

router.post('/:id/register', asyncHandler(async (req, res) => {
  const user = req.user;
  if (user?.role !== 'Player') {
    return sendError(res, 403, 'Solo un jugador puede inscribirse en una liga');
  }

  const league = await prisma.league.findUnique({ where: { id: req.params.id as string } });
  if (!league || !canViewLeague(user, league.clubId)) {
    return sendError(res, 404, NOT_FOUND);
  }
  if (league.status !== MatchStatus.Programado) {
    return sendError(res, 400, 'Las inscripciones están cerradas');
  }

  const existing = await prisma.leagueParticipant.findUnique({
    where: { leagueId_playerId: { leagueId: league.id, playerId: user.id } },
  });
  if (existing) {
    return sendError(res, 409, 'Ya estás inscrito en esta liga');
  }

  const participant = await prisma.leagueParticipant.create({
    data: { leagueId: league.id, playerId: user.id, status: PlayerTournamentStatus.Pendiente },
  });
  return sendMessage(res, 'Inscripción enviada, pendiente de confirmación', 201, participant);
}, 'Error al inscribirse en la liga'));

router.delete('/:id/register', asyncHandler(async (req, res) => {
  const user = req.user;
  if (user?.role !== 'Player') {
    return sendError(res, 403, 'Solo un jugador puede darse de baja de una liga');
  }

  const league = await prisma.league.findUnique({ where: { id: req.params.id as string } });
  if (!league || !canViewLeague(user, league.clubId)) {
    return sendError(res, 404, NOT_FOUND);
  }
  if (league.status !== MatchStatus.Programado) {
    return sendError(res, 400, 'Ya no puedes darte de baja: la liga ha empezado');
  }

  const key = { leagueId_playerId: { leagueId: league.id, playerId: user.id } };
  const existing = await prisma.leagueParticipant.findUnique({ where: key });
  if (!existing) {
    return sendError(res, 404, 'No estás inscrito en esta liga');
  }

  await prisma.leagueParticipant.delete({ where: key });
  return sendMessage(res, 'Te has dado de baja de la liga');
}, 'Error al darse de baja de la liga'));

router.post('/:id/start', requireAdminClub, asyncHandler(async (req, res) => {
  const league = await loadManagedLeague(req, res, { programmedOnly: true });
  if (!league) return;

  await startLeague(prisma, league);
  return sendMessage(res, 'Liga iniciada');
}, 'Error al iniciar la liga'));

router.post('/:id/cancel', requireAdminClub, asyncHandler(async (req, res) => {
  const league = await loadManagedLeague(req, res);
  if (!league) return;

  await cancelLeague(prisma, league);
  return sendMessage(res, 'Liga cancelada');
}, 'Error al cancelar la liga'));

router.post('/:id/finish', requireAdminClub, asyncHandler(async (req, res) => {
  const league = await loadManagedLeague(req, res);
  if (!league) return;
  if (league.status !== MatchStatus.Iniciado) {
    return sendError(res, 400, 'Solo se puede finalizar una liga iniciada');
  }

  await prisma.$transaction((tx) => finalizeLeague(tx, league.id));
  return sendMessage(res, 'Liga finalizada');
}, 'Error al finalizar la liga'));

router.post('/:id/participants/:playerId/withdraw', requireAdminClub, asyncHandler(async (req, res) => {
  const league = await loadManagedLeague(req, res);
  if (!league) return;

  await withdrawPlayer(prisma, league, req.params.playerId as string);
  return sendMessage(res, 'Jugador retirado: sus partidos pendientes se dan por perdidos');
}, 'Error al retirar al jugador de la liga'));

router.get('/:id/matches', asyncHandler(async (req, res) => {
  const league = await loadViewableLeague(req, res);
  if (!league) return;

  const matches = await prisma.match.findMany({
    where: { leagueId: league.id },
    include: {
      playerOne: { select: PUBLIC_PLAYER_SELECT },
      playerTwo: { select: PUBLIC_PLAYER_SELECT },
    },
    orderBy: [{ round: 'asc' }, { matchOrder: 'asc' }],
  });

  return sendData(res, matches);
}, 'Error al obtener el calendario de la liga'));

router.get('/:id/standings', asyncHandler(async (req, res) => {
  const league = await loadViewableLeague(req, res);
  if (!league) return;

  return sendData(res, await getLeagueStandings(prisma, league));
}, 'Error al obtener la clasificación de la liga'));

export default router;

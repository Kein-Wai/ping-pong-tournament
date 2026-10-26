import { Router } from 'express';
import prisma from '../../db';
import { KnockoutType } from '@prisma/client';
import { fetchTournamentBracket } from '../../utils/knockout';
import { fetchGroupMatches, fetchGroupClassifications } from '../../utils/standings';
import { buildClubScope } from '../../utils/auth';
import { UserPayload } from '../../middleware/auth.middleware';
import { asyncHandler } from '../../http/response';
import { toSafeUser } from '../../utils/safe-user';

const router = Router();

/**
 * Visibilidad de los torneos para el usuario autenticado.
 *
 * El alcance por club lo decide el seam de utils/auth. La regla de "torneos
 * abiertos" es propia del dominio de torneos y se mantiene aqui.
 */
const buildTournamentScope = (
  user: UserPayload | undefined,
  clubStatus: string,
): Record<string, unknown> => {
  const role = user?.role;
  const clubId = user?.clubId;
  const clubScope = buildClubScope(user);

  if (role === 'SuperAdmin') return {};
  if (role === 'AdminClub') return clubScope;

  if (clubId && clubStatus === 'Aprobado') {
    return { OR: [clubScope, { typeTournament: 'Abierto' }] };
  }

  return { typeTournament: 'Abierto' };
};

router.get('/', asyncHandler(async (req, res) => {
  const role = req.user?.role;
  const clubId = req.user?.clubId;
  const userId = req.user?.id;
  let clubStatus = 'Registrado';
  if (userId) {
    const userDb = await prisma.user.findUnique({
      where: { id: userId },
      select: { clubStatus: true },
    });
    if (userDb?.clubStatus) clubStatus = userDb.clubStatus;
  }

  const tournaments = await prisma.tournament.findMany({
    where: buildTournamentScope(req.user, clubStatus),
    include: {
      club: { select: { name: true } },
    },
    orderBy: { dateStart: 'asc' },
  });

  return res.status(200).json({ success: true, data: tournaments });

}, 'Error al obtener torneos', 500));

router.get(
  '/:id',
  asyncHandler(async (req, res) => {
    const tournamentId = req.params.id as string;
    const tournament = await prisma.tournament.findUnique({
      where: {
        id: tournamentId,
      },
      include: {
        participants: {
          include: {
            player: {
              include: {
                stats: true,
              },
            },
          },
        },
      },
    });
    // `include` trae todos los escalares del jugador (hash, tokens): se quitan antes de responder.
    if (tournament) {
      const safeTournament = {
        ...tournament,
        participants: tournament.participants.map((participant) => ({
          ...participant,
          player: toSafeUser(participant.player),
        })),
      };
      return res.status(200).json({ success: true, data: safeTournament });
    }
    else
      return res
        .status(200)
        .json({ success: true, data: tournament, message: 'Torneo no encontrado' });
  }, 'Error al obtener torneo'),
);

router.get('/:id/participants', asyncHandler(async (req, res) => {
  const tournamentId = req.params.id as string;

  const participants = await prisma.tournamentParticipant.findMany({
    where: { tournamentId: tournamentId },
    include: {
      player: {
        select: { id: true, name: true, surname: true, stats: true },
      },
    },
    orderBy: { registeredAt: 'asc' },
  });

  return res.status(200).json({
    success: true,
    data: participants,
  });

}, 'Error interno del servidor al cargar los participantes.', 500));

router.get('/:id/bracket', asyncHandler(async (req, res) => {
  const tournamentId = req.params.id as string;

  const type = (req.query.type as KnockoutType) || KnockoutType.A;

  const knockouts = await fetchTournamentBracket(prisma, tournamentId, type);

  if (!knockouts || knockouts.length === 0) {
    return res.status(404).json({
      success: false,
      message: 'No se ha generado el cuadro para este torneo todavía.',
    });
  }

  return res.status(200).json({
    success: true,
    data: knockouts,
  });

}, 'Error interno del servidor al cargar el cuadro.', 500));

router.get('/:id/groups/matches', asyncHandler(async (req, res) => {
  const tournamentId = req.params.id as string;
  const { groupId } = req.query;

  const matches = await fetchGroupMatches(prisma, tournamentId, groupId as string);

  return res.status(200).json({ success: true, data: matches });

}, 'Error al obtener los partidos del grupo.', 500));

router.get('/:id/groups/classifications', asyncHandler(async (req, res) => {
  const tournamentId = req.params.id as string;
  const { groupId } = req.query;

  const clasifications = await fetchGroupClassifications(prisma, tournamentId, groupId as string);

  return res.status(200).json({ success: true, data: clasifications });

}, 'Error al obtener la clasificación.', 500));

router.get('/:id/classifications', asyncHandler(async (req, res) => {
  const tournamentId = req.params.id as string;

  const clasifications = await prisma.tournamentClas.findMany({
    where: { tournamentId: tournamentId },
    include: {
      player: {
        select: { id: true, name: true, surname: true },
      },
    },
  });

  return res.status(200).json({ success: true, data: clasifications });

}, 'Error al obtener la clasificación.', 500));

router.get('/player/:playerId/enrolled', asyncHandler(async (req, res) => {
  const { playerId } = req.params as { [key: string]: string };

  // Solo el jugador puede ver sus propias inscripciones en el dashboard
  if (req.user?.id !== playerId) return res.status(403).json({ success: false, error: 'No autorizado' });

  const inscriptions = await prisma.tournamentParticipant.findMany({
    where: {
      playerId: playerId,
      tournament: {
        status: { notIn: ['Completado', 'Cancelado'] },
      },
    },
    include: {
      tournament: true,
    },
    orderBy: { tournament: { dateStart: 'asc' } },
  });

  const tournaments = inscriptions.map((i) => i.tournament);
  res.status(200).json({ success: true, data: tournaments });

}, 'Error al obtener torneos inscritos', 500));

export default router;

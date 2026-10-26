import { Router } from 'express';
import prisma from '../../db';
import { registerBulkSchema, registerParticipantSchema } from '../../schemas/tournament';
import { registerParticipant } from '../../utils/tournament-inscriptions';
import { resolveCurrentSeason } from '../../utils/season';
import { hasClubPermission, resolveResourceAccess } from '../../utils/auth';
import { requireAdminClub } from '../../middleware/auth.middleware';
import { enviarCorreoGenerico } from '../../services/email';
import { templateInscripcionTorneo } from '../../utils/emailtemplate';
import { asyncHandler, sendError, sendMessage } from '../../http/response';

const router = Router();

router.post('/:id/register', asyncHandler(async (req, res) => {
  const tournamentId = req.params.id as string;
  const userId = req.user?.id;

  if (!userId) {
    return sendError(res, 401, 'Usuario no autenticado');
  }

  // Traemos los datos frescos del usuario desde la BD
  const currentUser = await prisma.user.findUnique({
    where: { id: userId },
  });

  if (!currentUser || !currentUser.email || !currentUser.name) {
    return sendError(res, 401, 'Faltan datos del usuario en la base de datos');
  }

  const validation = registerParticipantSchema.safeParse(req.body);
  if (!validation.success) {
    sendError(res, 400, 'Datos inválidos', validation.error.format());
    return;
  }
  const { playerId } = validation.data;

  const tournament = await prisma.tournament.findUnique({
    where: { id: tournamentId },
    include: {
      _count: {
        select: { participants: true },
      },
    },
  });

  if (!tournament) {
    sendError(res, 404, 'Torneo no encontrado');
    return;
  }

  const result = await registerParticipant(
    prisma,
    {
      tournamentId,
      playerId,
      user: {
        id: currentUser.id,
        clubId: currentUser.clubId,
        clubStatus: currentUser.clubStatus,
      },
      confirmed: false,
    },
    tournament,
    tournament._count.participants,
  );

  if (!result.ok) {
    sendError(res, result.error.status, result.error.message);
    return;
  }

  enviarCorreoGenerico(
    currentUser.email,
    'Te han inscrito en un nuevo torneo',
    templateInscripcionTorneo(currentUser.name, tournament),
  ).catch(console.error);

  sendMessage(res, 'Jugador inscrito con éxito', 201, result.participant);

}, 'Error interno al inscribir jugador', 500));

router.post('/:id/register-bulk', requireAdminClub, asyncHandler(async (req, res) => {
  const tournamentId = req.params.id as string;

  const bulkValidation = registerBulkSchema.safeParse(req.body);
  if (!bulkValidation.success) {
    return sendError(res, 400, 'Datos inválidos', bulkValidation.error.issues[0]?.message);
  }
  const { playerIds } = bulkValidation.data;

  const access = resolveResourceAccess(
    await prisma.tournament.findUnique({
      where: { id: tournamentId },
      include: { _count: { select: { participants: true } } },
    }),
    req.user,
  );

  if (!access.ok) {
    if (access.reason === 'notFound') {
      return sendError(res, 404, 'Torneo no encontrado');
    }
    return sendError(res, 403, 'No tienes permiso sobre este torneo');
  }
  const { resource: tournament } = access;
  if (tournament.groupsCreated) {
    return sendError(res, 400, 'Las inscripciones están cerradas.');
  }

  const availableSpots = tournament.numPlayers - tournament._count.participants;
  if (playerIds.length > availableSpots) {
    return sendError(res, 400, `Solo quedan ${availableSpots} plazas disponibles.`);
  }

  // Filtrar los que ya están inscritos por si acaso
  const existing = await prisma.tournamentParticipant.findMany({
    where: { tournamentId, playerId: { in: playerIds } },
  });
  const existingIds = existing.map((e) => e.playerId);
  const newPlayers = playerIds.filter((id: string) => !existingIds.includes(id));

  // Insertamos los nuevos confirmándolos directamente
  const dataToInsert = newPlayers.map((id: string) => ({
    tournamentId,
    playerId: id,
    status: 'Confirmado' as any,
  }));

  await prisma.tournamentParticipant.createMany({ data: dataToInsert });

  if (newPlayers.length > 0) {
    const currentSeason = await resolveCurrentSeason(prisma);
    await prisma.stats.updateMany({
      where: { userId: { in: newPlayers }, seasonId: currentSeason.id },
      data: { tournamentPart: { increment: 1 } },
    });
  }

  // Buscamos a los jugadores recién inscritos para mandarles el email
  if (newPlayers.length > 0) {
    const enrolledUsers = await prisma.user.findMany({
      where: { id: { in: newPlayers } },
      select: { email: true, name: true },
    });

    // Disparamos los correos en segundo plano (Fire-and-forget)
    enrolledUsers.forEach((user) => {
      if (user.email && user.name && !user.email.endsWith('.local')) {
        enviarCorreoGenerico(
          user.email,
          'Te han inscrito en un nuevo torneo',
          templateInscripcionTorneo(user.name, tournament),
        ).catch((err) => console.error(`Fallo silencioso al enviar email a ${user.email}:`, err));
      }
    });
  }

  sendMessage(res, 'Jugadores inscritos con éxito', 201);

}, 'Error al inscribir jugadores masivamente', 500));

router.put('/:id/participants/:playerId/status', requireAdminClub, asyncHandler(async (req, res) => {
  const id = req.params.id as string;
  const playerId = req.params.playerId as string;
  const { status } = req.body;

  const currentSeason = await resolveCurrentSeason(prisma);

  const tournament = await prisma.tournament.findUnique({ where: { id } });
  if (!tournament || !hasClubPermission(req.user, tournament.clubId)) {
    return sendError(res, 403, 'No tienes permisos sobre este torneo');
  }

  const currentParticipant = await prisma.tournamentParticipant.findUnique({
    where: { tournamentId_playerId: { tournamentId: id, playerId } },
  });

  if (!currentParticipant) {
    return sendError(res, 404, 'Participante no encontrado');
  }

  await prisma.tournamentParticipant.update({
    where: { tournamentId_playerId: { tournamentId: id, playerId } },
    data: { status },
  });

  if (status === 'NoPresentado' && currentParticipant.status !== 'NoPresentado') {
    await prisma.stats.updateMany({
      where: { userId: playerId, seasonId: currentSeason.id },
      data: { elo: { decrement: 100 } },
    });
  } else if (status !== 'NoPresentado' && currentParticipant.status === 'NoPresentado') {
    await prisma.stats.updateMany({
      where: { userId: playerId, seasonId: currentSeason.id },
      data: { elo: { increment: 100 } },
    });
  }

  if (status === 'Confirmado' && currentParticipant.status !== 'Confirmado') {
    await prisma.stats.updateMany({
      where: { userId: playerId, seasonId: currentSeason.id },
      data: { tournamentPart: { increment: 1 } },
    });
  } else if (status !== 'Confirmado' && currentParticipant.status === 'Confirmado') {
    // Si le quitan el "Confirmado" (porque lo pasan a Pendiente o NoPresentado), le restamos la participación
    await prisma.stats.updateMany({
      where: { userId: playerId, seasonId: currentSeason.id },
      data: { tournamentPart: { decrement: 1 } },
    });
  }

  sendMessage(res, `Jugador marcado como ${status}`);

}, 'Error al actualizar el estado del participante', 500));

export default router;

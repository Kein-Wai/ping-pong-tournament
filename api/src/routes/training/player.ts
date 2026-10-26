import { Router } from 'express';
import prisma from '../../db';
import { asyncHandler } from '../../http/response';
import { canManageTraining, canViewTraining } from '../../utils/training-access';

const router = Router();

router.get('/player/:playerId', asyncHandler(async (req, res) => {
  const { playerId } = req.params as { [key: string]: string };
  // 1. Regla de seguridad: el propio jugador, el AdminClub de su club o el SuperAdmin
  const owner = await prisma.user.findUnique({
    where: { id: playerId },
    select: { id: true, clubId: true },
  });
  if (!owner) {
    return res.status(404).json({ success: false, error: 'Jugador no encontrado' });
  }
  if (!canViewTraining(req.user, owner)) {
    return res
      .status(403)
      .json({ success: false, error: 'No tienes permiso para ver los entrenamientos de este jugador' });
  }

  // 2. Consulta a Prisma
  const plans = await prisma.playerTraining.findMany({
    where: { playerId },
    orderBy: { startDate: 'desc' },
    include: {
      _count: { select: { sessions: true } }, // Contamos las sesiones para la UI
    },
  });

  res.status(200).json({ success: true, data: plans });

}, 'Error al obtener los planes del jugador', 500));

router.get('/player/:playerId/upcoming', asyncHandler(async (req, res) => {
  const { playerId } = req.params as { [key: string]: string };

  // Seguridad: Solo el propio jugador puede ver sus avisos del dashboard
  if (req.user?.id !== playerId) {
    return res.status(403).json({ success: false, error: 'No autorizado' });
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0); // Desde las 00:00 de hoy

  const upcomingSessions = await prisma.trainingSession.findMany({
    where: {
      training: { playerId: playerId },
      exercises: { some: { completed: false } },
    },
    orderBy: { date: 'asc' },
    take: 3, // Mostramos solo las 3 más inminentes
    include: {
      training: { select: { id: true, objectives: true } },
      _count: { select: { exercises: true } }, // Contamos cuántos ejercicios tiene
    },
  });

  res.status(200).json({ success: true, data: upcomingSessions });

}, 'Error al obtener próximas sesiones', 500));

export default router;

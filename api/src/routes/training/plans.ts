import { Router } from 'express';
import prisma from '../../db';
import { z } from 'zod';
import { asyncHandler, sendData, sendError, sendMessage } from '../../http/response';
import { createTrainingSchema } from '../../schemas/training';
import { requireAdminClub } from '../../middleware/auth.middleware';
import { resolveCurrentSeason } from '../../utils/season';
import { hasClubPermission } from '../../utils/auth';
import { canManageTraining, canViewTraining } from '../../utils/training-access';

const router = Router();

// Distribución lógica de días según las sesiones semanales (0 es el día de inicio)
const DAYS_OFFSET: Record<number, number[]> = {
  1: [0], // Ej: Lunes
  2: [0, 3], // Ej: Lunes, Jueves
  3: [0, 2, 4], // Ej: Lunes, Miércoles, Viernes
  4: [0, 1, 3, 5], // Ej: Lunes, Martes, Jueves, Sábado
  5: [0, 1, 2, 3, 4], // Ej: Lunes a Viernes
};

router.post('/', requireAdminClub, asyncHandler(async (req, res) => {

  // 1. Validar cuerpo de la petición
  const validation = createTrainingSchema.safeParse(req.body);
  if (!validation.success) {
    return sendError(res, 400, 'Datos inválidos', z.treeifyError(validation.error));
  }

  const data = validation.data;
  const start = new Date(data.startDate);

  // 2. Seguridad: Verificar que el jugador pertenece al club del entrenador
  const player = await prisma.user.findUnique({ where: { id: data.playerId } });
  if (!player || !hasClubPermission(req.user, player.clubId)) {
    return sendError(res, 403, 'El jugador no pertenece a tu club');
  }

  // 3. Generar el array de sesiones futuras en memoria
  const sessionsToCreate = [];
  const offsets = DAYS_OFFSET[data.sessionsPerWeek] || DAYS_OFFSET[1];

  for (let week = 0; week < data.weeks; week++) {
    for (const offset of offsets) {
      const sessionDate = new Date(start);
      sessionDate.setDate(start.getDate() + week * 7 + offset);

      sessionsToCreate.push({
        date: sessionDate,
        playerId: data.playerId,
      });
    }
  }

  const currentSeason = await resolveCurrentSeason(prisma);
  // 4. Inserción Anidada en Prisma (Crea el plan y sus N sesiones de golpe)
  const newTraining = await prisma.playerTraining.create({
    data: {
      playerId: data.playerId,
      seasonId: currentSeason.id,
      strengths: data.strengths,
      weaknesses: data.weaknesses,
      objectives: data.objectives,
      sessionsPerWeek: data.sessionsPerWeek,
      weeks: data.weeks,
      startDate: start,
      // Magia de Prisma: creamos las sesiones vacías vinculadas automáticamente
      sessions: {
        create: sessionsToCreate,
      },
    },
    include: {
      sessions: true, // Devolvemos el plan con las sesiones ya generadas
    },
  });

  sendData(res, newTraining, 201);

}, 'Error al crear el plan de entrenamiento', 500));

router.get('/:planId', asyncHandler(async (req, res) => {
  const { planId } = req.params as { [key: string]: string };

  const plan = await prisma.playerTraining.findUnique({
    where: { id: planId },
    include: {
      player: {
        select: { id: true, name: true, surname: true, clubId: true },
      },
      sessions: {
        orderBy: { date: 'asc' },
        include: {
          exercises: {
            include: {
              exercise: true,
            },
          },
        },
      },
    },
  });

  if (!plan) {
    return sendError(res, 404, 'Plan de entrenamiento no encontrado');
  }

  // Solo el propio jugador, el AdminClub de su club o el SuperAdmin pueden verlo
  if (!canViewTraining(req.user, { id: plan.playerId, clubId: plan.player.clubId })) {
    return sendError(res, 403, 'No tienes permiso para ver los detalles de este plan');
  }

  sendData(res, plan);

}, 'Error al obtener el plan', 500));

router.delete('/:planId', requireAdminClub, asyncHandler(async (req, res) => {
  const planId = req.params.planId as string;

  const plan = await prisma.playerTraining.findUnique({
    where: { id: planId },
    select: { player: { select: { id: true, clubId: true } } },
  });
  if (!plan) {
    return sendError(res, 404, 'Plan de entrenamiento no encontrado');
  }
  if (!canManageTraining(req.user, plan.player)) {
    return sendError(res, 403, 'No tienes permiso sobre este plan');
  }

  await prisma.playerTraining.delete({
    where: { id: planId },
  });

  sendMessage(res, 'Plan de entrenamiento eliminado');

}, 'Error al eliminar el plan de entrenamiento', 500));

export default router;

import { Router } from 'express';
import prisma from '../../db';
import { z } from 'zod';
import { asyncHandler, sendData, sendError, sendMessage } from '../../http/response';
import { createSingleSessionSchema, completeSessionSchema } from '../../schemas/training';
import { calculateSkillGrowth } from '../../utils/skills';
import { canManageTraining, canViewTraining } from '../../utils/training-access';

const router = Router();

router.post('/sessions', asyncHandler(async (req, res) => {
  const userId = req.user?.id;
  if (!userId) return sendError(res, 401, 'No autorizado');

  const validation = createSingleSessionSchema.safeParse(req.body);
  if (!validation.success) {
    return sendError(res, 400, 'Datos inválidos', z.treeifyError(validation.error));
  }

  const newSession = await prisma.trainingSession.create({
    data: {
      playerId: userId,
      date: new Date(validation.data.date),
      title: validation.data.title || 'Entrenamiento Libre',
      // playerTrainingId se queda vacío (null)
    },
  });

  sendData(res, newSession, 201);

}, 'Error al crear la sesión libre', 500));

router.get('/sessions/:sessionId', asyncHandler(async (req, res) => {
  const { sessionId } = req.params as { [key: string]: string };
  const session = await prisma.trainingSession.findUnique({
    where: { id: sessionId },
    include: {
      exercises: {
        include: { exercise: true }, // Traemos la descripción del catálogo
      },
      player: { select: { id: true, clubId: true } },
    },
  });

  if (!session) return sendError(res, 404, 'Sesión no encontrada');
  if (!canViewTraining(req.user, session.player)) {
    return sendError(res, 403, 'No tienes permiso para ver esta sesión');
  }

  // El jugador solo se carga para autorizar: no forma parte de la respuesta.
  const { player: _owner, ...sessionData } = session;
  sendData(res, sessionData);

}, 'Error al obtener la sesión', 500));

router.post('/sessions/:id/complete', asyncHandler(async (req, res) => {
  const userId = req.user?.id;
  if (!userId) return sendError(res, 401, 'No autorizado');

  const validation = completeSessionSchema.safeParse(req.body);
  if (!validation.success) {
    return sendError(res, 400, 'Datos inválidos', z.treeifyError(validation.error));
  }

  // 1. Verificamos que la sesión existe y pertenece al usuario
  const session = await prisma.trainingSession.findUnique({
    where: { id: req.params.id as string },
    include: { player: { include: { skills: true } } },
  });

  if (!session || session.playerId !== userId) {
    return sendError(res, 404, 'Sesión no encontrada');
  }

  // Función auxiliar para calcular la curva de aprendizaje (la misma que usamos en los partidos)

  const currentSkills = session.player.skills[0]; // Las skills actuales del jugador
  const updateData: any = {};

  // 2. Calculamos el crecimiento SOLO para las skills que el jugador seleccionó
  validation.data.skillsWorked.forEach((skillName) => {
    updateData[skillName] = calculateSkillGrowth(
      currentSkills?.[skillName as keyof typeof currentSkills] as number,
    );
  });

  // 3. Generamos el registro de subida de experiencia COMPLETO directamente
  const skillUpdate = await prisma.playerSkillUpdate.create({
    data: {
      playerId: userId,
      trainingSessionId: session.id,
      sourceType: 'EntrenamientoEspecifico',
      status: 'COMPLETED', // 👈 Ya está completado porque el jugador acaba de terminar
      ...updateData,
    },
  });

  sendMessage(res, '¡Entrenamiento finalizado con éxito!', 200, skillUpdate);

}, 'Error al finalizar el entrenamiento', 500));

export default router;

import { Router } from 'express';
import prisma from '../../db';
import { z } from 'zod';
import { asyncHandler, sendData, sendError, sendMessage } from '../../http/response';
import { addExerciseToSessionSchema } from '../../schemas/training';
import { requireAdminClub } from '../../middleware/auth.middleware';
import { canManageTraining, canViewTraining } from '../../utils/training-access';

/** Jugador al que pertenece la sesión; solo para autorizar. */
const OWNER_SELECT = { player: { select: { id: true, clubId: true } } } as const;

const router = Router();

router.post('/sessions/:sessionId/exercises', requireAdminClub, asyncHandler(async (req, res) => {
  const sessionId = req.params.sessionId as string;

  // 1. Validación de formato (Body)
  const validation = addExerciseToSessionSchema.safeParse(req.body);
  if (!validation.success) {
    return sendError(res, 400, 'Datos inválidos', z.treeifyError(validation.error));
  }

  const { exerciseId, sets, reps, durationMinutes } = validation.data;

  // 2. Comprobar que la sesión y el ejercicio realmente EXISTEN en la BD
  const sessionExists = await prisma.trainingSession.findUnique({
    where: { id: sessionId },
    include: OWNER_SELECT,
  });
  if (!sessionExists) {
    return sendError(res, 404, 'La sesión de entrenamiento no existe');
  }
  if (!canManageTraining(req.user, sessionExists.player)) {
    return sendError(res, 403, 'No tienes permiso sobre esta sesión');
  }

  const exerciseExists = await prisma.exercise.findUnique({ where: { id: exerciseId } });
  if (!exerciseExists) {
    return sendError(res, 404, 'El ejercicio indicado no existe en el catálogo');
  }

  // 3. Regla de negocio (Opcional pero recomendada): Un mismo ejercicio no debería estar dos veces en la misma sesión
  const alreadyAdded = await prisma.sessionExercise.findFirst({
    where: { trainingSessionId: sessionId, exerciseId: exerciseId },
  });

  if (alreadyAdded) {
    return sendError(res, 400, 'Este ejercicio ya está asignado a esta sesión');
  }

  const currentExercisesCount = await prisma.sessionExercise.count({
    where: { trainingSessionId: sessionId },
  });

  if (currentExercisesCount >= 6) {
    return sendError(res, 400, 'Se ha alcanzado el límite máximo de 6 ejercicios por sesión');
  }

  // 4. Guardar en la tabla pivote
  const sessionExercise = await prisma.sessionExercise.create({
    data: {
      trainingSessionId: sessionId,
      exerciseId,
      sets,
      reps,
      durationMinutes,
    },
  });

  sendData(res, sessionExercise, 201);

}, 'Error al añadir el ejercicio a la sesión', 500));

router.post(
  '/sessions/:targetSessionId/clone-from/:sourceSessionId',
  requireAdminClub,
  asyncHandler(async (req, res) => {
    const { targetSessionId, sourceSessionId } = req.params as { [key: string]: string };

    // 0. Ambas sesiones deben ser de jugadores del club del administrador
    const [targetSession, sourceSession] = await Promise.all([
      prisma.trainingSession.findUnique({ where: { id: targetSessionId }, include: OWNER_SELECT }),
      prisma.trainingSession.findUnique({ where: { id: sourceSessionId }, include: OWNER_SELECT }),
    ]);
    if (!targetSession || !sourceSession) {
      return sendError(res, 404, 'La sesión de entrenamiento no existe');
    }
    if (
      !canManageTraining(req.user, targetSession.player) ||
      !canManageTraining(req.user, sourceSession.player)
    ) {
      return sendError(res, 403, 'No tienes permiso sobre estas sesiones');
    }

    // 1. Obtener los ejercicios de la sesión origen
    const sourceExercises = await prisma.sessionExercise.findMany({
      where: { trainingSessionId: sourceSessionId },
    });

    if (sourceExercises.length === 0) {
      return sendError(res, 400, 'La sesión origen no tiene ejercicios para copiar');
    }

    // 2. Limpiar la sesión destino (opcional, para evitar duplicados) o insertar los nuevos
    const newExercises = sourceExercises.map((ex) => ({
      trainingSessionId: targetSessionId,
      exerciseId: ex.exerciseId,
      sets: ex.sets,
      reps: ex.reps,
      durationMinutes: ex.durationMinutes,
    }));

    await prisma.sessionExercise.createMany({
      data: newExercises,
    });

    sendMessage(res, 'Ejercicios clonados con éxito', 201);
  
}, 'Error al clonar los ejercicios de la sesión', 500),
);

router.delete('/sessions/exercises/:sessionExerciseId', requireAdminClub, asyncHandler(async (req, res) => {
  const sessionExerciseId = req.params.sessionExerciseId as string;

  const target = await prisma.sessionExercise.findUnique({
    where: { id: sessionExerciseId },
    include: { session: { include: OWNER_SELECT } },
  });
  if (!target) {
    return sendError(res, 404, 'Ejercicio de la sesión no encontrado');
  }
  if (!canManageTraining(req.user, target.session.player)) {
    return sendError(res, 403, 'No tienes permiso sobre esta sesión');
  }

  // Eliminamos directamente por el ID único de la relación en SessionExercise
  await prisma.sessionExercise.delete({
    where: { id: sessionExerciseId },
  });

  sendMessage(res, 'Ejercicio eliminado de la sesión');

}, 'Error al eliminar el ejercicio de la sesión', 500));

router.put('/sessions/exercises/:sessionExerciseId', asyncHandler(async (req, res) => {
  const sessionExerciseId = req.params.sessionExerciseId as string;
  const { completed, notes } = req.body; // El frontend nos enviará si está completado y notas opcionales

  // Lo marca el propio jugador (o el administrador de su club)
  const existing = await prisma.sessionExercise.findUnique({
    where: { id: sessionExerciseId },
    include: { session: { include: OWNER_SELECT } },
  });
  if (!existing) {
    return sendError(res, 404, 'Ejercicio de la sesión no encontrado');
  }
  if (!canViewTraining(req.user, existing.session.player)) {
    return sendError(res, 403, 'No tienes permiso sobre esta sesión');
  }

  const updatedExercise = await prisma.sessionExercise.update({
    where: { id: sessionExerciseId },
    data: {
      completed: completed !== undefined ? completed : undefined,
      notes: notes !== undefined ? notes : undefined,
    },
    include: {
      session: true, // 👈 Esto nos da el playerTrainingId
    },
  });

  const planId = updatedExercise.session.playerTrainingId as string;

  // 2. Contamos cuántos ejercicios quedan en TODO el macrociclo con completed: false
  const pendingExercises = await prisma.sessionExercise.count({
    where: {
      session: { playerTrainingId: planId },
      completed: false,
    },
  });

  // 3. Actualizamos el estado general del Macrociclo
  if (pendingExercises === 0) {
    // ¡No quedan pendientes! Se ha pasado el juego
    await prisma.playerTraining.update({
      where: { id: planId },
      data: { status: 'Completado', endDate: new Date() },
    });
  } else {
    // Aún quedan, o ha desmarcado uno sin querer
    await prisma.playerTraining.update({
      where: { id: planId },
      data: { status: 'Activo', endDate: null },
    });
  }

  sendData(res, updatedExercise);

}, 'Error al actualizar el ejercicio', 500));

export default router;

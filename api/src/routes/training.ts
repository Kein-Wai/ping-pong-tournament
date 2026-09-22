import { Router } from 'express';
import prisma from '../db';
import { createTrainingSchema } from '../schemas/training'; // El Zod que creamos antes
import { z } from 'zod';
import { requireAdminClub } from '../middleware/auth.middleware';
import { getCurrentSeason } from '../utils/season';
const router = Router();

// Distribución lógica de días según las sesiones semanales (0 es el día de inicio)
const DAYS_OFFSET: Record<number, number[]> = {
  1: [0], // Ej: Lunes
  2: [0, 3], // Ej: Lunes, Jueves
  3: [0, 2, 4], // Ej: Lunes, Miércoles, Viernes
  4: [0, 1, 3, 5], // Ej: Lunes, Martes, Jueves, Sábado
  5: [0, 1, 2, 3, 4], // Ej: Lunes a Viernes
};

router.post('/', requireAdminClub, async (req, res) => {
  try {
    const userClubId = req.user?.clubId;

    // 1. Validar cuerpo de la petición
    const validation = createTrainingSchema.safeParse(req.body);
    if (!validation.success) {
      return res
        .status(400)
        .json({ error: 'Datos inválidos', details: z.treeifyError(validation.error) });
    }

    const data = validation.data;
    const start = new Date(data.startDate);

    // 2. Seguridad: Verificar que el jugador pertenece al club del entrenador
    const player = await prisma.user.findUnique({ where: { id: data.playerId } });
    if (!player || (req.user?.role === 'AdminClub' && player.clubId !== userClubId)) {
      return res.status(403).json({ error: 'El jugador no pertenece a tu club' });
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
        });
      }
    }

    const currentSeason = await getCurrentSeason(prisma);
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

    res.status(201).json({ success: true, data: newTraining });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, error: 'Error al crear el plan de entrenamiento' });
  }
});

import { addExerciseToSessionSchema } from '../schemas/training';

// GET /api/trainings/:planId
// GET /api/trainings/:planId
// CAMBIO 1: Usamos verifyToken en lugar de requireAdminClub
router.get('/:planId', async (req, res) => {
  try {
    const { planId } = req.params;

    const plan = await prisma.playerTraining.findUnique({
      where: { id: planId },
      include: {
        player: {
          select: { id: true, name: true, surname: true },
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
      return res.status(404).json({ error: 'Plan de entrenamiento no encontrado' });
    }

    // CAMBIO 2: Lógica de Seguridad (Solo el dueño o los Admins pueden verlo)
    const isOwnProfile = req.user?.id === plan.playerId;
    const isAdmin = req.user?.role === 'AdminClub' || req.user?.role === 'SuperAdmin';

    if (!isOwnProfile && !isAdmin) {
      return res
        .status(403)
        .json({ error: 'No tienes permiso para ver los detalles de este plan' });
    }

    res.status(200).json({ success: true, data: plan });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, error: 'Error al obtener el plan' });
  }
});

router.delete('/:planId', requireAdminClub, async (req, res) => {
  try {
    const planId = req.params.planId as string;

    await prisma.playerTraining.delete({
      where: { id: planId },
    });

    res.status(200).json({ success: true, message: 'Plan de entrenamiento eliminado' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, error: 'Error al eliminar el plan de entrenamiento' });
  }
});

router.get('/sessions/:sessionId', async (req, res) => {
  try {
    const { sessionId } = req.params;
    const session = await prisma.trainingSession.findUnique({
      where: { id: sessionId },
      include: {
        exercises: {
          include: { exercise: true }, // Traemos la descripción del catálogo
        },
      },
    });

    if (!session) return res.status(404).json({ error: 'Sesión no encontrada' });
    res.status(200).json({ success: true, data: session });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, error: 'Error al obtener la sesión' });
  }
});

// POST /api/trainings/sessions/:sessionId/exercises
router.post('/sessions/:sessionId/exercises', requireAdminClub, async (req, res) => {
  try {
    const sessionId = req.params.sessionId as string;

    // 1. Validación de formato (Body)
    const validation = addExerciseToSessionSchema.safeParse(req.body);
    if (!validation.success) {
      return res
        .status(400)
        .json({ error: 'Datos inválidos', details: z.treeifyError(validation.error) });
    }

    const { exerciseId, sets, reps, durationMinutes } = validation.data;

    // 2. Comprobar que la sesión y el ejercicio realmente EXISTEN en la BD
    const sessionExists = await prisma.trainingSession.findUnique({ where: { id: sessionId } });
    if (!sessionExists) {
      return res.status(404).json({ error: 'La sesión de entrenamiento no existe' });
    }

    const exerciseExists = await prisma.exercise.findUnique({ where: { id: exerciseId } });
    if (!exerciseExists) {
      return res.status(404).json({ error: 'El ejercicio indicado no existe en el catálogo' });
    }

    // 3. Regla de negocio (Opcional pero recomendada): Un mismo ejercicio no debería estar dos veces en la misma sesión
    const alreadyAdded = await prisma.sessionExercise.findFirst({
      where: { trainingSessionId: sessionId, exerciseId: exerciseId },
    });

    if (alreadyAdded) {
      return res.status(400).json({ error: 'Este ejercicio ya está asignado a esta sesión' });
    }

    const currentExercisesCount = await prisma.sessionExercise.count({
      where: { trainingSessionId: sessionId },
    });

    if (currentExercisesCount >= 6) {
      return res
        .status(400)
        .json({ error: 'Se ha alcanzado el límite máximo de 6 ejercicios por sesión' });
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

    res.status(201).json({ success: true, data: sessionExercise });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, error: 'Error al añadir el ejercicio a la sesión' });
  }
});

// POST /api/trainings/sessions/:targetSessionId/clone-from/:sourceSessionId
router.post(
  '/sessions/:targetSessionId/clone-from/:sourceSessionId',
  requireAdminClub,
  async (req, res) => {
    try {
      const { targetSessionId, sourceSessionId } = req.params;

      // 1. Obtener los ejercicios de la sesión origen
      const sourceExercises = await prisma.sessionExercise.findMany({
        where: { trainingSessionId: sourceSessionId as string },
      });

      if (sourceExercises.length === 0) {
        return res.status(400).json({ error: 'La sesión origen no tiene ejercicios para copiar' });
      }

      // 2. Limpiar la sesión destino (opcional, para evitar duplicados) o insertar los nuevos
      const newExercises = sourceExercises.map((ex) => ({
        trainingSessionId: targetSessionId as string,
        exerciseId: ex.exerciseId,
        sets: ex.sets,
        reps: ex.reps,
        durationMinutes: ex.durationMinutes,
      }));

      await prisma.sessionExercise.createMany({
        data: newExercises,
      });

      res.status(201).json({ success: true, message: 'Ejercicios clonados con éxito' });
    } catch (error) {
      console.error(error);
      res
        .status(500)
        .json({ success: false, error: 'Error al clonar los ejercicios de la sesión' });
    }
  },
);

router.delete('/sessions/exercises/:sessionExerciseId', requireAdminClub, async (req, res) => {
  try {
    const sessionExerciseId = req.params.sessionExerciseId as string;

    // Eliminamos directamente por el ID único de la relación en SessionExercise
    await prisma.sessionExercise.delete({
      where: { id: sessionExerciseId },
    });

    res.status(200).json({ success: true, message: 'Ejercicio eliminado de la sesión' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, error: 'Error al eliminar el ejercicio de la sesión' });
  }
});

// GET /api/trainings/player/:playerId - Lista de planes de un jugador
// Usamos verifyToken genérico, pero comprobamos dentro si es el dueño o un Admin
router.get('/player/:playerId', async (req, res) => {
  try {
    const { playerId } = req.params;
    const isOwnProfile = req.user?.id === playerId;
    const isAdmin = req.user?.role === 'AdminClub' || req.user?.role === 'SuperAdmin';
    // 1. Regla de seguridad
    if (!isOwnProfile && !isAdmin) {
      return res
        .status(403)
        .json({ error: 'No tienes permiso para ver los entrenamientos de este jugador' });
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
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, error: 'Error al obtener los planes del jugador' });
  }
});

// GET /api/trainings/player/:playerId/upcoming - Próximas sesiones para el Dashboard
router.get('/player/:playerId/upcoming', async (req, res) => {
  try {
    const { playerId } = req.params;

    // Seguridad: Solo el propio jugador puede ver sus avisos del dashboard
    if (req.user?.id !== playerId) {
      return res.status(403).json({ error: 'No autorizado' });
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
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, error: 'Error al obtener próximas sesiones' });
  }
});

// PUT /api/trainings/sessions/exercises/:sessionExerciseId - Actualizar estado
router.put('/sessions/exercises/:sessionExerciseId', async (req, res) => {
  try {
    const { sessionExerciseId } = req.params;
    const { completed, notes } = req.body; // El frontend nos enviará si está completado y notas opcionales

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

    const planId = updatedExercise.session.playerTrainingId;

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

    res.status(200).json({ success: true, data: updatedExercise });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, error: 'Error al actualizar el ejercicio' });
  }
});

export default router;

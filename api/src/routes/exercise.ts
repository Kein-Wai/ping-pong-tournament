import { Router } from 'express';
import prisma from '../db';
import { getExercisesQuerySchema, createExerciseSchema } from '../schemas/exercise';
import { z } from 'zod';
import { requireAdminClub, verifyToken } from '../middleware/auth.middleware';
import { asyncHandler } from '../http/response';

const router = Router();

router.get('/', asyncHandler(async (req, res) => {
  // 1. Validamos lo que viene tras el "?" en la URL (ej: /api/exercises?category=Saques_Largos)
  const validation = getExercisesQuerySchema.safeParse(req.query);

  if (!validation.success) {
    return res
      .status(400)
      .json({ success: false, error: 'Categoría inválida', details: z.treeifyError(validation.error) });
  }

  const { category } = validation.data;

  // 2. Aquí va la consulta a Prisma
  const userClubId = req.user?.clubId;

  // 1. Condición base: O es global (null) O es de tu club
  let whereClause: any = {
    OR: [{ clubId: null }, { clubId: userClubId }],
  };

  // 2. Si nos han pasado una categoría en la URL, la añadimos al filtro
  if (category) {
    whereClause.category = category;
  }

  // 3. Ejecutamos la consulta
  const exercises = await prisma.exercise.findMany({
    where: whereClause,
    orderBy: { name: 'asc' },
  });

  // 3. Devolvemos el resultado
  res.status(200).json({ success: true, data: exercises });

}, 'Error al obtener los ejercicios', 500));

router.post('/', verifyToken, requireAdminClub, asyncHandler(async (req, res) => {
  const role = req.user?.role;
  const userClubId = req.user?.clubId;

  // 1. Validación de Zod (Asegura que vengan name, description y category)
  const validation = createExerciseSchema.safeParse(req.body);

  if (!validation.success) {
    return res
      .status(400)
      .json({ success: false, error: 'Datos inválidos', details: z.treeifyError(validation.error) });
  }

  const { name, description, objective, category, code } = validation.data;

  // 2. Lógica Multi-tenant
  let finalClubId = userClubId;

  if (role === 'SuperAdmin') {
    // El SuperAdmin crea ejercicios globales para toda la app
    finalClubId = null;
  } else if (!userClubId) {
    // Prevención de errores: Un AdminClub sin club asignado no debería poder crear nada
    return res.status(403).json({ success: false, error: 'No tienes un club asignado para crear ejercicios' });
  }

  // 3. Guardar en Base de Datos
  const newExercise = await prisma.exercise.create({
    data: {
      name,
      description,
      objective,
      category,
      code,
      clubId: finalClubId,
    },
  });

  res.status(201).json({ success: true, data: newExercise });

}, 'Error al crear el ejercicio', 500));

export default router;

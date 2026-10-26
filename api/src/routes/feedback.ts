import { Router } from 'express';
import { z } from 'zod';
import prisma from '../db';
import { verifyToken, requireSuperAdmin } from '../middleware/auth.middleware';
import { asyncHandler, sendData, sendError } from '../http/response';

const router = Router();

const feedbackSchema = z.object({
  type: z.enum(['Bug', 'Sugerencia']),
  content: z.string().min(10, 'Por favor, detalla un poco más (mínimo 10 caracteres)'),
});

// GET: El Admin ve TODOS, un usuario normal ve LOS SUYOS
router.get('/', verifyToken, asyncHandler(async (req, res) => {
  const isSuperAdmin = req.user?.role === 'SuperAdmin';
  const whereClause = isSuperAdmin ? {} : { userId: req.user?.id };

  const feedbacks = await prisma.appFeedback.findMany({
    where: whereClause,
    include: {
      user: { select: { name: true, surname: true, email: true } },
    },
    orderBy: { createdAt: 'desc' },
  });

  sendData(res, feedbacks);

}, 'Error al obtener los reportes', 500));

// POST: Crear un nuevo ticket
router.post('/', verifyToken, asyncHandler(async (req, res) => {
  const validation = feedbackSchema.safeParse(req.body);
  if (!validation.success)
    return sendError(res, 400, 'Datos inválidos', z.treeifyError(validation.error));

  const newFeedback = await prisma.appFeedback.create({
    data: {
      userId: req.user!.id,
      type: validation.data.type,
      content: validation.data.content,
    },
  });

  sendData(res, newFeedback, 201);

}, 'Error al enviar el reporte', 500));

// PUT: El SuperAdmin marca como Revisado/Resuelto
router.put('/:id/status', verifyToken, requireSuperAdmin, asyncHandler(async (req, res) => {
  const { status } = req.body;
  const updated = await prisma.appFeedback.update({
    where: { id: req.params.id as string },
    data: { status },
  });
  sendData(res, updated);

}, 'Error al actualizar estado', 500));

export default router;

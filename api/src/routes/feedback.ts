import { Router } from 'express';
import { z } from 'zod';
import prisma from '../db';
import { verifyToken, requireSuperAdmin } from '../middleware/auth.middleware';

const router = Router();

const feedbackSchema = z.object({
  type: z.enum(['Bug', 'Sugerencia']),
  content: z.string().min(10, 'Por favor, detalla un poco más (mínimo 10 caracteres)'),
});

// GET: El Admin ve TODOS, un usuario normal ve LOS SUYOS
router.get('/', verifyToken, async (req, res) => {
  try {
    const isSuperAdmin = req.user?.role === 'SuperAdmin';
    const whereClause = isSuperAdmin ? {} : { userId: req.user?.id };

    const feedbacks = await prisma.appFeedback.findMany({
      where: whereClause,
      include: {
        user: { select: { name: true, surname: true, email: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    res.status(200).json({ success: true, data: feedbacks });
  } catch (error) {
    res.status(500).json({ error: 'Error al obtener los reportes' });
  }
});

// POST: Crear un nuevo ticket
router.post('/', verifyToken, async (req, res) => {
  try {
    const validation = feedbackSchema.safeParse(req.body);
    if (!validation.success)
      return res
        .status(400)
        .json({ error: 'Datos inválidos', details: z.treeifyError(validation.error) });

    const newFeedback = await prisma.appFeedback.create({
      data: {
        userId: req.user!.id,
        type: validation.data.type as any,
        content: validation.data.content,
      },
    });

    res.status(201).json({ success: true, data: newFeedback });
  } catch (error) {
    res.status(500).json({ error: 'Error al enviar el reporte' });
  }
});

// PUT: El SuperAdmin marca como Revisado/Resuelto
router.put('/:id/status', verifyToken, requireSuperAdmin, async (req, res) => {
  try {
    const { status } = req.body;
    const updated = await prisma.appFeedback.update({
      where: { id: req.params.id as string },
      data: { status },
    });
    res.status(200).json({ success: true, data: updated });
  } catch (error) {
    res.status(500).json({ error: 'Error al actualizar estado' });
  }
});

export default router;

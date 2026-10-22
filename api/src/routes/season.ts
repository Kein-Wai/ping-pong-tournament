import { Router } from 'express';
import prisma from '../db';
import { verifyToken } from '../middleware/auth.middleware';
import { asyncHandler } from '../http/response';

const router = Router();

router.get('/', verifyToken, asyncHandler(async (req, res) => {
  const seasons = await prisma.season.findMany({
    orderBy: { startDate: 'desc' }, // Las más recientes primero
  });

  res.status(200).json({ success: true, data: seasons });

}, 'Error al obtener las temporadas', 500));

export default router;

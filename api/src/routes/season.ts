import { Router } from 'express';
import prisma from '../db';
import { verifyToken } from '../middleware/auth.middleware';

const router = Router();

router.get('/', verifyToken, async (req, res) => {
  try {
    const seasons = await prisma.season.findMany({
      orderBy: { startDate: 'desc' }, // Las más recientes primero
    });

    res.status(200).json({ success: true, data: seasons });
  } catch (error) {
    console.error('Error al obtener las temporadas:', error);
    res.status(500).json({ error: 'Error al obtener las temporadas' });
  }
});

export default router;

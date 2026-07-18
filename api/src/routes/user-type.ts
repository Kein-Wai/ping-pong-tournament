import { Router } from 'express';
import prisma from '../db';
import { requireSuperAdmin } from '../middleware/auth.middleware';

const router = Router();

router.get('/', requireSuperAdmin, async (req, res) => {
  try {
    const userTypes = await prisma.userType.findMany();
    res.json(userTypes);
  } catch (error) {
    res.status(500).json({ error: 'Error al obtener los tipos de usuario' });
  }
});

export default router;

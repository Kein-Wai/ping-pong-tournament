import { Router } from 'express';
import prisma from '../db';

const router = Router();

router.get('/', async (req, res) => {
  try {
    const userTypes = await prisma.userType.findMany();
    res.json(userTypes);
  } catch (error) {
    res.status(500).json({ error: 'Error al obtener los tipos de usuario' });
  }
});

export default router;

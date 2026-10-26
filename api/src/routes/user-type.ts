import { Router } from 'express';
import prisma from '../db';
import { requireSuperAdmin } from '../middleware/auth.middleware';
import { asyncHandler, sendData } from '../http/response';

const router = Router();

router.get(
  '/',
  requireSuperAdmin,
  asyncHandler(async (req, res) => {
    const userTypes = await prisma.userType.findMany();
    sendData(res, userTypes);
  }, 'Error al obtener los tipos de usuario'),
);

export default router;

import { Router } from 'express';
import prisma from '../db';
import { createClubSchema, updateMemberStatusSchema } from '../schemas/club';
import { z } from 'zod';
import { verifyToken, requireAdminClub } from '../middleware/auth.middleware';

const router = Router();

router.get('/', async (req, res) => {
  try {
    const clubs = await prisma.club.findMany({
      where: { status: 'Aprobado' },
      select: { id: true, name: true, createdAt: true },
    });
    res.status(200).json({ success: true, data: clubs });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Error al obtener los clubes' });
  }
});

router.post('/', async (req, res) => {
  try {
    const validation = createClubSchema.safeParse(req.body);
    if (!validation.success) {
      res.status(400).json({ error: 'Datos inválidos', details: z.treeifyError(validation.error) });
      return;
    }

    const { name } = validation.data;

    const existingClub = await prisma.club.findUnique({ where: { name } });
    if (existingClub) {
      res.status(400).json({ error: 'Ya existe un club con este nombre' });
      return;
    }

    const newClub = await prisma.club.create({
      data: {
        name,
        status: 'Pendiente',
      },
    });

    res.status(201).json({
      success: true,
      message: 'Club solicitado con éxito. Esperando aprobación.',
      data: newClub,
    });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Error al crear el club' });
  }
});

// POST: Un jugador solicita unirse a un club
router.post('/:id/join', verifyToken, async (req, res) => {
  try {
    // Forzamos a que sean strings puros para limpiar el tipo de Express
    const clubId = req.params.id as string;
    const userId = req.user?.id as string;

    if (!userId) return res.status(401).json({ error: 'No autenticado' });

    // 1. Verificar que el club exista y esté Aprobado
    const club = await prisma.club.findUnique({ where: { id: clubId } });
    if (!club || club.status !== 'Aprobado') {
      res.status(404).json({ error: 'Club no encontrado o no está disponible para unirse' });
      return;
    }

    // 2. Verificar si el usuario ya pertenece a un club
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (user?.clubId) {
      res
        .status(400)
        .json({ error: 'Ya perteneces o has solicitado unirte a un club. Debes salir primero.' });
      return;
    }

    // 3. Actualizar al usuario (Usamos 'as any' o el valor limpio para el enum)
    await prisma.user.update({
      where: { id: userId },
      data: {
        clubId,
        clubStatus: 'Pendiente' as any,
      },
    });

    res.status(200).json({ success: true, message: 'Solicitud enviada al administrador del club' });
  } catch (error) {
    res.status(500).json({ error: 'Error al procesar la solicitud' });
  }
});

// GET: El AdminClub ve a los miembros de SU club
router.get('/:id/members', requireAdminClub, async (req, res) => {
  try {
    const clubId = req.params.id as string; // <-- Forzado a string aquí

    if (req.user?.role === 'AdminClub' && req.user?.clubId !== clubId) {
      res
        .status(403)
        .json({ error: 'No tienes permiso para ver los miembros de un club que no administras' });
      return;
    }

    const members = await prisma.user.findMany({
      where: { clubId: clubId }, // <-- Ahora Prisma sabe al 100% que es un string limpio
      select: {
        id: true,
        name: true,
        surname: true,
        email: true,
        clubStatus: true,
        userType: { select: { name: true } },
      },
      orderBy: { clubStatus: 'asc' },
    });

    res.status(200).json({ success: true, data: members });
  } catch (error) {
    res.status(500).json({ error: 'Error al cargar los miembros' });
  }
});

// PUT: El AdminClub aprueba o rechaza a un jugador
router.put('/:id/members/:userId/status', requireAdminClub, async (req, res) => {
  try {
    const clubId = req.params.id as string;
    const userId = req.params.userId as string; // <-- Forzados ambos a string

    if (req.user?.role === 'AdminClub' && req.user?.clubId !== clubId) {
      res.status(403).json({ error: 'No tienes permiso para administrar este club' });
      return;
    }

    const validation = updateMemberStatusSchema.safeParse(req.body);
    if (!validation.success) {
      res.status(400).json({ error: 'Estado inválido. Debe ser Aprobado o Rechazado.' });
      return;
    }

    const { status } = validation.data;

    const userToUpdate = await prisma.user.findUnique({ where: { id: userId } });
    if (!userToUpdate || userToUpdate.clubId !== clubId) {
      res.status(404).json({ error: 'El usuario no ha solicitado unirse a este club' });
      return;
    }

    const updateData =
      status === 'Rechazado'
        ? { clubId: null, clubStatus: 'Registrado' as any }
        : { clubStatus: status as any };

    await prisma.user.update({
      where: { id: userId },
      data: updateData,
    });

    res.status(200).json({ success: true, message: `Usuario ${status.toLowerCase()} con éxito` });
  } catch (error) {
    res.status(500).json({ error: 'Error al actualizar el estado del miembro' });
  }
});

export default router;

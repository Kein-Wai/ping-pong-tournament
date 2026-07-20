import { Router } from 'express';
import prisma from '../db';
import { createClubSchema, updateMemberStatusSchema, updateClubSchema } from '../schemas/club';
import { z } from 'zod';
import { verifyToken, requireAdminClub, requireSuperAdmin } from '../middleware/auth.middleware';

const router = Router();

router.get('/', async (req, res) => {
  try {
    const clubs = await prisma.club.findMany({
      where: { status: 'Aprobado' },
      select: {
        id: true,
        name: true,
        city: true,
        address: true,
        foundedAt: true,
        createdAt: true,
        _count: {
          select: { users: true },
        },
      },
    });
    console.log(clubs);

    const formattedClubs = clubs.map((club) => ({
      id: club.id,
      name: club.name,
      city: club.city,
      address: club.address,
      foundedAt: club.foundedAt,
      createdAt: club.createdAt,
      memberCount: club._count.users, // <-- Se lo enviamos como un número limpio
    }));
    res.status(200).json({ success: true, data: formattedClubs });
  } catch (error) {
    console.log(error);
    res.status(500).json({ success: false, error: 'Error al obtener los clubes' });
  }
});

router.post('/', verifyToken, async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ error: 'No autenticado' });

    const validation = createClubSchema.safeParse(req.body);
    if (!validation.success) {
      res.status(400).json({ error: 'Datos inválidos', details: z.treeifyError(validation.error) });
      return;
    }

    const { name, city } = validation.data;

    const existingClub = await prisma.club.findUnique({ where: { name } });
    if (existingClub) {
      res.status(400).json({ error: 'Ya existe un club con este nombre' });
      return;
    }

    const newClub = await prisma.club.create({
      data: {
        name,
        city,
        status: 'Pendiente',
      },
    });

    await prisma.user.update({
      where: { id: userId },
      data: {
        clubId: newClub.id,
        clubStatus: 'Aprobado', // Él es el admin, entra automáticamente
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

// GET: Obtener TODOS los clubes (Solo SuperAdmin)
router.get('/admin/all', verifyToken, requireSuperAdmin, async (req, res) => {
  try {
    const clubs = await prisma.club.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        _count: { select: { users: true } },
        // Traemos también los datos del presidente para que el SuperAdmin sepa quién lo solicita
        users: {
          where: { userType: { name: 'AdminClub' } },
          select: { name: true, surname: true, email: true },
        },
      },
    });

    res.status(200).json({ success: true, data: clubs });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Error al obtener la lista global de clubes' });
  }
});

router.get('/:id', verifyToken, async (req, res) => {
  const clubId = req.params.id as string;

  try {
    const club = await prisma.club.findUnique({
      where: { id: clubId },
      include: { _count: { select: { users: true } } },
    });
    if (!club) return res.status(404).json({ error: 'Club no encontrado' });

    res.status(200).json({ success: true, data: club });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Error al obtener el club' });
  }
});

router.put('/:id', verifyToken, requireAdminClub, async (req, res) => {
  try {
    const clubId = req.params.id as string;

    // Seguridad Multi-tenant
    if (req.user?.role === 'AdminClub' && req.user?.clubId !== clubId) {
      return res.status(403).json({ error: 'No tienes permiso para editar este club' });
    }

    const validation = updateClubSchema.safeParse(req.body);
    if (!validation.success) {
      return res
        .status(400)
        .json({ error: 'Datos inválidos', details: z.treeifyError(validation.error) });
    }

    const updatedClub = await prisma.club.update({
      where: { id: clubId },
      data: validation.data,
    });

    res
      .status(200)
      .json({ success: true, message: 'Sede actualizada correctamente', data: updatedClub });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Error al actualizar el club' });
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
router.get('/:id/members', verifyToken, requireAdminClub, async (req, res) => {
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
router.put('/:id/members/:userId/status', verifyToken, requireAdminClub, async (req, res) => {
  try {
    const clubId = req.params.id as string;
    const userId = req.params.userId as string;

    // Verificación de seguridad multi-tenant: El AdminClub solo opera en SU club asignado
    if (req.user?.role === 'AdminClub' && req.user?.clubId !== clubId) {
      res.status(403).json({ error: 'No tienes permiso para administrar este club' });
      return;
    }

    // Validamos usando tu esquema nativo (UserClubStatus.Aprobado | UserClubStatus.Rechazado)
    const validation = updateMemberStatusSchema.safeParse(req.body);
    if (!validation.success) {
      res.status(400).json({ error: 'Estado inválido. Debe ser Aprobado o Rechazado.' });
      return;
    }

    const { status } = validation.data;

    // Verificar si el usuario realmente mandó la solicitud a este club específico
    const userToUpdate = await prisma.user.findUnique({ where: { id: userId } });
    if (!userToUpdate || userToUpdate.clubId !== clubId) {
      res.status(404).json({ error: 'El usuario no ha solicitado unirse a este club' });
      return;
    }

    // Tu lógica original: si es Rechazado, se limpia el clubId y vuelve a Registrado (Jugador Libre)
    const updateData =
      status === 'Rechazado'
        ? { clubId: null, clubStatus: 'Registrado' as any }
        : { clubStatus: status as any };

    await prisma.user.update({
      where: { id: userId },
      data: updateData,
    });

    res.status(200).json({
      success: true,
      message: `Usuario ${status.toLowerCase() === 'aprobado' ? 'aprobado' : 'rechazado'} con éxito`,
    });
  } catch (error) {
    res.status(500).json({ error: 'Error al actualizar el estado del miembro' });
  }
});

export default router;

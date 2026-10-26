import { Router } from 'express';
import prisma from '../db';
import { createClubSchema, updateMemberStatusSchema, updateClubSchema } from '../schemas/club';
import { z } from 'zod';
import {
  verifyToken,
  requireAdminClub,
  requireAdminClubAnyStatus,
  requireSuperAdmin,
} from '../middleware/auth.middleware';
import { createClub, requestMembership, resolveMembership } from '../utils/club-membership';
import { enviarCorreoGenerico } from '../services/email';
import { templateAceptacionClub } from '../utils/emailtemplate';
import { hasClubPermission } from '../utils/auth';
import { asyncHandler, sendData, sendError, sendMessage } from '../http/response';

const router = Router();

router.get('/', asyncHandler(async (req, res) => {
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

  const formattedClubs = clubs.map((club) => ({
    id: club.id,
    name: club.name,
    city: club.city,
    address: club.address,
    foundedAt: club.foundedAt,
    createdAt: club.createdAt,
    memberCount: club._count.users, // <-- Se lo enviamos como un número limpio
  }));
  sendData(res, formattedClubs);

}, 'Error al obtener los clubes', 500));

router.post('/', verifyToken, asyncHandler(async (req, res) => {
  const userId = req.user?.id;
  if (!userId) return sendError(res, 401, 'No autenticado');

  const validation = createClubSchema.safeParse(req.body);
  if (!validation.success) {
    sendError(res, 400, 'Datos inválidos', z.treeifyError(validation.error));
    return;
  }

  const { name, city } = validation.data;

  const existingClub = await prisma.club.findUnique({ where: { name } });
  if (existingClub) {
    sendError(res, 400, 'Ya existe un club con este nombre');
    return;
  }

  const newClub = await createClub(prisma, userId, { name, city });

  sendMessage(res, 'Club solicitado con éxito. Esperando aprobación.', 201, newClub);

}, 'Error al crear el club', 500));

// GET: Obtener TODOS los clubes (Solo SuperAdmin)
router.get('/admin/all', verifyToken, requireSuperAdmin, asyncHandler(async (req, res) => {
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

  sendData(res, clubs);

}, 'Error al obtener la lista global de clubes', 500));

router.get(
  '/:id',
  verifyToken,
  asyncHandler(async (req, res) => {
    const clubId = req.params.id as string;

    const club = await prisma.club.findUnique({
      where: { id: clubId },
      include: {
        _count: { select: { users: { where: { clubStatus: 'Aprobado' } } } },
        users: {
          where: { clubStatus: 'Aprobado' },
          select: { birthDate: true },
        },
      },
    });
    if (!club) return sendError(res, 404, 'Club no encontrado');

    sendData(res, club);
  }, 'Error al obtener el club'),
);

router.put('/:id', verifyToken, requireAdminClubAnyStatus, asyncHandler(async (req, res) => {
  const clubId = req.params.id as string;

  // Seguridad Multi-tenant
  if (!hasClubPermission(req.user, clubId)) {
    return sendError(res, 403, 'No tienes permiso para editar este club');
  }

  const validation = updateClubSchema.safeParse(req.body);
  if (!validation.success) {
    return sendError(res, 400, 'Datos inválidos', z.treeifyError(validation.error));
  }

  // Aprobar o desactivar un club es del SuperAdmin: si no, un club pendiente se aprobaría solo.
  if (validation.data.status !== undefined && req.user?.role !== 'SuperAdmin') {
    return sendError(res, 403, 'Solo el SuperAdmin puede cambiar el estado del club');
  }

  const updatedClub = await prisma.club.update({
    where: { id: clubId },
    data: validation.data,
  });

  sendMessage(res, 'Sede actualizada correctamente', 200, updatedClub);

}, 'Error al actualizar el club', 500));

// POST: Un jugador solicita unirse a un club
router.post('/:id/join', verifyToken, asyncHandler(async (req, res) => {
  // Forzamos a que sean strings puros para limpiar el tipo de Express
  const clubId = req.params.id as string;
  const userId = req.user?.id as string;

  if (!userId) return sendError(res, 401, 'No autenticado');

  await requestMembership(prisma, userId, clubId);

  sendMessage(res, 'Solicitud enviada al administrador del club');

}, 'Error al procesar la solicitud', 500));

// GET: El AdminClub ve a los miembros de SU club
router.get('/:id/members', verifyToken, requireAdminClubAnyStatus, asyncHandler(async (req, res) => {
  const clubId = req.params.id as string; // <-- Forzado a string aquí

  if (!hasClubPermission(req.user, clubId)) {
    sendError(res, 403, 'No tienes permiso para ver los miembros de un club que no administras');
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

  sendData(res, members);

}, 'Error al cargar los miembros', 500));

// PUT: El AdminClub aprueba o rechaza a un jugador
router.put('/:id/members/:userId/status', verifyToken, requireAdminClub, asyncHandler(async (req, res) => {
  const clubId = req.params.id as string;
  const userId = req.params.userId as string;

  // Verificación de seguridad multi-tenant: El AdminClub solo opera en SU club asignado
  if (!hasClubPermission(req.user, clubId)) {
    sendError(res, 403, 'No tienes permiso para administrar este club');
    return;
  }

  // Validamos usando tu esquema nativo (UserClubStatus.Aprobado | UserClubStatus.Rechazado)
  const validation = updateMemberStatusSchema.safeParse(req.body);
  if (!validation.success) {
    sendError(res, 400, 'Estado inválido. Debe ser Aprobado o Rechazado.');
    return;
  }

  const { status, skills, level, elo } = validation.data;

  // Verificar si el usuario realmente mandó la solicitud a este club específico
  const userToUpdate = await prisma.user.findUnique({ where: { id: userId } });
  if (!userToUpdate || userToUpdate.clubId !== clubId) {
    sendError(res, 404, 'El usuario no ha solicitado unirse a este club');
    return;
  }

  await resolveMembership(prisma, userId, { status, level, elo, skills });

  if (status === 'Aprobado' && skills) {
    const club = await prisma.club.findUnique({ where: { id: clubId } });
    enviarCorreoGenerico(
      userToUpdate.email,
      '🏓 ¡Has sido aceptado en un club!',
      templateAceptacionClub(userToUpdate.name, club),
    ).catch(console.error);
  }

  sendMessage(res, `Usuario ${status.toLowerCase() === 'aprobado' ? 'aprobado' : 'rechazado'} con éxito`);

}, 'Error al actualizar el estado del miembro', 500));

// GET: Alertas y notificaciones del club (AdminClub)
router.get('/:id/notifications', verifyToken, requireAdminClubAnyStatus, asyncHandler(async (req, res) => {
  const clubId = req.params.id as string;

  if (!hasClubPermission(req.user, clubId)) {
    return sendError(res, 403, 'No tienes permiso para ver estas notificaciones');
  }

  // 1. Contar solicitudes de unión al club pendientes
  const pendingMembers = await prisma.user.count({
    where: { clubId: clubId, clubStatus: 'Pendiente' },
  });

  // 2. Contar inscripciones pendientes en torneos activos del club
  const pendingTournaments = await prisma.tournamentParticipant.count({
    where: {
      tournament: { clubId: clubId, status: { notIn: ['Completado', 'Cancelado'] } },
      status: 'Pendiente',
    },
  });

  sendData(res, {
      pendingMembers,
      pendingTournaments,
      total: pendingMembers + pendingTournaments,
    });

}, 'Error al obtener las notificaciones', 500));

export default router;

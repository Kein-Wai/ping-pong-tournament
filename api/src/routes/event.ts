import { Router } from 'express';
import prisma from '../db';
import { z } from 'zod';
import { requireAdminClub } from '../middleware/auth.middleware';
import { canAccessClub, resolveResourceAccess } from '../utils/auth';
import { createEventSchema, updateEventSchema } from '../schemas/event';
import { resolveCurrentSeason } from '../utils/season';
import { enviarCorreoGenerico } from '../services/email';
import { templateCambioFechaEvento } from '../utils/emailtemplate';
import { asyncHandler, sendData, sendError, sendMessage } from '../http/response';

const router = Router();

// GET: Todos los eventos del club
router.get(
  '/club/:clubId',
  asyncHandler(
    async (req, res) => {
      const clubId = req.params.clubId as string;
      const userId = req.user?.id;

      if (!canAccessClub(req.user, clubId)) {
        return sendError(res, 403, 'No tienes permiso para ver los eventos de este club');
      }

      const currentSeason = await resolveCurrentSeason(prisma);

      const events = await prisma.clubEvent.findMany({
        where: { clubId, seasonId: currentSeason.id },
        orderBy: { date: 'asc' },
        include: {
          reminders: {
            where: { userId },
            select: { id: true, notifyAt: true, isSent: true },
          },
        },
      });

      sendData(res, events);
    },
    'Error obteniendo eventos',
    500,
  ),
);

// POST: Crear un evento
router.post(
  '/',
  requireAdminClub,
  asyncHandler(
    async (req, res) => {
      const validation = createEventSchema.safeParse(req.body);
      if (!validation.success)
        return sendError(res, 400, 'Datos inválidos', z.treeifyError(validation.error));

      const clubId = req.user?.clubId;
      if (!clubId) return sendError(res, 403, 'No tienes club');

      const currentSeason = await resolveCurrentSeason(prisma);

      const newEvent = await prisma.clubEvent.create({
        data: {
          ...validation.data,
          clubId,
          seasonId: currentSeason.id,
        },
      });

      sendData(res, newEvent, 201);
    },
    'Error creando el evento',
    500,
  ),
);

// PUT: Actualizar Evento (Aviso de cambio de fecha)
router.put(
  '/:id',
  requireAdminClub,
  asyncHandler(
    async (req, res) => {
      const eventId = req.params.id as string;
      const validation = updateEventSchema.safeParse(req.body);
      if (!validation.success)
        return sendError(res, 400, 'Datos inválidos');

      const access = resolveResourceAccess(
        await prisma.clubEvent.findUnique({
          where: { id: eventId },
          include: { reminders: { include: { user: true } } },
        }),
        req.user,
      );
      if (!access.ok) {
        return access.reason === 'notFound'
          ? sendError(res, 404, 'Evento no encontrado')
          : sendError(res, 403, 'No tienes permiso para editar este evento');
      }
      const { resource: oldEvent } = access;

      const updatedEvent = await prisma.clubEvent.update({
        where: { id: eventId },
        data: validation.data,
      });

      // 🚨 Si la fecha inicial cambió, avisamos a los que tenían recordatorios y los reprogramamos
      const oldDateStr = new Date(oldEvent.date).toDateString();
      const newDateStr = new Date(updatedEvent.date).toDateString();

      if (oldDateStr !== newDateStr && oldEvent.reminders.length > 0) {
        // 1. Extraemos usuarios únicos afectados para no mandar correos duplicados
        const affectedUsers = new Map();
        for (const reminder of oldEvent.reminders) {
          affectedUsers.set(reminder.userId, reminder.user);
        }

        for (const user of affectedUsers.values()) {
          if (user.email && user.name && !user.email.endsWith('.local')) {
            enviarCorreoGenerico(
              user.email,
              `Cambio de Fecha: ${updatedEvent.name}`,
              templateCambioFechaEvento(user.name, updatedEvent),
            ).catch(console.error);
          }
        }

        // 2. Borramos los recordatorios viejos para que no suenen en la fecha incorrecta
        await prisma.eventReminder.deleteMany({ where: { eventId } });

        // 3. Calculamos y creamos los nuevos recordatorios
        const eventDate = new Date(updatedEvent.date);
        const today = new Date();

        const oneWeekBefore = new Date(eventDate);
        oneWeekBefore.setDate(oneWeekBefore.getDate() - 7);

        const oneDayBefore = new Date(eventDate);
        oneDayBefore.setDate(oneDayBefore.getDate() - 1);

        const remindersToCreate = [];

        for (const userId of affectedUsers.keys()) {
          if (oneWeekBefore > today)
            remindersToCreate.push({ eventId, userId, notifyAt: oneWeekBefore });
          if (oneDayBefore > today)
            remindersToCreate.push({ eventId, userId, notifyAt: oneDayBefore });
        }

        if (remindersToCreate.length > 0) {
          await prisma.eventReminder.createMany({ data: remindersToCreate });
        }
      }

      sendData(res, updatedEvent);
    },
    'Error actualizando el evento',
    500,
  ),
);

// DELETE
router.delete(
  '/:id',
  requireAdminClub,
  asyncHandler(
    async (req, res) => {
      const eventId = req.params.id as string;
      const access = resolveResourceAccess(
        await prisma.clubEvent.findUnique({ where: { id: eventId } }),
        req.user,
      );
      if (!access.ok) {
        return access.reason === 'notFound'
          ? sendError(res, 404, 'Evento no encontrado')
          : sendError(res, 403, 'No tienes permiso para borrar este evento');
      }

      await prisma.clubEvent.delete({ where: { id: eventId } });
      sendMessage(res, 'Evento eliminado');
    },
    'Error eliminando el evento',
    500,
  ),
);

// SISTEMA DE RECORDATORIOS
router.post(
  '/:id/reminders',
  asyncHandler(
    async (req, res) => {
      const eventId = req.params.id as string;
      const userId = req.user?.id;
      if (!userId) return sendError(res, 401, 'No autorizado');

      const event = await prisma.clubEvent.findUnique({ where: { id: eventId } });
      if (!event) return sendError(res, 404, 'Evento no encontrado');
      if (!canAccessClub(req.user, event.clubId)) {
        return sendError(res, 403, 'No tienes permiso sobre este evento');
      }

      const eventDate = new Date(event.date);
      const today = new Date();

      const oneWeekBefore = new Date(eventDate);
      oneWeekBefore.setDate(oneWeekBefore.getDate() - 7);

      const oneDayBefore = new Date(eventDate);
      oneDayBefore.setDate(oneDayBefore.getDate() - 1);

      const remindersToCreate = [];

      if (oneWeekBefore > today)
        remindersToCreate.push({ eventId, userId, notifyAt: oneWeekBefore });
      if (oneDayBefore > today) remindersToCreate.push({ eventId, userId, notifyAt: oneDayBefore });

      if (remindersToCreate.length > 0) {
        await prisma.eventReminder.createMany({ data: remindersToCreate });
      }

      sendMessage(res, 'Recordatorios activados', 201);
    },
    'Error activando recordatorios',
    500,
  ),
);

router.delete(
  '/:id/reminders',
  asyncHandler(
    async (req, res) => {
      const eventId = req.params.id as string;
      const userId = req.user?.id;
      await prisma.eventReminder.deleteMany({ where: { eventId, userId } });
      sendMessage(res, 'Recordatorios cancelados');
    },
    'Error cancelando recordatorios',
    500,
  ),
);

export default router;

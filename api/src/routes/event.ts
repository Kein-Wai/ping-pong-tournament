import { Router } from 'express';
import prisma from '../db';
import { z } from 'zod';
import { requireAdminClub } from '../middleware/auth.middleware';
import { createEventSchema, updateEventSchema } from '../schemas/event';
import { getCurrentSeason } from '../utils/season';
import { enviarCorreoGenerico } from '../services/email';
import { templateCambioFechaEvento } from '../utils/emailtemplate';

const router = Router();

// GET: Todos los eventos del club
router.get('/club/:clubId', async (req, res) => {
  try {
    const clubId = req.params.clubId as string;
    const userId = req.user?.id;
    const currentSeason = await getCurrentSeason(prisma);

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

    res.status(200).json({ success: true, data: events });
  } catch (error) {
    res.status(500).json({ error: 'Error obteniendo eventos' });
  }
});

// POST: Crear un evento
router.post('/', requireAdminClub, async (req, res) => {
  try {
    const validation = createEventSchema.safeParse(req.body);
    if (!validation.success)
      return res
        .status(400)
        .json({ error: 'Datos inválidos', details: z.treeifyError(validation.error) });

    const clubId = req.user?.clubId;
    if (!clubId) return res.status(403).json({ error: 'No tienes club' });

    const currentSeason = await getCurrentSeason(prisma);

    const newEvent = await prisma.clubEvent.create({
      data: {
        ...validation.data,
        clubId,
        seasonId: currentSeason.id,
      },
    });

    res.status(201).json({ success: true, data: newEvent });
  } catch (error) {
    res.status(500).json({ error: 'Error creando el evento' });
  }
});

// PUT: Actualizar Evento (Aviso de cambio de fecha)
router.put('/:id', requireAdminClub, async (req, res) => {
  try {
    const eventId = req.params.id as string;
    const validation = updateEventSchema.safeParse(req.body);
    if (!validation.success) return res.status(400).json({ error: 'Datos inválidos' });

    const oldEvent = await prisma.clubEvent.findUnique({
      where: { id: eventId },
      include: { reminders: { include: { user: true } } },
    });

    if (!oldEvent) return res.status(404).json({ error: 'Evento no encontrado' });

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

    res.status(200).json({ success: true, data: updatedEvent });
  } catch (error) {
    res.status(500).json({ error: 'Error actualizando el evento' });
  }
});

// DELETE
router.delete('/:id', requireAdminClub, async (req, res) => {
  try {
    await prisma.clubEvent.delete({ where: { id: req.params.id as string } });
    res.status(200).json({ success: true, message: 'Evento eliminado' });
  } catch (error) {
    res.status(500).json({ error: 'Error eliminando el evento' });
  }
});

// SISTEMA DE RECORDATORIOS
router.post('/:id/reminders', async (req, res) => {
  try {
    const eventId = req.params.id as string;
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ error: 'No autorizado' });

    const event = await prisma.clubEvent.findUnique({ where: { id: eventId } });
    if (!event) return res.status(404).json({ error: 'Evento no encontrado' });

    const eventDate = new Date(event.date);
    const today = new Date();

    const oneWeekBefore = new Date(eventDate);
    oneWeekBefore.setDate(oneWeekBefore.getDate() - 7);

    const oneDayBefore = new Date(eventDate);
    oneDayBefore.setDate(oneDayBefore.getDate() - 1);

    const remindersToCreate = [];

    if (oneWeekBefore > today) remindersToCreate.push({ eventId, userId, notifyAt: oneWeekBefore });
    if (oneDayBefore > today) remindersToCreate.push({ eventId, userId, notifyAt: oneDayBefore });

    if (remindersToCreate.length > 0) {
      await prisma.eventReminder.createMany({ data: remindersToCreate });
    }

    res.status(201).json({ success: true, message: 'Recordatorios activados' });
  } catch (error) {
    res.status(500).json({ error: 'Error activando recordatorios' });
  }
});

router.delete('/:id/reminders', async (req, res) => {
  try {
    const eventId = req.params.id as string;
    const userId = req.user?.id;
    await prisma.eventReminder.deleteMany({ where: { eventId, userId } });
    res.status(200).json({ success: true, message: 'Recordatorios cancelados' });
  } catch (error) {
    res.status(500).json({ error: 'Error cancelando recordatorios' });
  }
});

export default router;

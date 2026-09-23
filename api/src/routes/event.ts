import { Router } from 'express';
import prisma from '../db';
import { z } from 'zod';
import { verifyToken, requireAdminClub } from '../middleware/auth.middleware';
import { createEventSchema, updateEventSchema } from '../schemas/event';
import { getCurrentSeason } from '../utils/season';

const router = Router();

// GET: Todos los eventos del club (incluye si el usuario actual ha activado el recordatorio)
router.get('/club/:clubId', async (req, res) => {
  try {
    const clubId = req.params.clubId as string;
    const userId = req.user?.id;
    const currentSeason = await getCurrentSeason(prisma);

    const events = await prisma.clubEvent.findMany({
      where: { clubId, seasonId: currentSeason.id },
      orderBy: { date: 'asc' },
      include: {
        // Traemos los recordatorios solo de este usuario para que el Frontend sepa si está suscrito
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

// POST: Crear un evento (Solo AdminClub)
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

// PUT y DELETE (Admin)
router.delete('/:id', requireAdminClub, async (req, res) => {
  try {
    await prisma.clubEvent.delete({ where: { id: req.params.id as string } });
    res.status(200).json({ success: true, message: 'Evento eliminado' });
  } catch (error) {
    res.status(500).json({ error: 'Error eliminando el evento' });
  }
});

// --- SISTEMA DE RECORDATORIOS (JUGADOR) ---

// POST: Suscribirse (Crea los avisos)
router.post('/:id/reminders', async (req, res) => {
  try {
    const eventId = req.params.id as string;
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ error: 'No autorizado' });

    const event = await prisma.clubEvent.findUnique({ where: { id: eventId } });
    if (!event) return res.status(404).json({ error: 'Evento no encontrado' });

    // Calculamos las dos fechas
    const eventDate = new Date(event.date);
    const today = new Date();

    const oneWeekBefore = new Date(eventDate);
    oneWeekBefore.setDate(oneWeekBefore.getDate() - 7);

    const oneDayBefore = new Date(eventDate);
    oneDayBefore.setDate(oneDayBefore.getDate() - 1);

    const remindersToCreate = [];

    // Solo programamos los recordatorios si esas fechas aún no han pasado
    if (oneWeekBefore > today) {
      remindersToCreate.push({ eventId, userId, notifyAt: oneWeekBefore });
    }
    if (oneDayBefore > today) {
      remindersToCreate.push({ eventId, userId, notifyAt: oneDayBefore });
    }

    if (remindersToCreate.length > 0) {
      await prisma.eventReminder.createMany({ data: remindersToCreate });
    }

    res.status(201).json({ success: true, message: 'Recordatorios activados' });
  } catch (error) {
    res.status(500).json({ error: 'Error activando recordatorios' });
  }
});

// DELETE: Cancelar suscripción
router.delete('/:id/reminders', async (req, res) => {
  try {
    const eventId = req.params.id as string;
    const userId = req.user?.id;

    await prisma.eventReminder.deleteMany({
      where: { eventId, userId },
    });

    res.status(200).json({ success: true, message: 'Recordatorios cancelados' });
  } catch (error) {
    res.status(500).json({ error: 'Error cancelando recordatorios' });
  }
});

export default router;

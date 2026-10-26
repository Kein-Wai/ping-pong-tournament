import { Router } from 'express';
import { asyncHandler, sendError, sendMessage } from '../http/response';
import prisma from '../db';
import { enviarCorreoGenerico } from '../services/email';
import { templateRecordatorioTorneo, templateRecordatorioEvento } from '../utils/emailtemplate';

import { getRequiredEnv } from '../config';

const router = Router();

// =======================================================
// 1. CRONJOB: RECORDATORIOS DIARIOS (Torneos y Eventos)
// =======================================================
router.post(
  '/daily-reminders',
  asyncHandler(async (req, res) => {
  // 1. Seguridad: Verificar que quien llama tiene la llave secreta
  const authHeader = req.headers['x-cron-secret'];
  if (authHeader !== getRequiredEnv('CRON_SECRET')) {
    return sendError(res, 401, 'Acceso denegado. Secreto inválido.');
  }

    // 2. Calcular los límites exactos de "Mañana"
    const hoy = new Date();

    const mananaInicio = new Date(hoy);
    mananaInicio.setDate(hoy.getDate() + 1);
    mananaInicio.setHours(0, 0, 0, 0);

    const mananaFin = new Date(mananaInicio);
    mananaFin.setHours(23, 59, 59, 999);

    // 3. Query a Prisma: Buscar torneos de mañana y sus jugadores confirmados
    const torneosManana = await prisma.tournament.findMany({
      where: {
        dateStart: {
          gte: mananaInicio,
          lte: mananaFin,
        },
        status: 'Programado', // Solo recordamos torneos que sigan en pie
      },
      include: {
        participants: {
          where: { status: 'Confirmado' },
          include: { player: true },
        },
      },
    });

    // 4. Bucle Fire-and-Forget: Lanzamos los emails a segundo plano
    torneosManana.forEach((torneo) => {
      torneo.participants.forEach((participante) => {
        const user = participante.player;

        if (user.email && user.name && !user.email.endsWith('.local')) {
          enviarCorreoGenerico(
            user.email,
            `Recordatorio: Tu torneo ${torneo.name} es mañana`,
            templateRecordatorioTorneo(user.name, torneo),
          ).catch((err) => {
            console.error(`Fallo silencioso al enviar recordatorio a ${user.email}:`, err);
          });
        }
      });
    });

    const endOfToday = new Date(hoy);
    endOfToday.setHours(23, 59, 59, 999);

    const pendingReminders = await prisma.eventReminder.findMany({
      where: {
        isSent: false,
        notifyAt: { lte: endOfToday }, // Menor o igual a hoy
      },
      include: {
        user: true,
        event: true,
      },
    });

    // Enviamos los emails (Fire-and-forget)
    pendingReminders.forEach((reminder) => {
      if (reminder.user.email && reminder.user.name && !reminder.user.email.endsWith('.local')) {
        enviarCorreoGenerico(
          reminder.user.email,
          `Recordatorio: ${reminder.event.name}`,
          templateRecordatorioEvento(reminder.user.name, reminder.event),
        ).catch((err) => console.error(`Error correo evento a ${reminder.user.email}:`, err));
      }
    });

    // Marcamos todos estos recordatorios como "Enviados" para que no vuelvan a saltar mañana
    const reminderIds = pendingReminders.map((r) => r.id);
    if (reminderIds.length > 0) {
      await prisma.eventReminder.updateMany({
        where: { id: { in: reminderIds } },
        data: { isSent: true },
      });
    }

    return sendMessage(res, `Procesados ${torneosManana.length} torneos y ${pendingReminders.length} eventos de calendario.`);
  }, 'Error interno del servidor'),
);

// =======================================================
// 2. CRONJOB: MONITORIZACIÓN DEL SISTEMA (Health-Check)
// =======================================================
router.get(
  '/health-check',
  asyncHandler(async (req, res) => {
  // 1. Seguridad estricta (igual que los recordatorios)
  const authHeader = req.headers['x-cron-secret'];
  if (authHeader !== getRequiredEnv('CRON_SECRET')) {
    return sendError(res, 401, 'Acceso denegado. Secreto inválido.');
  }

    // 2. Test de Base de Datos: Intentamos hacer una consulta sencilla
    const userCount = await prisma.user.count();

    // 3. Test de Email: Formatear y enviar correo al Admin
    // Toma el correo desde las variables de entorno, o usa tu correo por defecto si no está definida
    const adminEmail = process.env.ADMIN_EMAIL || 'keinwaicheung@gmail.com';

    const htmlTest = `
      <div style="font-family: Arial, sans-serif; padding: 20px; background-color: #f8fafc; border-radius: 8px;">
        <h2 style="color: #059669; margin-top: 0;">¡Sistemas en línea y operativos! 🚀</h2>
        <p style="color: #334155; font-size: 16px;">Este es un mensaje automático de tu Cronjob de monitorización.</p>
        
        <ul style="background-color: #ffffff; padding: 20px 40px; border-radius: 8px; border: 1px solid #e2e8f0; color: #475569;">
          <li style="margin-bottom: 10px;"><strong>Conexión a Base de Datos:</strong> OK ✅ <i>(Total usuarios indexados: ${userCount})</i></li>
          <li style="margin-bottom: 10px;"><strong>Servicio de Correo (Gmail API):</strong> OK 📧</li>
          <li><strong>Hora del servidor (UTC):</strong> ${new Date().toISOString()}</li>
        </ul>
        
        <p style="color: #64748b; font-size: 14px; margin-top: 20px;">
          Si recibes este correo a la hora programada, significa que la API no se ha suspendido y la capa gratuita está despierta.
        </p>
      </div>
    `;

    await enviarCorreoGenerico(adminEmail, 'Monitorización: Todo OK - TT Tournament App', htmlTest);

    return sendMessage(res, 'Base de datos y servicio de correos funcionando correctamente.', 200, {
      timestamp: new Date(),
      users: userCount,
    });
  }, 'Fallo general del sistema'),
);

export default router;

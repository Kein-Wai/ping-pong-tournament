import { Router } from 'express';
import prisma from '../db';
import { enviarCorreoGenerico } from '../services/email';
import { templateRecordatorioTorneo } from '../utils/emailtemplate';

const router = Router();

router.post('/daily-reminders', async (req, res) => {
  // 1. Seguridad: Verificar que quien llama tiene la llave secreta
  const authHeader = req.headers['x-cron-secret'];
  if (authHeader !== process.env.CRON_SECRET) {
    return res.status(401).json({ error: 'Acceso denegado. Secreto inválido.' });
  }

  try {
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

        if (user.email && user.name) {
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

    // 5. Responder inmediatamente al servidor Cron para cerrar la conexión con éxito
    return res.status(200).json({
      success: true,
      message: `Procesados ${torneosManana.length} torneos para mañana.`,
    });
  } catch (error) {
    console.error('Error crítico en el webhook de recordatorios:', error);
    return res.status(500).json({ error: 'Error interno del servidor' });
  }
});

export default router;

import { Router } from 'express';
import prisma from '../db';
import { updateSkillsSchema } from '../schemas/user'; // O desde '../schemas/club' donde lo hayas definido
import { z } from 'zod';
import { requireAdminClub } from '../middleware/auth.middleware';
import { hasClubPermission } from '../utils/auth';
import { resolveCurrentSeason } from '../utils/season';
import { asyncHandler } from '../http/response';

const router = Router();

// PUT /api/skills/:playerId
router.put('/:playerId', requireAdminClub, asyncHandler(async (req, res) => {
  const playerId = req.params.playerId as string;
  const adminClubId = req.user?.clubId;
  const role = req.user?.role;

  // 1. Validar que los stats están entre 0 y 100
  const validation = updateSkillsSchema.safeParse(req.body);
  if (!validation.success) {
    return res
      .status(400)
      .json({ success: false, error: 'Stats inválidos', details: z.treeifyError(validation.error) });
  }

  // 2. Buscar al jugador y comprobar seguridad Multi-tenant
  const player = await prisma.user.findUnique({ where: { id: playerId } });

  if (!player) {
    return res.status(404).json({ success: false, error: 'Jugador no encontrado' });
  }

  // El AdminClub solo puede editar a los jugadores que estén en su propio club
  if (!hasClubPermission(req.user, player.clubId)) {
    return res.status(403).json({ success: false, error: 'No tienes permiso para editar las habilidades de un jugador de otro club',
    });
  }

  const currentSeason = await resolveCurrentSeason(prisma);
  // 3. Upsert: Si el jugador no tenía ficha de skills, se crea; si ya la tiene, se actualiza
  const updatedSkills = await prisma.playerSkills.upsert({
    where: {
      userId_seasonId: {
        // 👈 USAR CLAVE COMPUESTA
        userId: playerId,
        seasonId: currentSeason.id,
      },
    },
    update: validation.data,
    create: {
      userId: playerId,
      seasonId: currentSeason.id, // 👈 INYECTAR TEMPORADA
      ...validation.data,
    },
  });

  res.status(200).json({ success: true, data: updatedSkills });

}, 'Error al actualizar las habilidades del jugador', 500));
router.put('/:playerId/consolidate', requireAdminClub, asyncHandler(async (req, res) => {
  const playerId = req.params.playerId as string;
  const adminClubId = req.user?.clubId;

  const validation = updateSkillsSchema.safeParse(req.body);
  if (!validation.success) {
    return res
      .status(400)
      .json({ success: false, error: 'Stats inválidos', details: z.treeifyError(validation.error) });
  }

  const player = await prisma.user.findUnique({ where: { id: playerId } });
  if (!player || !hasClubPermission(req.user, player.clubId)) {
    return res.status(403).json({ success: false, error: 'No tienes permiso.' });
  }

  const currentSeason = await resolveCurrentSeason(prisma);
  // Transacción: Guardamos los nuevos valores y vaciamos la "bandeja de pendientes"
  await prisma.$transaction(async (tx) => {
    await tx.playerSkills.upsert({
      where: {
        userId_seasonId: {
          // 👈 USAR CLAVE COMPUESTA
          userId: playerId,
          seasonId: currentSeason.id,
        },
      },
      update: validation.data,
      create: {
        userId: playerId,
        seasonId: currentSeason.id, // 👈 INYECTAR TEMPORADA
        ...validation.data,
      },
    });

    await tx.playerSkillUpdate.updateMany({
      where: { playerId: playerId, status: 'EXPECTED' },
      data: { status: 'COMPLETED' },
    });
  });

  res.status(200).json({ success: true, message: 'Progresión consolidada con éxito' });

}, 'Error al consolidar el progreso', 500));
export default router;

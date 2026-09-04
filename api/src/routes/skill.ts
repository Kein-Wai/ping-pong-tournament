import { Router } from 'express';
import prisma from '../db';
import { updateSkillsSchema } from '../schemas/user'; // O desde '../schemas/club' donde lo hayas definido
import { z } from 'zod';
import { requireAdminClub } from '../middleware/auth.middleware';

const router = Router();

// PUT /api/skills/:playerId
router.put('/:playerId', requireAdminClub, async (req, res) => {
  try {
    const playerId = req.params.playerId as string;
    const adminClubId = req.user?.clubId;
    const role = req.user?.role;

    // 1. Validar que los stats están entre 0 y 100
    const validation = updateSkillsSchema.safeParse(req.body);
    if (!validation.success) {
      return res
        .status(400)
        .json({ error: 'Stats inválidos', details: z.treeifyError(validation.error) });
    }

    // 2. Buscar al jugador y comprobar seguridad Multi-tenant
    const player = await prisma.user.findUnique({ where: { id: playerId } });

    if (!player) {
      return res.status(404).json({ error: 'Jugador no encontrado' });
    }

    // El AdminClub solo puede editar a los jugadores que estén en su propio club
    if (role === 'AdminClub' && player.clubId !== adminClubId) {
      return res
        .status(403)
        .json({
          error: 'No tienes permiso para editar las habilidades de un jugador de otro club',
        });
    }

    // 3. Upsert: Si el jugador no tenía ficha de skills, se crea; si ya la tiene, se actualiza
    const updatedSkills = await prisma.playerSkills.upsert({
      where: { userId: playerId },
      update: validation.data,
      create: {
        userId: playerId,
        ...validation.data,
      },
    });

    res.status(200).json({ success: true, data: updatedSkills });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error al actualizar las habilidades del jugador' });
  }
});

export default router;

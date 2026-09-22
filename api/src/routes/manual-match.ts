import { Router } from 'express';
import prisma from '../db';
import { z } from 'zod';
import {
  createManualMatchSchema,
  addPointSchema,
  completeMatchSchema,
  updateManualMatchSchema,
} from '../schemas/manualMatch';
import { MatchStatus } from '@prisma/client';
import { getCurrentSeason } from '../utils/season';

const router = Router();

// 1. Obtener todos los partidos manuales del usuario logueado
router.get('/', async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ error: 'No autorizado' });

    const matches = await prisma.manualMatch.findMany({
      where: { userId },
      orderBy: { date: 'desc' },
      include: {
        _count: { select: { points: true } }, // Cuenta cuántos puntos se registraron
      },
    });

    res.status(200).json({ success: true, data: matches });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error al obtener los partidos manuales' });
  }
});

// 2. Crear un nuevo partido manual (Pre-partido)
router.post('/', async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ error: 'No autorizado' });

    const validation = createManualMatchSchema.safeParse(req.body);
    if (!validation.success) {
      return res
        .status(400)
        .json({ error: 'Datos inválidos', details: z.treeifyError(validation.error) });
    }
    const currentSeason = await getCurrentSeason(prisma);
    const newMatch = await prisma.manualMatch.create({
      data: {
        ...validation.data,
        userId,
        seasonId: currentSeason.id,
        date: validation.data.date ? new Date(validation.data.date) : new Date(),
        status: MatchStatus.Iniciado,
      },
    });

    res.status(201).json({ success: true, data: newMatch });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error al crear el partido manual' });
  }
});

// 3. Obtener el detalle de un partido y TODOS sus puntos (Para el reporte final)
router.get('/:id', async (req, res) => {
  try {
    const match = await prisma.manualMatch.findUnique({
      where: { id: req.params.id },
      include: {
        points: { orderBy: { pointOrder: 'asc' } }, // Puntos ordenados cronológicamente
      },
    });

    if (!match || match.userId !== req.user?.id) {
      return res.status(404).json({ error: 'Partido no encontrado o sin acceso' });
    }

    res.status(200).json({ success: true, data: match });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error al obtener el partido' });
  }
});

router.put('/:id', async (req, res) => {
  try {
    // 1. Zod filtra y valida. Si intentan colar "status: Completado", Zod lo elimina automáticamente.
    const validation = updateManualMatchSchema.safeParse(req.body);

    if (!validation.success) {
      return res
        .status(400)
        .json({ error: 'Datos inválidos', details: z.treeifyError(validation.error) });
    }

    // 2. Solo guardamos lo que Zod nos ha devuelto limpio y seguro (validation.data)
    const updatedMatch = await prisma.manualMatch.update({
      where: { id: req.params.id },
      data: validation.data,
    });

    res.status(200).json({ success: true, data: updatedMatch });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error al actualizar el partido' });
  }
});

// 4. Añadir un punto al partido (Se llama cada vez que el árbitro toca un botón)
router.post('/:id/points', async (req, res) => {
  try {
    const validation = addPointSchema.safeParse(req.body);
    if (!validation.success) {
      return res.status(400).json({ error: 'Datos de punto inválidos' });
    }

    const point = await prisma.pointAnalysis.create({
      data: {
        ...validation.data,
        manualMatchId: req.params.id,
      },
    });

    res.status(201).json({ success: true, data: point });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error al registrar el punto' });
  }
});

// 5. Botón de Pánico: Deshacer el último punto
router.delete('/:id/points/:pointId', async (req, res) => {
  try {
    await prisma.pointAnalysis.delete({
      where: { id: req.params.pointId },
    });
    res.status(200).json({ success: true, message: 'Punto deshecho' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error al deshacer el punto' });
  }
});

// 6. Finalizar el partido (Se llama al terminar el último set)
// 6. Finalizar el partido (Se llama al terminar el último set)
router.put('/:id/complete', async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ error: 'No autorizado' });

    const validation = completeMatchSchema.safeParse(req.body);
    if (!validation.success) return res.status(400).json({ error: 'Datos inválidos' });

    // Envolvemos en transacción para asegurar la base de datos
    const updatedMatch = await prisma.$transaction(async (tx) => {
      const currentSeason = await getCurrentSeason(tx as any);
      const match = await tx.manualMatch.update({
        where: { id: req.params.id },
        data: {
          status: MatchStatus.Completado,
          mySets: validation.data.mySets,
          opponentSets: validation.data.opponentSets,
        },
      });

      // Obtener stats y aplicar curva decreciente
      const userSkills = await tx.playerSkills.findFirst({
        where: { userId, seasonId: currentSeason.id },
      });
      const getGrowth = (stat?: number) => {
        const val = stat || 0;
        if (val < 20) return 0.25;
        if (val < 40) return 0.2;
        if (val < 60) return 0.15;
        if (val < 80) return 0.07;
        return 0.01;
      };

      // Inyectar subida al tracker personal
      await tx.playerSkillUpdate.create({
        data: {
          playerId: userId,
          sourceType: 'Partido',
          status: 'EXPECTED',
          fortalezaMental: getGrowth(userSkills?.fortalezaMental),
          experiencia: getGrowth(userSkills?.experiencia),
        },
      });

      return match;
    });

    res.status(200).json({ success: true, data: updatedMatch });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error al finalizar el partido' });
  }
});

export default router;

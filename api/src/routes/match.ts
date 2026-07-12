import { Router } from 'express';
import prisma from '../db';

const router = Router();

router.get('/', async (req, res) => {
  try {
    const matches = await prisma.match.findMany({
      orderBy: { dateStart: 'desc' }, // Ordenados por fecha de inicio
      include: {
        // Incluimos los datos básicos de los jugadores
        playerOne: {
          select: { id: true, name: true, surname: true, email: true },
        },
        playerTwo: {
          select: { id: true, name: true, surname: true, email: true },
        },
        // Incluimos las relaciones de competiciones (si existen)
        tournament: true,
        league: true,
        group: true,
        knockout: true,
      },
    });

    res.status(200).json(matches);
  } catch (error) {
    console.error('Error al obtener los partidos:', error);
    res.status(500).json({ error: 'Error interno al obtener los partidos' });
  }
});

export default router;

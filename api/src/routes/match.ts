import { Router } from 'express';
import prisma from '../db';
import { createMatchSchema, baseMatchObject, validateMatchBusinessRules } from '../schemas/match';
import { z } from 'zod';
import { MatchStatus } from '@prisma/client';
import { handleMatchStatsUpdate } from '../utils/stats';
import { processMatchResult } from '../utils/match-processor';
import { updateGroupStandings } from '../utils/standings';

const router = Router();

router.get('/', async (req, res) => {
  try {
    if (req.user) {
      const clubId = req.user.clubId;
      const userId = req.user.id;
      const role = req.user.role;

      let whereCondition = {};
      if (role === 'AdminClub' || (role === 'Player' && clubId)) {
        whereCondition = {
          OR: [
            { tournament: { clubId: clubId } },
            { playerOne: { clubId: clubId } },
            { playerTwo: { clubId: clubId } },
          ],
        };
      } else if (role === 'Player' && !clubId) {
        whereCondition = {
          OR: [{ playerOneId: userId }, { playerTwoId: userId }],
        };
      }

      const matches = await prisma.match.findMany({
        where: whereCondition,
        orderBy: { dateStart: 'desc' },
        include: {
          playerOne: {
            select: {
              id: true,
              name: true,
              surname: true,
              email: true,
              club: {
                select: { id: true, name: true, city: true },
              },
            },
          },
          playerTwo: {
            select: {
              id: true,
              name: true,
              surname: true,
              email: true,
              club: {
                select: { id: true, name: true, city: true },
              },
            },
          },

          tournament: true,
          league: true,
          group: true,
          knockout: true,
        },
      });

      res.status(200).json(matches);
    } else {
      res
        .status(401)
        .json({ error: 'Acceso denegado. Usuario no proporcionado o formato incorrecto.' });
    }
  } catch (error) {
    console.error('Error al obtener los partidos:', error);
    res.status(500).json({ error: 'Error interno al obtener los partidos' });
  }
});

router.post('/', async (req, res) => {
  try {
    const validation = createMatchSchema.safeParse(req.body);

    if (!validation.success) {
      res.status(400).json({
        error: 'Datos inválidos',
        details: z.treeifyError(validation.error),
      });
      return;
    }

    const {
      playerOneId,
      playerTwoId,
      dateStart,
      tournamentId,
      groupId,
      knockoutId,
      leagueId,
      status,
      setOnePlayerOne,
      setOnePlayerTwo,
      setTwoPlayerOne,
      setTwoPlayerTwo,
      setThreePlayerOne,
      setThreePlayerTwo,
      setFourPlayerOne,
      setFourPlayerTwo,
      setFivePlayerOne,
      setFivePlayerTwo,
      setSixPlayerOne,
      setSixPlayerTwo,
      setSevenPlayerOne,
      setSevenPlayerTwo,
    } = validation.data;

    if (playerOneId === playerTwoId) {
      res.status(400).json({ error: 'Un jugador no puede enfrentarse a sí mismo' });
      return;
    }

    const newMatch = await prisma.match.create({
      data: {
        playerOneId,
        playerTwoId,
        dateStart: dateStart ? new Date(dateStart) : new Date(),
        status: status,
        tournamentId,
        groupId,
        knockoutId,
        leagueId,

        setOnePlayerOne,
        setOnePlayerTwo,
        setTwoPlayerOne,
        setTwoPlayerTwo,
        setThreePlayerOne,
        setThreePlayerTwo,
        setFourPlayerOne,
        setFourPlayerTwo,
        setFivePlayerOne,
        setFivePlayerTwo,
        setSixPlayerOne,
        setSixPlayerTwo,
        setSevenPlayerOne,
        setSevenPlayerTwo,
      },
    });

    await handleMatchStatsUpdate(prisma, null, newMatch);

    await processMatchResult(prisma, newMatch);

    res.status(201).json({
      message: 'Partido programado con éxito',
      match: newMatch,
    });
  } catch (error) {
    console.error('Error al crear el partido:', error);
    res.status(500).json({ error: 'Error interno al crear el partido' });
  }
});

router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const validation = baseMatchObject.partial().safeParse(req.body);

    if (!validation.success) {
      res.status(400).json({
        error: 'Datos inválidos',
        details: z.treeifyError(validation.error),
      });
      return;
    }

    const existingMatch = await prisma.match.findUnique({
      where: { id },
    });

    if (!existingMatch) {
      res.status(404).json({ error: 'Partido no encontrado' });
      return;
    }

    const mergedData = {
      ...existingMatch,
      ...validation.data,
      dateStart:
        existingMatch.dateStart instanceof Date
          ? existingMatch.dateStart.toISOString()
          : existingMatch.dateStart,
    };

    const businessValidation = baseMatchObject
      .superRefine(validateMatchBusinessRules)
      .safeParse(mergedData);

    if (!businessValidation.success) {
      res.status(400).json({
        error: 'El marcador no cumple las reglas del partido',
        details: z.treeifyError(businessValidation.error),
      });
      return;
    }

    const data = validation.data;
    delete (data as any).setsToWin;

    const matchStatus = data.status ? data.status : existingMatch.status;

    const updatedMatch = await prisma.match.update({
      where: { id },
      data: {
        ...data,
        status: matchStatus,
      },
    });

    await handleMatchStatsUpdate(prisma, existingMatch, updatedMatch);

    if (updatedMatch.groupId) {
      await updateGroupStandings(prisma, updatedMatch.groupId);
    }

    await processMatchResult(prisma, updatedMatch);

    res.status(200).json({
      message: 'Partido actualizado con éxito',
      match: updatedMatch,
    });
  } catch (error) {
    console.error('Error al actualizar el partido:', error);
    res.status(500).json({ error: 'Error interno al actualizar el partido' });
  }
});

export default router;

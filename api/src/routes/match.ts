import { Router } from 'express';
import prisma from '../db';
import { createMatchSchema } from '../schemas/match';
import { z } from 'zod';
import { MatchStatus } from '@prisma/client';
import { updateMatchStats } from '../utils/stats';
import { processMatchResult } from '../utils/match-processor';
const router = Router();

router.get('/', async (req, res) => {
  try {
    const matches = await prisma.match.findMany({
      orderBy: { dateStart: 'desc' },
      include: {
        playerOne: {
          select: { id: true, name: true, surname: true, email: true },
        },
        playerTwo: {
          select: { id: true, name: true, surname: true, email: true },
        },

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

    await updateMatchStats(prisma, newMatch);

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

    const validation = createMatchSchema.partial().safeParse(req.body);

    if (!validation.success) {
      res.status(400).json({
        error: 'Datos inválidos',
        details: z.treeifyError(validation.error),
      });
      return;
    }

    const data = validation.data;

    const existingMatch = await prisma.match.findUnique({
      where: { id },
    });

    if (!existingMatch) {
      res.status(404).json({ error: 'Partido no encontrado' });
      return;
    }

    const matchStatus = data.status ? data.status : existingMatch.status;

    const updatedMatch = await prisma.match.update({
      where: { id },
      data: {
        ...data,
        status: matchStatus,
      },
    });

    if (
      updatedMatch.status === MatchStatus.Completado &&
      existingMatch.status !== MatchStatus.Completado
    ) {
      await updateMatchStats(prisma, updatedMatch);
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

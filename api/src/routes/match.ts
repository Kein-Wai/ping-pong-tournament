import { Router } from 'express';
import prisma from '../db';
import { createMatchSchema } from '../schemas/match.schema';
import { z } from 'zod';
import { STATUS } from './../constants';

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
        // Si nos envían fecha la usamos, si no, ponemos la fecha actual por defecto
        dateStart: dateStart ? new Date(dateStart) : new Date(),
        status: STATUS.SCHEDULE, // Por defecto el partido está programado
        tournamentId,
        groupId,
        knockoutId,
        leagueId,
      },
    });

    /*
    // =====================================================================
    // ⬇️ HUECO RESERVADO PARA LA LÓGICA EXTRA QUE ME VAS A PEDIR ⬇️
    // =====================================================================
    
    // ... aquí meteremos tu magia ...

       TODA ESTA LOGICA DEBERIA ESTAR SEPARADA PORQUE SEGURAMENTE LA PONGAMOS EN UPDATE TAMBIEN
    // =====================================================================
    // SI EL PARTIDO ESTA FINALIZADO (SI EL PARTIDO SE CREA Y SE METE EL RESULTADO DIRECTAMENTE)
    // 1. Actualizar los stats de cada jugador 
    // 2. Si el partido es de un tournament:
          1. Ver si el tournament existe
          2. Ver si el partido es de group
            1. Ver si el group existe
            2. Actualizar el tournament_group_clas usando el tournament_group_id y el player_id
          3. Ver si el partido es de knockout
            1. Ver si el knockout existe
       3. Si el partido es de league
          1. Ver si el league existe.
          2. Actualizar el league_clas usando el league_id y el player_id    
    */

    res.status(201).json({
      message: 'Partido programado con éxito',
      match: newMatch,
    });
  } catch (error) {
    console.error('Error al crear el partido:', error);
    res.status(500).json({ error: 'Error interno al crear el partido' });
  }
});

export default router;

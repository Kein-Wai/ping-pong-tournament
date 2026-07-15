import { Router } from 'express';
import prisma from '../db';
import { createMatchSchema } from '../schemas/match';
import { z } from 'zod';
import { MatchStatus } from '@prisma/client';
import { updateMatchStats } from '../utils/stats';
import { processMatchResult } from '../utils/match-processor'; // <-- IMPORTAMOS LA UTILIDAD
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
        // Inyectamos los sets (si no vienen, Prisma usará el @default(0) de tu esquema)
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

// OJO: Asegúrate de tener un schema para el PUT (ej. updateMatchSchema) en tu archivo Zod.
// Suele ser igual que el createMatchSchema, pero sin requerir los IDs de los jugadores.

router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    // 1. Validamos los datos (asumiendo que tienes updateMatchSchema importado)
    // const validation = updateMatchSchema.safeParse(req.body);
    // Si usas el mismo esquema pero parcial:
    const validation = createMatchSchema.partial().safeParse(req.body);

    if (!validation.success) {
      res.status(400).json({
        error: 'Datos inválidos',
        details: z.treeifyError(validation.error),
      });
      return;
    }

    const data = validation.data;

    // 2. Comprobamos que el partido existe
    const existingMatch = await prisma.match.findUnique({
      where: { id },
    });

    if (!existingMatch) {
      res.status(404).json({ error: 'Partido no encontrado' });
      return;
    }

    const matchStatus = data.status ? data.status : existingMatch.status;

    // 4. Actualizamos el partido en la base de datos
    const updatedMatch = await prisma.match.update({
      where: { id },
      data: {
        ...data,
        status: matchStatus,
      },
    });

    // 5. Estadísticas individuales (Cuidado aquí si tu updateMatchStats suma incrementalmente,
    // tendrías que asegurarte de que no sume doble si el partido ya estaba completado antes).
    if (
      updatedMatch.status === MatchStatus.Completado &&
      existingMatch.status !== MatchStatus.Completado
    ) {
      await updateMatchStats(prisma, updatedMatch);
    }

    // 6. ¡LA MAGIA CENTRALIZADA! Recalcula grupos, mira si terminó la fase, etc.
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

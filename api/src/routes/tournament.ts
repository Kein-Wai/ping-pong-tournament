import { Router } from 'express';
import { z } from 'zod';
import prisma from '../db';
import { createTournamentSchema, registerParticipantSchema } from '../schemas/tournament';
import { generateTournamentGroups } from '../utils/group-generator';
import { MatchStatus, PlayerTournamentStatus } from '@prisma/client';

const router = Router();

// 2. LA RUTA POST
router.post('/', async (req, res) => {
  try {
    // Validamos que todo lo que entra es correcto
    const validation = createTournamentSchema.safeParse(req.body);

    if (!validation.success) {
      res.status(400).json({
        error: 'Datos inválidos',
        details: z.treeifyError(validation.error),
      });
      return;
    }

    const data = validation.data;

    // Creamos el cascarón del torneo
    const newTournament = await prisma.tournament.create({
      data: {
        name: data.name,
        dateStart: new Date(data.dateStart),
        numPlayers: data.numPlayers,
        numGroup: data.numGroup,
        numGroupPlayers: data.numGroupPlayers,
        typeTournament: data.typeTournament,
        levelTournament: data.levelTournament,
        rounds: data.rounds,
        typeKnockout: data.typeKnockout,
        playersKnockout: data.playersKnockout,
        sortKnockout: data.sortKnockout,
        allPos: data.allPos,

        // --- VALORES CONTROLADOS ESTRICTAMENTE POR EL BACKEND ---
        status: MatchStatus.Programado,
        groupsCreated: false,
        knockoutCreated: false,
      },
    });

    res.status(201).json({
      message: 'Torneo creado con éxito',
      tournament: newTournament,
    });
  } catch (error) {
    console.error('Error al crear el torneo:', error);
    res.status(500).json({ error: 'Error interno al crear el torneo' });
  }
});

router.post('/:id/register', async (req, res) => {
  try {
    const tournamentId = req.params.id;

    // 1. Validar el body
    const validation = registerParticipantSchema.safeParse(req.body);
    if (!validation.success) {
      res.status(400).json({ error: 'Datos inválidos', details: validation.error.format() });
      return;
    }
    const { playerId } = validation.data;

    // 2. Comprobar que el torneo existe y su estado permite inscripciones
    const tournament = await prisma.tournament.findUnique({
      where: { id: tournamentId },
      include: {
        _count: {
          select: { participants: true }, // Prisma cuenta los participantes actuales por nosotros
        },
      },
    });

    if (!tournament) {
      res.status(404).json({ error: 'Torneo no encontrado' });
      return;
    }

    if (tournament.groupsCreated) {
      res
        .status(400)
        .json({ error: 'Las inscripciones están cerradas. Los grupos ya se han generado.' });
      return;
    }

    // 3. Comprobar capacidad máxima
    if (tournament._count.participants >= tournament.numPlayers) {
      res.status(400).json({ error: 'El torneo ya ha alcanzado el límite máximo de jugadores' });
      return;
    }

    // 4. Comprobar si el jugador ya está inscrito (para dar un mensaje bonito en lugar de un error de Prisma)
    const existingParticipant = await prisma.tournamentParticipant.findUnique({
      where: {
        tournamentId_playerId: {
          tournamentId,
          playerId,
        },
      },
    });

    if (existingParticipant) {
      res.status(400).json({ error: 'El jugador ya está inscrito en este torneo' });
      return;
    }

    // 5. Crear la inscripción
    const newParticipant = await prisma.tournamentParticipant.create({
      data: {
        tournamentId,
        playerId,
        status: PlayerTournamentStatus.Pendiente, // Por defecto lo dejamos confirmado para que entre al sorteo
      },
    });

    res.status(201).json({
      message: 'Jugador inscrito con éxito',
      participant: newParticipant,
    });
  } catch (error) {
    console.error('Error al inscribir jugador:', error);
    res.status(500).json({ error: 'Error interno al inscribir jugador' });
  }
});

// --- RUTA POST: GENERAR GRUPOS (FASE 2 - SERPIENTE) ---
router.post('/:id/generate-groups', async (req, res) => {
  try {
    const tournamentId = req.params.id;

    // Llamamos a nuestro motor de torneos (la utilidad que creamos)
    const result = await generateTournamentGroups(prisma, tournamentId);

    res.status(200).json(result);
  } catch (error: any) {
    console.error('Error al generar grupos:', error);
    // Devolvemos 400 para mostrar el mensaje de error de nuestra utilidad (ej. "Los grupos ya han sido generados")
    res.status(400).json({ error: error.message || 'Error al generar los grupos' });
  }
});

export default router;

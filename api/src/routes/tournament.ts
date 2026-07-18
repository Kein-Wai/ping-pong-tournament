import { Router } from 'express';
import { z } from 'zod';
import prisma from '../db';
import { createTournamentSchema, registerParticipantSchema } from '../schemas/tournament';
import { generateTournamentGroups } from '../utils/group-generator';
import { MatchStatus, PlayerTournamentStatus, KnockoutType } from '@prisma/client';
import { fetchTournamentBracket } from '../utils/knockout';
import { fetchGroupMatches, fetchGroupClassifications } from '../utils/group';

const router = Router();

router.get('/', async (req, res) => {
  try {
    const role = req.user?.role;
    const clubId = req.user?.clubId;

    let whereClause: any = {};

    if (role === 'SuperAdmin') {
      // El SuperAdmin ve absolutamente todos los torneos
      whereClause = {};
    } else if (role === 'AdminClub') {
      // El Admin del club solo ve los torneos de SU club
      whereClause = { clubId: clubId };
    } else {
      // Los jugadores ven los torneos de su club + cualquier torneo "Abierto" de otros clubes
      whereClause = {
        OR: [{ clubId: clubId ? clubId : 'no-club-assigned' }, { typeTournament: 'Abierto' }],
      };
    }

    const tournaments = await prisma.tournament.findMany({
      where: whereClause,
      include: {
        club: { select: { name: true } }, // Incluimos el nombre del club para el Frontend
      },
      orderBy: { dateStart: 'asc' },
    });

    return res.status(200).json({ success: true, data: tournaments });
  } catch (error) {
    console.error('Error fetching tournaments:', error);
    return res.status(500).json({ success: false, message: 'Error al obtener torneos' });
  }
});

router.post('/', async (req, res) => {
  try {
    const role = req.user?.role;
    const userClubId = req.user?.clubId;

    // Si es un Admin de Club, obligamos a que tenga un club asignado
    if (role === 'AdminClub' && !userClubId) {
      return res.status(403).json({ error: 'No perteneces a ningún club para crear torneos' });
    }

    const validation = createTournamentSchema.safeParse(req.body);

    if (!validation.success) {
      res.status(400).json({
        error: 'Datos inválidos',
        details: z.treeifyError(validation.error),
      });
      return;
    }

    const data = validation.data;

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

        status: MatchStatus.Programado,
        groupsCreated: false,
        knockoutCreated: false,

        // AÑADIDO: Asignamos automáticamente el torneo al club del usuario que lo crea
        clubId: userClubId || null,
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

router.get('/:id', async (req, res) => {
  const tournamentId = req.params.id;
  try {
    const tournament = await prisma.tournament.findUnique({
      where: {
        id: tournamentId,
      },
      include: {
        participants: {
          include: {
            player: {
              include: {
                stats: true,
              },
            },
          },
        },
      },
    });
    if (tournament) return res.status(200).json({ success: true, data: tournament });
    else
      return res
        .status(200)
        .json({ success: true, data: tournament, message: 'Torneo no encontrado' });
    return res.status(200).json({ success: true, data: tournament });
  } catch (error) {
    console.error('Error fetching tournament:', error);
    return res.status(500).json({ success: false, message: 'Error al obtener torneo' });
  }
});

router.post('/:id/register', async (req, res) => {
  try {
    const tournamentId = req.params.id;

    const validation = registerParticipantSchema.safeParse(req.body);
    if (!validation.success) {
      res.status(400).json({ error: 'Datos inválidos', details: validation.error.format() });
      return;
    }
    const { playerId } = validation.data;

    const tournament = await prisma.tournament.findUnique({
      where: { id: tournamentId },
      include: {
        _count: {
          select: { participants: true },
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

    if (tournament._count.participants >= tournament.numPlayers) {
      res.status(400).json({ error: 'El torneo ya ha alcanzado el límite máximo de jugadores' });
      return;
    }

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

    const newParticipant = await prisma.tournamentParticipant.create({
      data: {
        tournamentId,
        playerId,
        status: PlayerTournamentStatus.Pendiente,
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

router.post('/:id/generate-groups', async (req, res) => {
  try {
    const tournamentId = req.params.id;

    const result = await generateTournamentGroups(prisma, tournamentId);

    res.status(200).json(result);
  } catch (error: any) {
    console.error('Error al generar grupos:', error);

    res.status(400).json({ error: error.message || 'Error al generar los grupos' });
  }
});

router.get('/:id/participants', async (req, res) => {
  try {
    const tournamentId = req.params.id;

    const participants = await prisma.tournamentParticipant.findMany({
      where: { tournamentId: tournamentId },
      include: {
        player: {
          select: { id: true, name: true, surname: true, stats: true },
        },
      },
      orderBy: { registeredAt: 'asc' }, // Orden de llegada
    });

    return res.status(200).json({
      success: true,
      data: participants,
    });
  } catch (error) {
    console.error('Error al obtener los participantes:', error);
    return res.status(500).json({
      success: false,
      message: 'Error interno del servidor al cargar los participantes.',
    });
  }
});

router.get('/:id/bracket', async (req, res) => {
  try {
    const tournamentId = req.params.id;

    const type = (req.query.type as KnockoutType) || KnockoutType.A;

    const knockouts = await fetchTournamentBracket(prisma, tournamentId, type);

    if (!knockouts || knockouts.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'No se ha generado el cuadro para este torneo todavía.',
      });
    }

    return res.status(200).json({
      success: true,
      data: knockouts,
    });
  } catch (error) {
    console.error('Error al obtener el cuadro:', error);
    return res.status(500).json({
      success: false,
      message: 'Error interno del servidor al cargar el cuadro.',
    });
  }
});

router.get('/:id/groups/matches', async (req, res) => {
  try {
    const tournamentId = req.params.id;
    const { groupId } = req.query;

    const matches = await fetchGroupMatches(prisma, tournamentId, groupId as string);

    return res.status(200).json({ success: true, data: matches });
  } catch (error) {
    console.error('Error fetching group matches:', error);
    return res
      .status(500)
      .json({ success: false, message: 'Error al obtener los partidos del grupo.' });
  }
});

router.get('/:id/groups/classifications', async (req, res) => {
  try {
    const tournamentId = req.params.id;
    const { groupId } = req.query;

    const clasifications = await fetchGroupClassifications(prisma, tournamentId, groupId as string);

    return res.status(200).json({ success: true, data: clasifications });
  } catch (error) {
    console.error('Error fetching group classifications:', error);
    return res.status(500).json({ success: false, message: 'Error al obtener la clasificación.' });
  }
});

router.get('/:id/classifications', async (req, res) => {
  try {
    const tournamentId = req.params.id;

    const clasifications = await prisma.tournamentClas.findMany({
      where: { tournamentId: tournamentId },
      include: {
        player: {
          select: { id: true, name: true, surname: true },
        },
      },
    });

    return res.status(200).json({ success: true, data: clasifications });
  } catch (error) {
    console.error('Error fetching group classifications:', error);
    return res.status(500).json({ success: false, message: 'Error al obtener la clasificación.' });
  }
});

export default router;

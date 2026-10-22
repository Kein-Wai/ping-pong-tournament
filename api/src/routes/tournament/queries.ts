import { Router } from 'express';
import prisma from '../../db';
import { z } from 'zod';
import { MatchStatus, PlayerTournamentStatus, KnockoutType } from '@prisma/client';
import { resolveCurrentSeason } from '../../utils/season';
import { hasClubPermission } from '../../utils/auth';

const router = Router();
import { fetchTournamentBracket } from '../../utils/knockout';
import { fetchGroupMatches, fetchGroupClassifications } from '../../utils/standings';

router.get('/', async (req, res) => {
  try {
    const role = req.user?.role;
    const clubId = req.user?.clubId;
    const userId = req.user?.id;
    let clubStatus = 'Registrado';
    if (userId) {
      const userDb = await prisma.user.findUnique({
        where: { id: userId },
        select: { clubStatus: true },
      });
      if (userDb?.clubStatus) clubStatus = userDb.clubStatus;
    }

    const currentSeason = await resolveCurrentSeason(prisma);

    let whereClause: any = {
      seasonId: currentSeason.id,
    };

    if (role === 'SuperAdmin') {
      whereClause = {};
    } else if (role === 'AdminClub') {
      whereClause = { clubId: clubId };
    } else {
      if (clubId && clubStatus === 'Aprobado') {
        // Si está aprobado, ve los de su club y los abiertos globales
        whereClause = {
          OR: [{ clubId: clubId }, { typeTournament: 'Abierto' }],
        };
      } else {
        // Si está Pendiente, Rechazado o Libre, SOLO ve los torneos Abiertos
        whereClause = { typeTournament: 'Abierto' };
      }
    }

    const tournaments = await prisma.tournament.findMany({
      where: whereClause,
      include: {
        club: { select: { name: true } },
      },
      orderBy: { dateStart: 'asc' },
    });

    return res.status(200).json({ success: true, data: tournaments });
  } catch (error) {
    console.error('Error fetching tournaments:', error);
    return res.status(500).json({ success: false, message: 'Error al obtener torneos' });
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
  } catch (error) {
    console.error('Error fetching tournament:', error);
    return res.status(500).json({ success: false, message: 'Error al obtener torneo' });
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
      orderBy: { registeredAt: 'asc' },
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

router.get('/player/:playerId/enrolled', async (req, res) => {
  try {
    const { playerId } = req.params;

    // Solo el jugador puede ver sus propias inscripciones en el dashboard
    if (req.user?.id !== playerId) return res.status(403).json({ error: 'No autorizado' });

    const inscriptions = await prisma.tournamentParticipant.findMany({
      where: {
        playerId: playerId,
        tournament: {
          status: { notIn: ['Completado', 'Cancelado'] }, // Solo torneos en curso
        },
      },
      include: {
        tournament: true,
      },
      orderBy: { tournament: { dateStart: 'asc' } },
    });

    // Mapeamos para devolver solo los datos del torneo
    const tournaments = inscriptions.map((i) => i.tournament);
    res.status(200).json({ success: true, data: tournaments });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, error: 'Error al obtener torneos inscritos' });
  }
});

export default router;

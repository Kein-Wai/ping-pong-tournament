import { Router } from 'express';
import { z } from 'zod';
import prisma from '../db';
import {
  createTournamentSchema,
  registerParticipantSchema,
  baseTournamentObject,
  validateTournamentBusinessRules,
} from '../schemas/tournament';
import { generateTournamentGroups } from '../utils/group-generator';
import { MatchStatus, PlayerTournamentStatus, KnockoutType } from '@prisma/client';
import { fetchTournamentBracket } from '../utils/knockout';
import { fetchGroupMatches, fetchGroupClassifications } from '../utils/group';
import { requireAdminClub } from '../middleware/auth.middleware';

const router = Router();

router.get('/', async (req, res) => {
  try {
    const role = req.user?.role;
    const clubId = req.user?.clubId;

    let whereClause: any = {};

    if (role === 'SuperAdmin') {
      whereClause = {};
    } else if (role === 'AdminClub') {
      whereClause = { clubId: clubId };
    } else {
      whereClause = {
        OR: [{ clubId: clubId ? clubId : 'no-club-assigned' }, { typeTournament: 'Abierto' }],
      };
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

router.post('/', requireAdminClub, async (req, res) => {
  try {
    const role = req.user?.role;
    const userClubId = req.user?.clubId;

    if (role === 'AdminClub' && !userClubId) {
      return res.status(403).json({ error: 'No perteneces a ningún club para crear torneos' });
    }
    console.log(req.body);
    const validation = createTournamentSchema.safeParse(req.body);

    console.log(validation);
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
  } catch (error) {
    console.error('Error fetching tournament:', error);
    return res.status(500).json({ success: false, message: 'Error al obtener torneo' });
  }
});

router.put('/:id', requireAdminClub, async (req, res) => {
  try {
    const tournamentId = req.params.id as string;
    const adminClubId = req.user?.clubId;
    const role = req.user?.role;

    const tournament = await prisma.tournament.findUnique({ where: { id: tournamentId } });

    if (!tournament) {
      return res.status(404).json({ error: 'Torneo no encontrado' });
    }

    if (role === 'AdminClub' && tournament.clubId !== adminClubId) {
      return res.status(403).json({ error: 'No tienes permiso para editar este torneo' });
    }

    const validation = baseTournamentObject.partial().safeParse(req.body);
    if (!validation.success) {
      return res
        .status(400)
        .json({ error: 'Datos inválidos', details: z.treeifyError(validation.error) });
    }

    const mergedData = {
      ...tournament,
      ...validation.data,
      dateStart:
        tournament.dateStart instanceof Date
          ? tournament.dateStart.toISOString()
          : tournament.dateStart,
    };

    const businessValidation = baseTournamentObject
      .superRefine(validateTournamentBusinessRules)
      .safeParse(mergedData);

    if (!businessValidation.success) {
      return res.status(400).json({
        error: 'La nueva configuración rompe las reglas del torneo',
        details: z.treeifyError(businessValidation.error),
      });
    }

    const updatedTournament = await prisma.tournament.update({
      where: { id: tournamentId },
      data: validation.data,
    });

    res.status(200).json({ success: true, message: 'Torneo actualizado', data: updatedTournament });
  } catch (error) {
    console.error('Error al actualizar el torneo:', error);
    res.status(500).json({ error: 'Error interno al actualizar el torneo' });
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

router.put('/:id/participants/:playerId/status', requireAdminClub, async (req, res) => {
  try {
    const id = req.params.id as string;
    const playerId = req.params.playerId as string;
    const { status } = req.body;
    const adminClubId = req.user?.clubId;

    console.log('playerID', playerId);
    console.log('tournamentid', id);
    console.log('status', status);

    const tournament = await prisma.tournament.findUnique({ where: { id } });
    if (!tournament || (req.user?.role === 'AdminClub' && tournament.clubId !== adminClubId)) {
      return res.status(403).json({ error: 'No tienes permisos sobre este torneo' });
    }

    const currentParticipant = await prisma.tournamentParticipant.findUnique({
      where: { tournamentId_playerId: { tournamentId: id, playerId } },
    });

    if (!currentParticipant) {
      return res.status(404).json({ error: 'Participante no encontrado' });
    }

    const updatedParticipant = await prisma.tournamentParticipant.update({
      where: { tournamentId_playerId: { tournamentId: id, playerId } },
      data: { status },
    });

    if (status === 'NoPresentado' && currentParticipant.status !== 'NoPresentado') {
      await prisma.stats.update({
        where: { userId: playerId },
        data: { elo: { decrement: 100 } },
      });
    } else if (status !== 'NoPresentado' && currentParticipant.status === 'NoPresentado') {
      await prisma.stats.update({
        where: { userId: playerId },
        data: { elo: { increment: 100 } },
      });
    }

    res.status(200).json({ success: true, message: `Jugador marcado como ${status}` });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error al actualizar el estado del participante' });
  }
});

// DELETE: Borrar un torneo (Solo si está en estado 'Programado')
router.delete('/:id', requireAdminClub, async (req, res) => {
  try {
    const tournamentId = req.params.id as string;
    const adminClubId = req.user?.clubId;
    const role = req.user?.role;

    // 1. Buscamos el torneo
    const tournament = await prisma.tournament.findUnique({
      where: { id: tournamentId },
    });

    if (!tournament) {
      return res.status(404).json({ error: 'Torneo no encontrado' });
    }

    // 2. Seguridad Multi-tenant: El AdminClub solo borra torneos de su club
    if (role === 'AdminClub' && tournament.clubId !== adminClubId) {
      return res.status(403).json({ error: 'No tienes permiso para borrar este torneo' });
    }

    // 3. Regla de negocio: Solo se puede borrar si no se ha iniciado
    if (tournament.status !== 'Programado') {
      return res.status(400).json({
        error: 'No se puede eliminar un torneo que ya ha sido iniciado o finalizado.',
      });
    }

    // 4. Eliminación en cascada (Prisma borrará las inscripciones asociadas si las hay)
    await prisma.tournament.delete({
      where: { id: tournamentId },
    });

    res.status(200).json({ success: true, message: 'Torneo eliminado con éxito' });
  } catch (error) {
    console.error('Error al eliminar el torneo:', error);
    res.status(500).json({ error: 'Error interno del servidor al eliminar el torneo' });
  }
});

export default router;

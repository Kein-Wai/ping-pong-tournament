import { Router } from 'express';
import prisma from '../../db';
import { z } from 'zod';
import { MatchStatus, PlayerTournamentStatus, KnockoutType } from '@prisma/client';
import { resolveCurrentSeason } from '../../utils/season';
import { hasClubPermission } from '../../utils/auth';

const router = Router();
import { createTournamentSchema, baseTournamentObject, validateTournamentBusinessRules } from '../../schemas/tournament';
import { templateCuentaCreada } from '../../utils/emailtemplate';
import { enviarCorreoGenerico } from '../../services/email';
import { requireAdminClub } from '../../middleware/auth.middleware';

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

    const currentSeason = await resolveCurrentSeason(prisma);

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
        setsToWinGroup: data.setsToWinGroup,
        setsToWinKnockout: data.setsToWinKnockout,
        status: MatchStatus.Programado,
        groupsCreated: false,
        knockoutCreated: false,

        clubId: userClubId || null,
        seasonId: currentSeason.id,
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

import { Router } from 'express';
import { z } from 'zod';
import prisma from '../../db';
import { MatchStatus } from '@prisma/client';
import {
  createTournamentSchema,
  baseTournamentObject,
  validateTournamentBusinessRules,
} from '../../schemas/tournament';
import { resolveCurrentSeason } from '../../utils/season';
import { resolveResourceAccess } from '../../utils/auth';
import { requireAdminClub } from '../../middleware/auth.middleware';
import { asyncHandler } from '../../http/response';

const router = Router();

router.post('/', requireAdminClub, asyncHandler(async (req, res) => {
  const role = req.user?.role;
  const userClubId = req.user?.clubId;

  if (role === 'AdminClub' && !userClubId) {
    return res.status(403).json({ success: false, error: 'No perteneces a ningún club para crear torneos' });
  }
  const validation = createTournamentSchema.safeParse(req.body);

  if (!validation.success) {
    res.status(400).json({ success: false, error: 'Datos inválidos',
      details: z.treeifyError(validation.error),
    });
    return;
  }

  const data = validation.data;

  const currentSeason = await resolveCurrentSeason(prisma);

  const newTournament = await prisma.tournament.create({
    data: {
      name: data.name,
      dateStart: data.dateStart,
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

}, 'Error interno al crear el torneo', 500));

router.put('/:id', requireAdminClub, asyncHandler(async (req, res) => {
  const tournamentId = req.params.id as string;

  const access = resolveResourceAccess(
    await prisma.tournament.findUnique({ where: { id: tournamentId } }),
    req.user,
  );

  if (!access.ok) {
    if (access.reason === 'notFound') {
      return res.status(404).json({ success: false, error: 'Torneo no encontrado' });
    }
    return res.status(403).json({ success: false, error: 'No tienes permiso para editar este torneo' });
  }
  const { resource: tournament } = access;

  const validation = baseTournamentObject.partial().safeParse(req.body);
  if (!validation.success) {
    return res
      .status(400)
      .json({ success: false, error: 'Datos inválidos', details: z.treeifyError(validation.error) });
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
    return res.status(400).json({ success: false, error: 'La nueva configuración rompe las reglas del torneo',
      details: z.treeifyError(businessValidation.error),
    });
  }

  const updatedTournament = await prisma.tournament.update({
    where: { id: tournamentId },
    data: validation.data,
  });

  res.status(200).json({ success: true, message: 'Torneo actualizado', data: updatedTournament });

}, 'Error interno al actualizar el torneo', 500));

router.delete('/:id', requireAdminClub, asyncHandler(async (req, res) => {
  const tournamentId = req.params.id as string;

  // Seguridad Multi-tenant: El AdminClub solo borra torneos de su club
  const access = resolveResourceAccess(
    await prisma.tournament.findUnique({ where: { id: tournamentId } }),
    req.user,
  );

  if (!access.ok) {
    if (access.reason === 'notFound') {
      return res.status(404).json({ success: false, error: 'Torneo no encontrado' });
    }
    return res.status(403).json({ success: false, error: 'No tienes permiso para borrar este torneo' });
  }
  const { resource: tournament } = access;

  // Regla de negocio: Solo se puede borrar si no se ha iniciado
  if (tournament.status !== 'Programado') {
    return res.status(400).json({ success: false, error: 'No se puede eliminar un torneo que ya ha sido iniciado o finalizado.',
    });
  }

  // Eliminación en cascada (Prisma borrará las inscripciones asociadas si las hay)
  await prisma.tournament.delete({
    where: { id: tournamentId },
  });

  res.status(200).json({ success: true, message: 'Torneo eliminado con éxito' });

}, 'Error interno del servidor al eliminar el torneo', 500));

export default router;

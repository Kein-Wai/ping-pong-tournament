import { Router } from 'express';
import { z } from 'zod';
import prisma from '../../db';
import { swapPlayersSchema } from '../../schemas/tournament';
import { generateTournamentGroups } from '../../utils/group-generator';
import { validateSwap, validateSwapTarget, swapPlayers } from '../../utils/tournament-swap';
import { resolveResourceAccess } from '../../utils/auth';
import { requireAdminClub } from '../../middleware/auth.middleware';
import { BYE_USER_ID } from '../../constants';
import { generateTournamentExcel } from '../../services/excel';
import { asyncHandler, sendError, sendMessage } from '../../http/response';

const router = Router();

router.post(
  '/:id/generate-groups',
  requireAdminClub,
  asyncHandler(async (req, res) => {
    const tournamentId = req.params.id as string;

    const access = resolveResourceAccess(
      await prisma.tournament.findUnique({ where: { id: tournamentId } }),
      req.user,
    );
    if (!access.ok) {
      if (access.reason === 'notFound') {
        return sendError(res, 404, 'Torneo no encontrado');
      }
      return sendError(res, 403, 'No tienes permisos sobre este torneo');
    }

    const result = await generateTournamentGroups(prisma, tournamentId);

    sendMessage(res, result.message);
  }, 'Error al generar los grupos', 400),
);

router.put('/:id/swap-players', requireAdminClub, asyncHandler(async (req, res) => {
  const tournamentId = req.params.id as string;

  const access = resolveResourceAccess(
    await prisma.tournament.findUnique({ where: { id: tournamentId } }),
    req.user,
  );

  if (!access.ok) {
    if (access.reason === 'notFound') {
      return sendError(res, 404, 'Torneo no encontrado');
    }
    return sendError(res, 403, 'No tienes permisos sobre este torneo');
  }
  const { resource: tournament } = access;

  const targetRejection = validateSwapTarget(tournament);
  if (targetRejection) {
    return sendError(res, targetRejection.status, targetRejection.message);
  }

  const validation = swapPlayersSchema.safeParse(req.body);
  if (!validation.success)
    return sendError(res, 400, 'Datos inválidos', z.treeifyError(validation.error));

  const { playerAId, playerBId } = validation.data;

  const isGroups = tournament.status === 'Grupos';
  const isKnockout = [
    'R128avos',
    'R64avos',
    'R32avos',
    'R16avos',
    'Octavos',
    'Cuartos',
    'Semifinales',
    'Final',
  ].includes(tournament.status || '');

  // Bloqueo temporal (congelación del sorteo): no se admiten cambios si la
  // fase en curso ya tiene partidos jugados.
  const startedGroupMatches = isGroups
    ? await prisma.match.count({
        where: { tournamentId, groupId: { not: null }, status: { not: 'Programado' } },
      })
    : 0;

  const startedKnockoutMatches = isKnockout
    ? await prisma.match.count({
        where: {
          tournamentId,
          knockoutId: { not: null },
          status: { not: 'Programado' },
          playerOneId: { not: BYE_USER_ID },
          playerTwoId: { not: BYE_USER_ID },
        },
      })
    : 0;

  const rejection = validateSwap(
    { tournamentId, playerAId, playerBId },
    tournament,
    startedGroupMatches,
    startedKnockoutMatches,
  );
  if (rejection) {
    return sendError(res, rejection.status, rejection.message);
  }

  await swapPlayers(prisma, { tournamentId, playerAId, playerBId }, tournament);

  sendMessage(res, 'Jugadores intercambiados con éxito');

}, 'Error interno al intercambiar jugadores', 500));

// GET: Descargar Excel del torneo
router.post('/generate-excel', asyncHandler(async (req, res) => {
  const { tournamentInfo, players } = req.body;

  const excelBuffer = await generateTournamentExcel(tournamentInfo, players);

  res.setHeader(
    'Content-Type',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  );
  res.setHeader(
    'Content-Disposition',
    `attachment; filename="Torneo_${tournamentInfo.name.replace(/\s+/g, '_')}.xlsx"`,
  );

  res.send(excelBuffer);

}, 'Error al generar el Excel', 500));

export default router;

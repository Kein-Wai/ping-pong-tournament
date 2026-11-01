import { Router } from 'express';
import prisma from '../db';
import { z } from 'zod';
import {
  createManualMatchSchema,
  addPointSchema,
  completeMatchSchema,
  updateManualMatchSchema,
  listManualMatchesQuerySchema,
} from '../schemas/manualMatch';
import { MatchStatus, type Prisma } from '@prisma/client';
import { resolveCurrentSeason } from '../utils/season';
import { calculateSkillGrowth } from '../utils/skills';
import { getPlayerCurrentSkills } from '../utils/stats';
import { asyncHandler, sendData, sendError, sendMessage } from '../http/response';
import type { UserPayload } from '../middleware/auth.middleware';
import {
  canManageManualMatch,
  isApprovedClubAdmin,
  managedPlayerWhere,
  manualMatchOwnershipSelect,
} from '../utils/manual-match-access';

const router = Router();

/**
 * Un partido manual lo gestiona su propietario (el jugador analizado) y los AdminClub
 * de su club. Devuelve el propietario si `actor` puede gestionarlo y `null` si no
 * existe o no tiene acceso: ambos casos responden igual (404) para no revelar que existe.
 */
const findManageableOwnerId = async (
  matchId: string,
  actor: UserPayload | undefined,
): Promise<string | null> => {
  if (!actor) return null;
  const match = await prisma.manualMatch.findUnique({
    where: { id: matchId },
    select: manualMatchOwnershipSelect,
  });
  return match && canManageManualMatch(match, actor) ? match.userId : null;
};

const NOT_FOUND_MESSAGE = 'Partido no encontrado o sin acceso';

// 1. Obtener los partidos manuales del usuario logueado; el AdminClub, además, los de los jugadores de su club
router.get('/', asyncHandler(async (req, res) => {
  const userId = req.user?.id;
  if (!userId) return sendError(res, 401, 'No autorizado');

  const query = listManualMatchesQuerySchema.safeParse(req.query);
  if (!query.success) {
    return sendError(res, 400, 'Datos inválidos', z.treeifyError(query.error));
  }

  // El club sale del token. El filtro por jugador se suma con AND: solo puede reducir el alcance.
  const scope: Prisma.ManualMatchWhereInput = isApprovedClubAdmin(req.user)
    ? {
        OR: [{ userId }, { user: managedPlayerWhere(req.user.clubId) }],
      }
    : { userId };
  const { playerId } = query.data;

  const matches = await prisma.manualMatch.findMany({
    where: playerId ? { AND: [scope, { userId: playerId }] } : scope,
    orderBy: { date: 'desc' },
    include: {
      _count: { select: { points: true } }, // Cuenta cuántos puntos se registraron
      user: { select: { id: true, name: true, surname: true, nickname: true } }, // Jugador analizado
    },
  });

  sendData(res, matches);

}, 'Error al obtener los partidos manuales', 500));

// 2. Crear un nuevo partido manual (Pre-partido)
router.post('/', asyncHandler(async (req, res) => {
  const userId = req.user?.id;
  if (!userId) return sendError(res, 401, 'No autorizado');

  const validation = createManualMatchSchema.safeParse(req.body);
  if (!validation.success) {
    return sendError(res, 400, 'Datos inválidos', z.treeifyError(validation.error));
  }
  const { playerId, ...matchData } = validation.data;

  // Con `playerId` el entrenador analiza a un jugador de su club: el análisis es del jugador.
  const isCoachAnalysis = !!playerId && playerId !== userId;
  if (isCoachAnalysis) {
    if (!isApprovedClubAdmin(req.user)) {
      return sendError(res, 403, 'Solo el entrenador de un club aprobado puede analizar a un jugador');
    }
    // El club sale del token, nunca del body.
    const player = await prisma.user.findFirst({
      where: { id: playerId, ...managedPlayerWhere(req.user.clubId) },
      select: { id: true },
    });
    if (!player) return sendError(res, 404, 'Jugador no encontrado en tu club');
  }

  const currentSeason = await resolveCurrentSeason(prisma);
  const newMatch = await prisma.manualMatch.create({
    data: {
      ...matchData,
      userId: isCoachAnalysis ? playerId : userId,
      coachId: isCoachAnalysis ? userId : undefined,
      seasonId: currentSeason.id,
      date: matchData.date ? new Date(matchData.date) : new Date(),
      status: matchData.status || MatchStatus.Iniciado,
    },
  });

  sendData(res, newMatch, 201);

}, 'Error al crear el partido manual', 500));

// 3. Obtener el detalle de un partido y TODOS sus puntos (Para el reporte final)
router.get('/:id', asyncHandler(async (req, res) => {
  const match = await prisma.manualMatch.findUnique({
    where: { id: req.params.id as string },
    include: {
      points: { orderBy: { pointOrder: 'asc' } }, // Puntos ordenados cronológicamente
      user: manualMatchOwnershipSelect.user,
    },
  });

  if (!match || !canManageManualMatch(match, req.user)) {
    return sendError(res, 404, 'Partido no encontrado o sin acceso');
  }

  sendData(res, match);

}, 'Error al obtener el partido', 500));

router.put('/:id', asyncHandler(async (req, res) => {
  if (!(await findManageableOwnerId(req.params.id as string, req.user))) {
    return sendError(res, 404, NOT_FOUND_MESSAGE);
  }

  // 1. Zod filtra y valida. Si intentan colar "status: Completado", Zod lo elimina automáticamente.
  const validation = updateManualMatchSchema.safeParse(req.body);

  if (!validation.success) {
    return sendError(res, 400, 'Datos inválidos', z.treeifyError(validation.error));
  }

  // 2. Solo guardamos lo que Zod nos ha devuelto limpio y seguro (validation.data)
  const updatedMatch = await prisma.manualMatch.update({
    where: { id: req.params.id as string },
    data: validation.data,
  });

  sendData(res, updatedMatch);

}, 'Error al actualizar el partido', 500));

// 4. Añadir un punto al partido (Se llama cada vez que el árbitro toca un botón)
router.post('/:id/points', asyncHandler(async (req, res) => {
  if (!(await findManageableOwnerId(req.params.id as string, req.user))) {
    return sendError(res, 404, NOT_FOUND_MESSAGE);
  }

  const validation = addPointSchema.safeParse(req.body);
  if (!validation.success) {
    return sendError(res, 400, 'Datos de punto inválidos');
  }

  const point = await prisma.pointAnalysis.create({
    data: {
      ...validation.data,
      manualMatchId: req.params.id as string,
    },
  });

  sendData(res, point, 201);

}, 'Error al registrar el punto', 500));

// 5. Botón de Pánico: Deshacer el último punto
router.delete('/:id/points/:pointId', asyncHandler(async (req, res) => {
  // El punto debe ser del partido indicado y ese partido, gestionable por el usuario.
  const point = await prisma.pointAnalysis.findUnique({
    where: { id: req.params.pointId as string },
    select: {
      manualMatchId: true,
      match: { select: manualMatchOwnershipSelect },
    },
  });
  if (
    !point ||
    point.manualMatchId !== req.params.id ||
    !canManageManualMatch(point.match, req.user)
  ) {
    return sendError(res, 404, NOT_FOUND_MESSAGE);
  }

  await prisma.pointAnalysis.delete({
    where: { id: req.params.pointId as string },
  });
  sendMessage(res, 'Punto deshecho');

}, 'Error al deshacer el punto', 500));

// 6. Finalizar el partido (Se llama al terminar el último set)
// 6. Finalizar el partido (Se llama al terminar el último set)
router.put('/:id/complete', asyncHandler(async (req, res) => {
  if (!req.user?.id) return sendError(res, 401, 'No autorizado');

  const validation = completeMatchSchema.safeParse(req.body);
  if (!validation.success) return sendError(res, 400, 'Datos inválidos');

  // Las estadísticas se suman al dueño del análisis (el jugador), lo finalice él o su entrenador.
  const userId = await findManageableOwnerId(req.params.id as string, req.user);
  if (!userId) {
    return sendError(res, 404, NOT_FOUND_MESSAGE);
  }

  // Envolvemos en transacción para asegurar la base de datos
  const updatedMatch = await prisma.$transaction(async (tx) => {
    const currentSeason = await resolveCurrentSeason(tx);
    const match = await tx.manualMatch.update({
      where: { id: req.params.id as string },
      data: {
        status: MatchStatus.Completado,
        mySets: validation.data.mySets,
        opponentSets: validation.data.opponentSets,
        lightNotes: validation.data.lightNotes,
        setScores: validation.data.setScores ? validation.data.setScores : undefined, // 👈 Se guarda como JSON
      },
    });

    let myTotalPoints = 0;
    let oppTotalPoints = 0;
    if (validation.data.setScores) {
      validation.data.setScores.forEach((s) => {
        myTotalPoints += s.myScore;
        oppTotalPoints += s.oppScore;
      });
    }
    const isWin = validation.data.mySets > validation.data.opponentSets;

    // 👇 NUEVO: Inyectar en Stats las métricas personales
    await tx.stats.upsert({
      where: { userId_seasonId: { userId, seasonId: currentSeason.id } },
      create: {
        userId,
        seasonId: currentSeason.id,
        manualMatchWon: isWin ? 1 : 0,
        manualMatchLost: isWin ? 0 : 1,
        manualSetWon: validation.data.mySets,
        manualSetLost: validation.data.opponentSets,
        manualPointWon: myTotalPoints,
        manualPointLost: oppTotalPoints,
      },
      update: {
        manualMatchWon: { increment: isWin ? 1 : 0 },
        manualMatchLost: { increment: isWin ? 0 : 1 },
        manualSetWon: { increment: validation.data.mySets },
        manualSetLost: { increment: validation.data.opponentSets },
        manualPointWon: { increment: myTotalPoints },
        manualPointLost: { increment: oppTotalPoints },
      },
    });

    // Obtener stats y aplicar curva decreciente
    const userSkills = await getPlayerCurrentSkills(tx, userId);

    // Inyectar subida al tracker personal
    await tx.playerSkillUpdate.create({
      data: {
        playerId: userId,
        sourceType: 'Partido',
        status: 'EXPECTED',
        fortalezaMental: calculateSkillGrowth(userSkills?.fortalezaMental),
        experiencia: calculateSkillGrowth(userSkills?.experiencia),
      },
    });

    return match;
  });

  sendData(res, updatedMatch);

}, 'Error al finalizar el partido', 500));

export default router;

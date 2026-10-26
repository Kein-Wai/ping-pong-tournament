import { Router } from 'express';
import prisma from '../db';
import { z } from 'zod';
import { requireAdminClub, verifyToken } from '../middleware/auth.middleware';
import {
  createTeamSchema,
  updateTeamPlayersSchema,
  createTeamMatchSchema,
  updateTeamMatchSchema,
  updateTeamSchema,
} from '../schemas/team';
import { resolveCurrentSeason } from '../utils/season';
import { canAccessClub, hasClubPermission } from '../utils/auth';
import { asyncHandler, sendData, sendError, sendMessage } from '../http/response';
import { toSafeUser } from '../utils/safe-user';

const router = Router();

// Diccionario de pesos para calcular el nivel más bajo según tu Enum PlayerLevel
const LEVEL_WEIGHTS: Record<string, number> = {
  Iniciacion: 1,
  Principiante: 2,
  Intermedio: 3,
  Avanzado: 4,
  Profesional: 5,
};

const getLowestLevel = (players: any[]) => {
  if (!players || players.length === 0) return 'Sin Nivel';

  let minWeight = 99;
  let lowestName = 'Iniciacion';

  for (const p of players) {
    const w = LEVEL_WEIGHTS[p.level || 'Iniciacion'] || 1;
    if (w < minWeight) {
      minWeight = w;
      lowestName = p.level || 'Iniciacion';
    }
  }
  return lowestName;
};

// GET: Obtener todos los equipos de un club
router.get('/club/:clubId', verifyToken, asyncHandler(async (req, res) => {
  const clubId = req.params.clubId as string;
  const currentSeason = await resolveCurrentSeason(prisma);

  // Seguridad Multi-tenant: Si eres AdminClub, solo puedes ver tus equipos (o los de tu club si eres player)
  if (!canAccessClub(req.user, clubId)) {
    return sendError(res, 403, 'No tienes permisos para ver los equipos de otro club');
  }

  const teams = await prisma.team.findMany({
    where: { clubId, seasonId: currentSeason.id },
    include: {
      _count: { select: { players: true } },
      players: {
        select: { id: true, name: true, surname: true, avatarUrl: true, level: true, stats: true },
      },
      matches: {
        orderBy: { date: 'asc' },
        include: {
          availabilities: {
            include: { player: { select: { id: true, name: true, avatarUrl: true } } },
          },
        },
      },
    },
    orderBy: { createdAt: 'asc' },
  });

  sendData(res, teams);

}, 'Error al obtener los equipos del club', 500));

// POST: Crear un nuevo equipo
router.post('/', verifyToken, requireAdminClub, asyncHandler(async (req, res) => {
  const clubId = req.user?.clubId;
  const currentSeason = await resolveCurrentSeason(prisma);
  if (!clubId) return sendError(res, 403, 'No tienes un club asignado');

  const validation = createTeamSchema.safeParse(req.body);
  if (!validation.success) {
    return sendError(res, 400, 'Datos inválidos', z.treeifyError(validation.error));
  }

  const { name, category, level } = validation.data;

  const newTeam = await prisma.team.create({
    data: {
      name,
      category,
      level,
      clubId,
      seasonId: currentSeason.id,
    },
  });

  sendData(res, newTeam, 201);

}, 'Error al crear el equipo', 500));

// PUT: Actualizar la plantilla de un equipo (y recalcular nivel)
router.put('/:id/players', verifyToken, requireAdminClub, asyncHandler(async (req, res) => {
  const teamId = req.params.id as string;
  const adminClubId = req.user?.clubId;

  const validation = updateTeamPlayersSchema.safeParse(req.body);
  if (!validation.success) {
    return sendError(res, 400, 'Datos inválidos', z.treeifyError(validation.error));
  }

  const team = await prisma.team.findUnique({ where: { id: teamId } });
  if (!team || !hasClubPermission(req.user, team.clubId)) {
    return sendError(res, 404, 'Equipo no encontrado o sin permisos');
  }

  const { playerIds } = validation.data;

  // Obtenemos los niveles de los jugadores seleccionados
  // Solo pueden formar la plantilla jugadores del club del equipo.
  const selectedPlayers = await prisma.user.findMany({
    where: { id: { in: playerIds }, clubId: team.clubId },
    select: { level: true },
  });
  if (selectedPlayers.length !== new Set(playerIds).size) {
    return sendError(res, 400, 'Algún jugador no existe o no pertenece al club del equipo');
  }

  const newTeamLevel = getLowestLevel(selectedPlayers);

  const updatedTeam = await prisma.team.update({
    where: { id: teamId },
    data: {
      level: newTeamLevel,
      players: {
        set: playerIds.map((id: string) => ({ id })), // Resetea y asocia los nuevos
      },
    },
    include: { players: true },
  });

  // `include: { players: true }` trae todos los escalares de cada jugador (hash, tokens).
  sendData(res, { ...updatedTeam, players: updatedTeam.players.map(toSafeUser) });

}, 'Error al actualizar la plantilla del equipo', 500));

// POST: Añadir un partido al calendario del equipo
router.post('/:id/matches', verifyToken, requireAdminClub, asyncHandler(async (req, res) => {
  const teamId = req.params.id as string;
  const adminClubId = req.user?.clubId;

  const validation = createTeamMatchSchema.safeParse(req.body);
  if (!validation.success) {
    return sendError(res, 400, 'Datos inválidos', z.treeifyError(validation.error));
  }

  const team = await prisma.team.findUnique({ where: { id: teamId } });
  if (!team || !hasClubPermission(req.user, team.clubId)) {
    return sendError(res, 404, 'Equipo no encontrado o sin permisos');
  }

  const { rivalName, date, isHome, location } = validation.data;

  const newMatch = await prisma.teamMatch.create({
    data: {
      teamId,
      rivalName,
      date: new Date(date),
      isHome,
      location,
    },
  });

  sendData(res, newMatch, 201);

}, 'Error al programar el partido del equipo', 500));

// PUT: Actualizar estado y resultado de un partido (Admin o Miembro del equipo)
router.put('/matches/:matchId', verifyToken, asyncHandler(async (req, res) => {
  const matchId = req.params?.matchId as string;
  const userId = req.user?.id;
  const role = req.user?.role;
  const clubId = req.user?.clubId;

  const validation = updateTeamMatchSchema.safeParse(req.body);
  if (!validation.success) {
    return sendError(res, 400, 'Datos inválidos', z.treeifyError(validation.error));
  }

  // Buscamos el partido incluyendo la plantilla del equipo para validar si el usuario juega en él
  const match = await prisma.teamMatch.findUnique({
    where: { id: matchId },
    include: { team: { include: { players: true } } },
  });

  if (!match) return sendError(res, 404, 'Partido no encontrado');

  // Lógica de Permisos: Es AdminClub de SU club, o es un Player que está en el array de jugadores del equipo
  const isClubAdmin = role === 'AdminClub' && match.team.clubId === clubId;
  const isTeamMember = match.team.players.some((p: any) => p.id === userId);

  if (!isClubAdmin && !isTeamMember && role !== 'SuperAdmin') {
    return sendError(res, 403, 'No tienes permiso. Solo el entrenador o los miembros de este equipo pueden actualizar el resultado.');
  }

  const updatedMatch = await prisma.teamMatch.update({
    where: { id: matchId },
    data: validation.data,
  });

  sendData(res, updatedMatch);

}, 'Error al actualizar el partido', 500));

router.delete('/matches/:matchId', verifyToken, requireAdminClub, asyncHandler(async (req, res) => {
  const matchId = req.params.matchId as string;
  const adminClubId = req.user?.clubId;

  const match = await prisma.teamMatch.findUnique({
    where: { id: matchId },
    include: { team: true },
  });

  if (!match) return sendError(res, 404, 'Partido no encontrado');

  if (!hasClubPermission(req.user, match.team.clubId)) {
    return sendError(res, 403, 'No tienes permiso para eliminar este partido');
  }

  await prisma.teamMatch.delete({ where: { id: matchId } });
  sendMessage(res, 'Partido eliminado del calendario');

}, 'Error al eliminar el partido', 500));

// PUT: Actualizar info básica de un equipo
router.put('/:id', requireAdminClub, asyncHandler(async (req, res) => {
  const teamId = req.params.id as string;
  const adminClubId = req.user?.clubId;

  const validation = updateTeamSchema.safeParse(req.body);
  if (!validation.success) {
    return sendError(res, 400, 'Datos inválidos', z.treeifyError(validation.error));
  }

  const team = await prisma.team.findUnique({ where: { id: teamId } });
  if (!team || !hasClubPermission(req.user, team.clubId)) {
    return sendError(res, 404, 'Equipo no encontrado o sin permisos');
  }

  const updatedTeam = await prisma.team.update({
    where: { id: teamId },
    data: validation.data,
  });

  sendMessage(res, 'Equipo actualizado', 200, updatedTeam);

}, 'Error al actualizar el equipo', 500));

// DELETE: Borrar un equipo
router.delete('/:id', verifyToken, requireAdminClub, asyncHandler(async (req, res) => {
  const teamId = req.params.id as string;
  const adminClubId = req.user?.clubId;

  const team = await prisma.team.findUnique({ where: { id: teamId } });
  if (!team || !hasClubPermission(req.user, team.clubId)) {
    return sendError(res, 404, 'Equipo no encontrado o sin permisos');
  }

  await prisma.team.delete({
    where: { id: teamId },
  });

  sendMessage(res, 'Equipo eliminado con éxito');

}, 'Error al eliminar el equipo', 500));

// POST: Confirmar / Cancelar asistencia a un partido
router.post('/matches/:matchId/availability', asyncHandler(async (req, res) => {
  const matchId = req.params.matchId as string;
  const userId = req.user?.id;
  if (!userId) return sendError(res, 401, 'No autorizado');

  // Solo los jugadores del equipo confirman su asistencia a sus partidos.
  const teamMatch = await prisma.teamMatch.findUnique({
    where: { id: matchId },
    select: { team: { select: { players: { select: { id: true } } } } },
  });
  if (!teamMatch) return sendError(res, 404, 'Partido no encontrado');
  if (!teamMatch.team.players.some((player) => player.id === userId)) {
    return sendError(res, 403, 'No formas parte de este equipo');
  }

  // Comprobar si ya existe
  const existing = await prisma.teamMatchAvailability.findUnique({
    where: { matchId_playerId: { matchId, playerId: userId } },
  });

  if (existing) {
    await prisma.teamMatchAvailability.delete({ where: { id: existing.id } });
    return sendMessage(res, 'Asistencia cancelada');
  } else {
    await prisma.teamMatchAvailability.create({ data: { matchId, playerId: userId } });
    return sendMessage(res, 'Asistencia confirmada');
  }

}, 'Error al actualizar asistencia', 500));

export default router;

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
import { getCurrentSeason } from '../utils/season';

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
router.get('/club/:clubId', verifyToken, async (req, res) => {
  try {
    const clubId = req.params.clubId as string;
    const currentSeason = await getCurrentSeason(prisma);

    // Seguridad Multi-tenant: Si eres AdminClub, solo puedes ver tus equipos (o los de tu club si eres player)
    if (req.user?.role !== 'SuperAdmin' && req.user?.clubId !== clubId) {
      return res
        .status(403)
        .json({ error: 'No tienes permisos para ver los equipos de otro club' });
    }

    const teams = await prisma.team.findMany({
      where: { clubId, seasonId: currentSeason.id },
      include: {
        _count: { select: { players: true } },
        players: {
          select: { id: true, name: true, surname: true, level: true, stats: true },
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

    res.status(200).json({ success: true, data: teams });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error al obtener los equipos del club' });
  }
});

// POST: Crear un nuevo equipo
router.post('/', verifyToken, requireAdminClub, async (req, res) => {
  try {
    const clubId = req.user?.clubId;
    const currentSeason = await getCurrentSeason(prisma);
    if (!clubId) return res.status(403).json({ error: 'No tienes un club asignado' });

    const validation = createTeamSchema.safeParse(req.body);
    if (!validation.success) {
      return res
        .status(400)
        .json({ error: 'Datos inválidos', details: z.treeifyError(validation.error) });
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

    res.status(201).json({ success: true, data: newTeam });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error al crear el equipo' });
  }
});

// PUT: Actualizar la plantilla de un equipo (y recalcular nivel)
router.put('/:id/players', verifyToken, requireAdminClub, async (req, res) => {
  try {
    const teamId = req.params.id as string;
    const adminClubId = req.user?.clubId;

    const validation = updateTeamPlayersSchema.safeParse(req.body);
    if (!validation.success) {
      return res
        .status(400)
        .json({ error: 'Datos inválidos', details: z.treeifyError(validation.error) });
    }

    const team = await prisma.team.findUnique({ where: { id: teamId } });
    if (!team || (req.user?.role === 'AdminClub' && team.clubId !== adminClubId)) {
      return res.status(404).json({ error: 'Equipo no encontrado o sin permisos' });
    }

    const { playerIds } = validation.data;

    // Obtenemos los niveles de los jugadores seleccionados
    const selectedPlayers = await prisma.user.findMany({
      where: { id: { in: playerIds } },
      select: { level: true },
    });

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

    res.status(200).json({ success: true, data: updatedTeam });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error al actualizar la plantilla del equipo' });
  }
});

// POST: Añadir un partido al calendario del equipo
router.post('/:id/matches', verifyToken, requireAdminClub, async (req, res) => {
  try {
    const teamId = req.params.id as string;
    const adminClubId = req.user?.clubId;

    const validation = createTeamMatchSchema.safeParse(req.body);
    if (!validation.success) {
      return res
        .status(400)
        .json({ error: 'Datos inválidos', details: z.treeifyError(validation.error) });
    }

    const team = await prisma.team.findUnique({ where: { id: teamId } });
    if (!team || (req.user?.role === 'AdminClub' && team.clubId !== adminClubId)) {
      return res.status(404).json({ error: 'Equipo no encontrado o sin permisos' });
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

    res.status(201).json({ success: true, data: newMatch });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error al programar el partido del equipo' });
  }
});

// PUT: Actualizar estado y resultado de un partido (Admin o Miembro del equipo)
router.put('/matches/:matchId', verifyToken, async (req, res) => {
  try {
    const matchId = req.params?.matchId as string;
    const userId = req.user?.id;
    const role = req.user?.role;
    const clubId = req.user?.clubId;

    const validation = updateTeamMatchSchema.safeParse(req.body);
    if (!validation.success) {
      return res
        .status(400)
        .json({ error: 'Datos inválidos', details: z.treeifyError(validation.error) });
    }

    // Buscamos el partido incluyendo la plantilla del equipo para validar si el usuario juega en él
    const match = await prisma.teamMatch.findUnique({
      where: { id: matchId },
      include: { team: { include: { players: true } } },
    });

    if (!match) return res.status(404).json({ error: 'Partido no encontrado' });

    // Lógica de Permisos: Es AdminClub de SU club, o es un Player que está en el array de jugadores del equipo
    const isClubAdmin = role === 'AdminClub' && match.team.clubId === clubId;
    const isTeamMember = match.team.players.some((p: any) => p.id === userId);

    if (!isClubAdmin && !isTeamMember && role !== 'SuperAdmin') {
      return res.status(403).json({
        error:
          'No tienes permiso. Solo el entrenador o los miembros de este equipo pueden actualizar el resultado.',
      });
    }

    const updatedMatch = await prisma.teamMatch.update({
      where: { id: matchId },
      data: validation.data,
    });

    res.status(200).json({ success: true, data: updatedMatch });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error al actualizar el partido' });
  }
});

router.delete('/matches/:matchId', verifyToken, requireAdminClub, async (req, res) => {
  try {
    const matchId = req.params.matchId as string;
    const adminClubId = req.user?.clubId;

    const match = await prisma.teamMatch.findUnique({
      where: { id: matchId },
      include: { team: true },
    });

    if (!match) return res.status(404).json({ error: 'Partido no encontrado' });

    if (req.user?.role === 'AdminClub' && match.team.clubId !== adminClubId) {
      return res.status(403).json({ error: 'No tienes permiso para eliminar este partido' });
    }

    await prisma.teamMatch.delete({ where: { id: matchId } });
    res.status(200).json({ success: true, message: 'Partido eliminado del calendario' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error al eliminar el partido' });
  }
});

// PUT: Actualizar info básica de un equipo
router.put('/:id', requireAdminClub, async (req, res) => {
  try {
    const teamId = req.params.id as string;
    const adminClubId = req.user?.clubId;

    const validation = updateTeamSchema.safeParse(req.body);
    if (!validation.success) {
      return res
        .status(400)
        .json({ error: 'Datos inválidos', details: z.treeifyError(validation.error) });
    }

    const team = await prisma.team.findUnique({ where: { id: teamId } });
    if (!team || (req.user?.role === 'AdminClub' && team.clubId !== adminClubId)) {
      return res.status(404).json({ error: 'Equipo no encontrado o sin permisos' });
    }

    const updatedTeam = await prisma.team.update({
      where: { id: teamId },
      data: validation.data,
    });

    res.status(200).json({ success: true, message: 'Equipo actualizado', data: updatedTeam });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error al actualizar el equipo' });
  }
});

// DELETE: Borrar un equipo
router.delete('/:id', verifyToken, requireAdminClub, async (req, res) => {
  try {
    const teamId = req.params.id as string;
    const adminClubId = req.user?.clubId;

    const team = await prisma.team.findUnique({ where: { id: teamId } });
    if (!team || (req.user?.role === 'AdminClub' && team.clubId !== adminClubId)) {
      return res.status(404).json({ error: 'Equipo no encontrado o sin permisos' });
    }

    await prisma.team.delete({
      where: { id: teamId },
    });

    res.status(200).json({ success: true, message: 'Equipo eliminado con éxito' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error al eliminar el equipo' });
  }
});

// POST: Confirmar / Cancelar asistencia a un partido
router.post('/matches/:matchId/availability', async (req, res) => {
  try {
    const matchId = req.params.matchId as string;
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ error: 'No autorizado' });

    // Comprobar si ya existe
    const existing = await prisma.teamMatchAvailability.findUnique({
      where: { matchId_playerId: { matchId, playerId: userId } },
    });

    if (existing) {
      await prisma.teamMatchAvailability.delete({ where: { id: existing.id } });
      return res.status(200).json({ success: true, message: 'Asistencia cancelada' });
    } else {
      await prisma.teamMatchAvailability.create({ data: { matchId, playerId: userId } });
      return res.status(200).json({ success: true, message: 'Asistencia confirmada' });
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error al actualizar asistencia' });
  }
});

export default router;

import { Router } from 'express';
import prisma from '../../db';
import { asyncHandler } from '../../http/response';
import { buildNullableClubScope } from '../../utils/auth';

const router = Router();

router.get('/', asyncHandler(async (req, res) => {
  const playerType = await prisma.userType.findUnique({
    where: {
      name: 'Player',
    },
  });

  if (!playerType) {
    return res
      .status(500)
      .json({ success: false, error: 'El rol Player no está configurado en la base de datos' });
  }

  // Filtro base: Solo queremos que devuelva jugadores (no otros admins).
  // El alcance por club lo decide el seam de utils/auth. Un usuario sin club
  // solo ve a los jugadores que tampoco pertenecen a ningún club.
  const whereClause = {
    userTypeId: playerType.id,
    ...buildNullableClubScope(req.user),
  };

  const users = await prisma.user.findMany({
    where: whereClause,
    select: {
      id: true,
      email: true,
      name: true,
      nickname: true,
      avatarUrl: true,
      surname: true,
      userTypeId: true,
      clubId: true,
      clubStatus: true,
      stats: true,
      level: true,
      birthDate: true,
      club: { select: { name: true } },
    },
  });

  res.status(200).json({ success: true, data: users });

}, 'Error al obtener los usuarios', 500));

router.get('/:id', asyncHandler(async (req, res) => {
  const { id } = req.params as { [key: string]: string };
  const user = await prisma.user.findUnique({
    where: { id: id },
    include: {
      stats: true,
      skills: true,
      teams: {
        include: {
          matches: {
            orderBy: { date: 'asc' },
          },
        },
      },
      generalAttendances: {
        include: {
          generalTraining: { select: { date: true } },
        },
      },
    },
  });
  if (!user) {
    return res.status(404).json({ success: false, error: 'Usuario no encontrado' });
  }

  // 2. Sumamos todas las micromejoras que están en estado EXPECTED
  const pendingUpdates = await prisma.playerSkillUpdate.aggregate({
    where: { playerId: id, status: 'EXPECTED' },
    _sum: {
      derechaPlano: true,
      revesPlano: true,
      topspinDerecha: true,
      topspinReves: true,
      corte: true,
      bloqueoDerecha: true,
      bloqueoReves: true,
      servicio: true,
      recepcion: true,
      movilidad: true,
      fortalezaMental: true,
      experiencia: true,
    },
  });

  // 3. Devolvemos el usuario mezclado con sus mejoras pendientes
  res.json({
    ...user,
    pendingSkills: pendingUpdates._sum, // Esto enviará un objeto con las sumas
  });

}, 'Error al obtener los usuarios', 500));

export default router;

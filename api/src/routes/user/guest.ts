import { Router } from 'express';
import prisma from '../../db';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { asyncHandler } from '../../http/response';
import { createGuestSchema } from '../../schemas/user';
import { requireAdminClub } from '../../middleware/auth.middleware';
import { resolveCurrentSeason } from '../../utils/season';

const router = Router();

const LEVEL_BASE_STATS: Record<string, number> = {
  Iniciacion: 0,
  Principiante: 20,
  Intermedio: 40,
  Avanzado: 60,
  Profesional: 80,
};

router.post('/guest', requireAdminClub, asyncHandler(async (req, res) => {
  // 👇 1. VALIDACIÓN ESTRICTA CON ZOD
  const validation = createGuestSchema.safeParse(req.body);

  if (!validation.success) {
    return res.status(400).json({ success: false, error: 'Datos de entrada inválidos',
      details: z.treeifyError(validation.error),
    });
  }

  // 👇 2. EXTRAER DATOS LIMPIOS Y SEGUROS
  const {
    name,
    surname,
    level,
    dominantHand,
    playstyle,
    elo,
    skills,
    rubberForehand,
    rubberBackhand,
  } = validation.data;
  const clubId = req.user?.clubId;

  if (!clubId) return res.status(403).json({ success: false, error: 'No tienes club asignado' });

  const currentSeason = await resolveCurrentSeason(prisma);

  const playerRole = await prisma.userType.findFirst({ where: { name: 'Player' } });

  const fakeEmail = `invitado_${Date.now()}@pingpong.local`;
  const fakePassword = await bcrypt.hash(Math.random().toString(36), 10);

  const baseSkill = LEVEL_BASE_STATS[level as string] || 0;
  const finalSkills = skills || {
    derechaPlano: baseSkill,
    revesPlano: baseSkill,
    topspinDerecha: baseSkill,
    topspinReves: baseSkill,
    corte: baseSkill,
    bloqueoDerecha: baseSkill,
    bloqueoReves: baseSkill,
    servicio: baseSkill,
    recepcion: baseSkill,
    movilidad: baseSkill,
    fortalezaMental: baseSkill,
    experiencia: baseSkill,
  };

  // 👇 3. GUARDAR EN BASE DE DATOS
  const newGuest = await prisma.user.create({
    data: {
      email: fakeEmail,
      name,
      surname: surname || '',
      userTypeId: playerRole!.id,
      clubId,
      clubStatus: 'Aprobado',
      level,
      dominantHand,
      playstyle,
      rubberForehand: rubberForehand as any,
      rubberBackhand: rubberBackhand as any,
      password: fakePassword,
      authProvider: 'LOCAL',
      active: true,
      stats: {
        create: {
          seasonId: currentSeason.id,
          elo: Number(elo),
          matchWon: 0,
          matchLost: 0,
          setWon: 0,
          setLost: 0,
          pointWon: 0,
          pointLost: 0,
          tournamentWon: 0,
          tournamentPart: 0,
        },
      },
      skills: {
        create: {
          seasonId: currentSeason.id,
          ...finalSkills,
        },
      },
    },
  });

  res.status(201).json({ success: true, data: newGuest });

}, 'Error creando la cuenta de invitado', 500));

export default router;

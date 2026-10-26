import { Router } from 'express';
import prisma from '../../db';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { asyncHandler } from '../../http/response';
import { createUserSchema, updateUserSchema } from '../../schemas/user';
import { requireAdminClub } from '../../middleware/auth.middleware';
import { resolveCurrentSeason } from '../../utils/season';
import { templateCuentaCreada } from '../../utils/emailtemplate';
import { enviarCorreoGenerico } from '../../services/email';
import { hasClubPermission } from '../../utils/auth';
import { toSafeUser } from '../../utils/safe-user';

const router = Router();

const LEVEL_BASE_STATS: Record<string, number> = {
  Iniciacion: 0,
  Principiante: 20,
  Intermedio: 40,
  Avanzado: 60,
  Profesional: 80,
};

router.post('/', requireAdminClub, asyncHandler(async (req, res) => {
  const role = req.user?.role;
  const adminClubId = req.user?.clubId;

  const validation = createUserSchema.safeParse(req.body);

  if (!validation.success) {
    return res.status(400).json({ success: false, error: 'Datos de entrada inválidos',
      details: z.treeifyError(validation.error),
    });
  }

  const {
    password,
    clubId,
    clubStatus,
    userTypeId,
    skills,
    elo,
    rubberForehand,
    rubberBackhand,
    ...userData
  } = validation.data;

  let plainPassword = password;
  let isGenerated = false;

  // Si el admin no pone contraseña, generamos una automática fuerte
  if (!plainPassword) {
    plainPassword = Math.random().toString(36).slice(-6) + 'A1*';
    isGenerated = true;
  }

  const hashedPassword = await bcrypt.hash(plainPassword, 10);

  let finalClubId = clubId;
  let finalClubStatus = clubStatus || 'Registrado';

  if (role === 'AdminClub') {
    if (!adminClubId) {
      return res.status(403).json({ success: false, error: 'No tienes un club asignado para añadir jugadores' });
    }
    finalClubId = adminClubId;
    finalClubStatus = 'Aprobado';
  }

  const currentSeason = await resolveCurrentSeason(prisma);

  // Si no pasan rol, asumimos Player por defecto
  // Solo el SuperAdmin asigna roles: un AdminClub siempre crea jugadores (Player).
  let finalUserTypeId = role === 'SuperAdmin' ? userTypeId : undefined;
  if (!finalUserTypeId) {
    const playerRole = await prisma.userType.findFirst({ where: { name: 'Player' } });
    finalUserTypeId = playerRole?.id;
  }

  // Le damos unos stats base para que no salga con el radar vacío
  const baseSkill = LEVEL_BASE_STATS[userData.level as string] || 0;

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

  const newUser = await prisma.user.create({
    data: {
      ...userData,
      email: userData.email.toLowerCase().trim(),
      password: hashedPassword,
      forcePasswordChange: isGenerated,
      authProvider: 'LOCAL',
      clubId: finalClubId,
      clubStatus: finalClubStatus as any,
      active: true, // Activado directamente porque lo crea el coach
      userTypeId: finalUserTypeId as string,
      stats: { create: { seasonId: currentSeason.id, elo: elo } },
      rubberForehand: rubberForehand as any,
      rubberBackhand: rubberBackhand as any,
      skills: {
        create: {
          seasonId: currentSeason.id,
          ...finalSkills,
        },
      },
    },
    select: {
      id: true,
      email: true,
      name: true,
      surname: true,
      nickname: true,
      clubId: true,
      clubStatus: true,
    },
  });

  if (isGenerated) {
    enviarCorreoGenerico(
      userData.email.toLowerCase(),
      'Tu cuenta del club ha sido creada',
      templateCuentaCreada(userData.name, userData.email.toLowerCase(), plainPassword),
    ).catch(console.error);
  }

  res.status(201).json({ success: true, data: newUser });

}, 'Error al crear el usuario', 500));

router.put('/:id', requireAdminClub, asyncHandler(async (req, res) => {
  const id = req.params.id as string;
  const role = req.user?.role;
  const adminClubId = req.user?.clubId;

  // 1. Buscamos al usuario que intentan editar
  const userToEdit = await prisma.user.findUnique({ where: { id } });

  if (!userToEdit) {
    return res.status(404).json({ success: false, error: 'Usuario no encontrado' });
  }

  // 2. Filtro de Club: El presidente solo puede editar a los suyos
  if (role === 'AdminClub' && userToEdit.clubId !== adminClubId) {
    return res
      .status(403)
      .json({ success: false, error: 'No tienes permiso para editar jugadores de otros clubes' });
  }

  const validation = updateUserSchema.safeParse(req.body);

  if (!validation.success) {
    res.status(400).json({ success: false, error: 'Datos de entrada inválidos',
      details: z.treeifyError(validation.error),
    });
    return;
  }

  const { elo, skills, newPassword, confirmPassword, ...dataToUpdate } = validation.data;

  // 3. Prevenir que un AdminClub cambie de club a un jugador a la fuerza por aquí
  if (role === 'AdminClub') {
    delete dataToUpdate.clubId;
    delete dataToUpdate.clubStatus;
    delete dataToUpdate.userTypeId; // el rol solo lo cambia el SuperAdmin
  }

  // Si viene contraseña nueva, la procesamos
  if (newPassword) {
    dataToUpdate.password = await bcrypt.hash(newPassword, 10);
  }

  // Limpiamos los null de los strings que Prisma no quiera
  if (dataToUpdate.email) dataToUpdate.email = dataToUpdate.email.toLowerCase().trim();

  const currentSeason = await resolveCurrentSeason(prisma);

  // 4. Actualizamos usuario, stats (elo) y skills
  const updatedUser = await prisma.user.update({
    where: { id: id },
    data: {
      ...dataToUpdate,
      ...(elo !== undefined && {
        stats: {
          upsert: {
            where: {
              userId_seasonId: { userId: id, seasonId: currentSeason.id },
            },
            create: { seasonId: currentSeason.id, elo: elo },
            update: { elo: elo },
          },
        },
      }),
      // 👇 AÑADIDO: Si envían 'skills' desde el admin, forzamos la actualización de sus stats puros
      ...(skills && {
        skills: {
          upsert: {
            where: {
              userId_seasonId: { userId: id, seasonId: currentSeason.id },
            },
            create: { seasonId: currentSeason.id, ...skills },
            update: skills, // Sobreescribimos con lo que diga el admin
          },
        },
      }),
    },
    include: { stats: true, skills: true },
  });

  res.status(200).json({ success: true, data: toSafeUser(updatedUser) });

}, 'Error al actualizar el usuario', 500));

router.delete('/:id', requireAdminClub, asyncHandler(async (req, res) => {
  const id = req.params.id as string;
  const role = req.user?.role;
  const adminClubId = req.user?.clubId;

  // 1. Buscamos al usuario que intentan borrar
  const userToDelete = await prisma.user.findUnique({ where: { id } });

  if (!userToDelete) {
    return res.status(404).json({ success: false, error: 'Usuario no encontrado' });
  }

  // 2. Filtro de Club: El presidente solo puede borrar a los suyos
  if (role === 'AdminClub' && userToDelete.clubId !== adminClubId) {
    return res
      .status(403)
      .json({ success: false, error: 'No tienes permiso para borrar jugadores de otros clubes' });
  }

  await prisma.user.delete({
    where: { id: id },
  });

  res.status(204).send();

}, 'Error al borrar el usuario', 500));

export default router;

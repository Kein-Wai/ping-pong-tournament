import { Router } from 'express';
import prisma from '../../db';
import bcrypt from 'bcryptjs';
import { asyncHandler } from '../../http/response';
import { updateProfileSchema } from '../../schemas/user';
import { toSafeUser } from '../../utils/safe-user';

const router = Router();

router.get('/me', asyncHandler(async (req, res) => {
  const userId = req.user?.id;
  if (!userId) return res.status(401).json({ success: false, error: 'No autorizado' });

  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: {
      userType: true,
      stats: true,
      skills: true,
    },
  });

  if (!user) return res.status(404).json({ success: false, error: 'Usuario no encontrado' });

  // Sumamos las mejoras pendientes igual que hacíamos en el GET /:id
  const pendingUpdates = await prisma.playerSkillUpdate.aggregate({
    where: { playerId: userId, status: 'EXPECTED' },
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

  res.status(200).json({
    success: true,
    data: {
      ...toSafeUser(user),
      pendingSkills: pendingUpdates._sum,
    },
  });

}, 'Error al obtener el perfil', 500));

router.put('/me', asyncHandler(async (req, res) => {
  const userId = req.user?.id;

  if (!userId) {
    res.status(401).json({ success: false, error: 'Usuario no autenticado' });
    return;
  }

  const validation = updateProfileSchema.safeParse(req.body);
  if (!validation.success) {
    res.status(400).json({ success: false, error: 'Datos inválidos', details: validation.error.format() });
    return;
  }

  const data = validation.data;

  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) {
    res.status(404).json({ success: false, error: 'Usuario no encontrado' });
    return;
  }

  const updateData: any = {};
  if (data.name) updateData.name = data.name;
  if (data.surname) updateData.surname = data.surname;
  if (req.body.secondSurname) updateData.secondSurname = req.body.secondSurname;
  if (req.body.nickname) updateData.nickname = req.body.nickname;
  if (req.body.avatarUrl) updateData.avatarUrl = req.body.avatarUrl;
  if (data.dominantHand !== undefined) updateData.dominantHand = data.dominantHand;
  if (data.playstyle !== undefined) updateData.playstyle = data.playstyle;
  if (data.birthDate !== undefined) updateData.birthDate = data.birthDate;
  if (data.rubberForehand !== undefined) updateData.rubberForehand = data.rubberForehand;
  if (data.rubberBackhand !== undefined) updateData.rubberBackhand = data.rubberBackhand;

  if (data.newPassword) {
    if (user.password) {
      if (!data.currentPassword) {
        res.status(400).json({ success: false, error: 'Debes proporcionar tu contraseña actual para cambiarla' });
        return;
      }

      const isMatch = await bcrypt.compare(data.currentPassword, user.password);
      if (!isMatch) {
        res.status(401).json({ success: false, error: 'La contraseña actual es incorrecta' });
        return;
      }
    }

    updateData.password = await bcrypt.hash(data.newPassword, 10);
    updateData.forcePasswordChange = false;
  }

  const updatedProfile = await prisma.user.update({
    where: { id: userId },
    data: updateData,
    select: {
      id: true,
      email: true,
      name: true,
      surname: true,
      secondSurname: true,
      nickname: true,
      dominantHand: true,
      playstyle: true,
      birthDate: true,
    },
  });

  res.status(200).json({
    message: 'Perfil actualizado con éxito',
    user: updatedProfile,
  });

}, 'Error interno del servidor', 500));

export default router;

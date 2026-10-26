import { Router } from 'express';
import prisma from '../../db';
import bcrypt from 'bcryptjs';
import { asyncHandler, sendData, sendError, sendMessage } from '../../http/response';
import { updateProfileSchema } from '../../schemas/user';
import { toSafeUser } from '../../utils/safe-user';

const router = Router();

router.get('/me', asyncHandler(async (req, res) => {
  const userId = req.user?.id;
  if (!userId) return sendError(res, 401, 'No autorizado');

  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: {
      userType: true,
      stats: true,
      skills: true,
    },
  });

  if (!user) return sendError(res, 404, 'Usuario no encontrado');

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

  sendData(res, {
      ...toSafeUser(user),
      pendingSkills: pendingUpdates._sum,
    });

}, 'Error al obtener el perfil', 500));

router.put('/me', asyncHandler(async (req, res) => {
  const userId = req.user?.id;

  if (!userId) {
    sendError(res, 401, 'Usuario no autenticado');
    return;
  }

  const validation = updateProfileSchema.safeParse(req.body);
  if (!validation.success) {
    sendError(res, 400, 'Datos inválidos', validation.error.format());
    return;
  }

  const data = validation.data;

  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) {
    sendError(res, 404, 'Usuario no encontrado');
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
        sendError(res, 400, 'Debes proporcionar tu contraseña actual para cambiarla');
        return;
      }

      const isMatch = await bcrypt.compare(data.currentPassword, user.password);
      if (!isMatch) {
        sendError(res, 401, 'La contraseña actual es incorrecta');
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

  sendMessage(res, 'Perfil actualizado con éxito', 200, updatedProfile);

}, 'Error interno del servidor', 500));

export default router;

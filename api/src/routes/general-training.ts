import { Router } from 'express';
import prisma from '../db';
import { z } from 'zod';
import { requireAdminClub } from '../middleware/auth.middleware';
import { buildClubScope, hasClubPermission, isOutOfClubScope } from '../utils/auth';
import {
  createScheduleSchema,
  createGeneralTrainingSchema,
  bulkAttendanceSchema,
  updateScheduleSchema,
  updateGeneralTrainingSchema,
} from '../schemas/generalTraining';
import { resolveCurrentSeason } from '../utils/season';
import { calculateConditionalGrowth } from '../utils/skills';
import { asyncHandler } from '../http/response';

const router = Router();

// ==========================================
// 1. HORARIOS FIJOS (Schedules)
// ==========================================
router.get('/schedules', asyncHandler(async (req, res) => {
  // Sin club asignado no puede ver los horarios de ningún club.
  if (isOutOfClubScope(req.user)) {
    return res.status(200).json({ success: true, data: [] });
  }

  const schedules = await prisma.generalTrainingSchedule.findMany({
    where: buildClubScope(req.user),
    orderBy: { startTime: 'asc' },
  });
  res.status(200).json({ success: true, data: schedules });

}, 'Error al obtener horarios', 500));

router.post('/schedules', requireAdminClub, asyncHandler(async (req, res) => {
  const clubId = req.user?.clubId!;
  if (!clubId)
    return res.status(403).json({ success: false, error: 'No tienes un club asignado para crear horarios.' });

  const validation = createScheduleSchema.safeParse(req.body);
  if (!validation.success)
    return res
      .status(400)
      .json({ success: false, error: 'Datos inválidos', details: z.treeifyError(validation.error) });

  const newSchedule = await prisma.generalTrainingSchedule.create({
    data: { ...validation.data, clubId },
  });
  res.status(201).json({ success: true, data: newSchedule });

}, 'Error al crear el horario', 500));

router.put('/schedules/:id', requireAdminClub, asyncHandler(async (req, res) => {
  const clubId = req.user?.clubId!;
  const scheduleId = req.params.id as string;

  const validation = updateScheduleSchema.safeParse(req.body);
  if (!validation.success)
    return res
      .status(400)
      .json({ success: false, error: 'Datos inválidos', details: z.treeifyError(validation.error) });

  const schedule = await prisma.generalTrainingSchedule.findUnique({ where: { id: scheduleId } });
  if (!schedule || !hasClubPermission(req.user, schedule.clubId)) {
    return res.status(404).json({ success: false, error: 'Horario no encontrado' });
  }

  const updatedSchedule = await prisma.generalTrainingSchedule.update({
    where: { id: scheduleId },
    data: validation.data,
  });

  res.status(200).json({ success: true, data: updatedSchedule });

}, 'Error al actualizar el horario', 500));

router.delete('/schedules/:id', requireAdminClub, asyncHandler(async (req, res) => {
  const clubId = req.user?.clubId!;
  const scheduleId = req.params.id as string;

  const schedule = await prisma.generalTrainingSchedule.findUnique({ where: { id: scheduleId } });
  if (!schedule || !hasClubPermission(req.user, schedule.clubId)) {
    return res.status(404).json({ success: false, error: 'Horario no encontrado' });
  }

  await prisma.generalTrainingSchedule.delete({ where: { id: scheduleId } });
  res.status(200).json({ success: true, message: 'Horario eliminado' });

}, 'Error al eliminar el horario. Puede que esté en uso por algún entrenamiento.', 500));

// ==========================================
// 2. CALENDARIO DE ENTRENAMIENTOS GENERALES
// ==========================================
router.get('/', asyncHandler(async (req, res) => {
  const trainings = await prisma.generalTraining.findMany({
    where: buildClubScope(req.user),
    include: {
      schedule: true,
      template: true,
      attendances: true,
      _count: { select: { attendances: true } },
    },
    orderBy: { date: 'desc' },
  });
  res.status(200).json({ success: true, data: trainings });

}, 'Error al obtener los entrenamientos', 500));

router.post('/', requireAdminClub, asyncHandler(async (req, res) => {
  const clubId = req.user?.clubId!;
  if (!clubId) return res.status(403).json({ success: false, error: 'No tienes un club asignado.' });

  const validation = createGeneralTrainingSchema.safeParse(req.body);
  if (!validation.success)
    return res
      .status(400)
      .json({ success: false, error: 'Datos inválidos', details: z.treeifyError(validation.error) });

  const { description, startDate, endDate, scheduleId, skillsToTrain } = validation.data;

  const schedule = await prisma.generalTrainingSchedule.findUnique({ where: { id: scheduleId } });
  if (!schedule) return res.status(404).json({ success: false, error: 'Horario no encontrado' });

  // Rango de fechas exacto
  const datesToCreate: Date[] = [];
  let currentDate = new Date(startDate);
  const end = new Date(endDate);
  end.setHours(23, 59, 59, 999);

  while (currentDate <= end) {
    // getDay(): 0 = Domingo, 1 = Lunes...
    if (schedule.daysOfWeek.includes(currentDate.getDay())) {
      datesToCreate.push(new Date(currentDate));
    }
    currentDate.setDate(currentDate.getDate() + 1);
  }

  if (datesToCreate.length === 0) {
    return res.status(400).json({ success: false, error: 'El rango de fechas no contiene ninguno de los días asignados a este horario',
    });
  }

  const currentSeason = await resolveCurrentSeason(prisma);
  await prisma.$transaction(async (tx) => {
    const template = await tx.skillUpdateTemplate.create({
      data: {
        name: `Template General - ${new Date(startDate).toLocaleDateString()}`,
        sourceType: 'EntrenamientoGeneral',
        ...skillsToTrain,
      },
    });

    const trainingsData = datesToCreate.map((date) => ({
      clubId,
      seasonId: currentSeason.id,
      description,
      date: date,
      scheduleId,
      templateId: template.id,
    }));

    await tx.generalTraining.createMany({ data: trainingsData });
  });

  res
    .status(201)
    .json({ success: true, message: `Se han programado ${datesToCreate.length} sesiones.` });

}, 'Error al programar el entrenamiento', 500));

router.put('/:id', requireAdminClub, asyncHandler(async (req, res) => {
  const clubId = req.user?.clubId!;
  const trainingId = req.params.id as string;

  const validation = updateGeneralTrainingSchema.safeParse(req.body);
  if (!validation.success)
    return res
      .status(400)
      .json({ success: false, error: 'Datos inválidos', details: z.treeifyError(validation.error) });

  const training = await prisma.generalTraining.findUnique({ where: { id: trainingId } });
  if (!training || !hasClubPermission(req.user, training.clubId)) {
    return res.status(404).json({ success: false, error: 'Entrenamiento no encontrado' });
  }

  const { description, scheduleId, skillsToTrain } = validation.data;

  const updatedTraining = await prisma.$transaction(async (tx) => {
    if (skillsToTrain) {
      await tx.skillUpdateTemplate.update({
        where: { id: training.templateId },
        data: skillsToTrain,
      });
    }

    return await tx.generalTraining.update({
      where: { id: trainingId },
      data: { description, scheduleId },
      include: { schedule: true, template: true },
    });
  });

  res.status(200).json({ success: true, data: updatedTraining });

}, 'Error al actualizar el entrenamiento', 500));

router.delete('/:id', requireAdminClub, asyncHandler(async (req, res) => {
  const clubId = req.user?.clubId!;
  const trainingId = req.params.id as string;

  const training = await prisma.generalTraining.findUnique({ where: { id: trainingId } });
  if (!training || !hasClubPermission(req.user, training.clubId)) {
    return res.status(404).json({ success: false, error: 'Entrenamiento no encontrado' });
  }

  await prisma.$transaction(async (tx) => {
    await tx.generalTraining.delete({ where: { id: trainingId } });
    await tx.skillUpdateTemplate.delete({ where: { id: training.templateId } });
  });

  res.status(200).json({ success: true, message: 'Entrenamiento eliminado con éxito' });

}, 'Error al eliminar el entrenamiento', 500));

// ==========================================
// 3. ASISTENCIA EN BLOQUE (BULK SYNC)
// ==========================================
router.put('/:id/attendance/bulk', requireAdminClub, asyncHandler(async (req, res) => {
  const trainingId = req.params.id as string;
  const clubId = req.user?.clubId!;

  const validation = bulkAttendanceSchema.safeParse(req.body);
  if (!validation.success) return res.status(400).json({ success: false, error: 'Datos inválidos' });

  const { playerIds } = validation.data;

  const training = await prisma.generalTraining.findUnique({
    where: { id: trainingId },
    include: { template: true },
  });

  if (!training || !hasClubPermission(req.user, training.clubId)) {
    return res.status(404).json({ success: false, error: 'Entrenamiento no encontrado' });
  }

  const tpl = training.template;

  const existingAttendances = await prisma.generalTrainingAttendance.findMany({
    where: { generalTrainingId: trainingId },
  });
  const existingIds = existingAttendances.map((a) => a.playerId);

  const playersToAdd = playerIds.filter((id) => !existingIds.includes(id));
  const playersToRemove = existingIds.filter((id) => !playerIds.includes(id));

  const playersSkillsDB = await prisma.playerSkills.findMany({
    where: { userId: { in: playersToAdd } },
  });

  // Casteo a any seguro
  const getSkillLevel = (pId: string, skill: string) => {
    const pSkill = playersSkillsDB.find((p) => p.userId === pId) as any;
    return pSkill && pSkill[skill] ? Number(pSkill[skill]) : 0;
  };

  await prisma.$transaction(async (tx) => {
    if (playersToRemove.length > 0) {
      await tx.generalTrainingAttendance.deleteMany({
        where: { generalTrainingId: trainingId, playerId: { in: playersToRemove } },
      });
      await tx.playerSkillUpdate.deleteMany({
        where: { generalTrainingId: trainingId, playerId: { in: playersToRemove } },
      });
    }

    if (playersToAdd.length > 0) {
      const attendanceData = playersToAdd.map((pId) => ({
        generalTrainingId: trainingId,
        clubId: training.clubId, // Usamos el del training por si es SuperAdmin
        playerId: pId,
        attended: true,
      }));
      await tx.generalTrainingAttendance.createMany({ data: attendanceData });

      const updatesData = playersToAdd.map((pId) => ({
        playerId: pId,
        sourceType: 'EntrenamientoGeneral' as any,
        generalTrainingId: trainingId,
        status: 'EXPECTED' as any,
        derechaPlano: calculateConditionalGrowth(
          tpl.derechaPlano,
          getSkillLevel(pId, 'derechaPlano'),
        ),
        revesPlano: calculateConditionalGrowth(tpl.revesPlano, getSkillLevel(pId, 'revesPlano')),
        topspinDerecha: calculateConditionalGrowth(
          tpl.topspinDerecha,
          getSkillLevel(pId, 'topspinDerecha'),
        ),
        topspinReves: calculateConditionalGrowth(
          tpl.topspinReves,
          getSkillLevel(pId, 'topspinReves'),
        ),
        corte: calculateConditionalGrowth(tpl.corte, getSkillLevel(pId, 'corte')),
        bloqueoDerecha: calculateConditionalGrowth(
          tpl.bloqueoDerecha,
          getSkillLevel(pId, 'bloqueoDerecha'),
        ),
        bloqueoReves: calculateConditionalGrowth(
          tpl.bloqueoReves,
          getSkillLevel(pId, 'bloqueoReves'),
        ),
        servicio: calculateConditionalGrowth(tpl.servicio, getSkillLevel(pId, 'servicio')),
        recepcion: calculateConditionalGrowth(tpl.recepcion, getSkillLevel(pId, 'recepcion')),
        movilidad: calculateConditionalGrowth(tpl.movilidad, getSkillLevel(pId, 'movilidad')),
        fortalezaMental: calculateConditionalGrowth(
          tpl.fortalezaMental,
          getSkillLevel(pId, 'fortalezaMental'),
        ),
        experiencia: calculateConditionalGrowth(
          tpl.experiencia,
          getSkillLevel(pId, 'experiencia'),
        ),
      }));

      await tx.playerSkillUpdate.createMany({ data: updatesData });
    }
  });

  res.status(200).json({ success: true, message: 'Asistencia sincronizada correctamente' });

}, 'Error procesando sincronización en bloque', 500));

export default router;

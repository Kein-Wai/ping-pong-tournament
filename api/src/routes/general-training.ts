import { Router } from 'express';
import prisma from '../db';
import { z } from 'zod';
import { requireAdminClub } from '../middleware/auth.middleware';
import {
  createScheduleSchema,
  createGeneralTrainingSchema,
  bulkAttendanceSchema,
  updateScheduleSchema,
  updateGeneralTrainingSchema,
} from '../schemas/generalTraining';
import { getCurrentSeason } from '../utils/season';

const router = Router();

// Helper para evitar crasheos si entra un SuperAdmin (clubId = null)
const getClubWhere = (req: any) => {
  if (req.user?.role === 'SuperAdmin') return {}; // El SuperAdmin lo ve todo
  return { clubId: req.user?.clubId };
};

// Tu fórmula maestra de rendimientos decrecientes
const calculateGrowth = (isTrained: boolean, currentStat: number): number => {
  if (!isTrained) return 0;
  if (currentStat < 20) return 0.25;
  if (currentStat < 40) return 0.2;
  if (currentStat < 60) return 0.15;
  if (currentStat < 80) return 0.07;
  return 0.01;
};

// ==========================================
// 1. HORARIOS FIJOS (Schedules)
// ==========================================
router.get('/schedules', requireAdminClub, async (req, res) => {
  try {
    const schedules = await prisma.generalTrainingSchedule.findMany({
      where: getClubWhere(req),
      orderBy: { startTime: 'asc' },
    });
    res.status(200).json({ success: true, data: schedules });
  } catch (error) {
    console.error('[GET /schedules]', error);
    res.status(500).json({ error: 'Error al obtener horarios' });
  }
});

router.post('/schedules', requireAdminClub, async (req, res) => {
  try {
    const clubId = req.user?.clubId!;
    if (!clubId)
      return res.status(403).json({ error: 'No tienes un club asignado para crear horarios.' });

    const validation = createScheduleSchema.safeParse(req.body);
    if (!validation.success)
      return res
        .status(400)
        .json({ error: 'Datos inválidos', details: z.treeifyError(validation.error) });

    const newSchedule = await prisma.generalTrainingSchedule.create({
      data: { ...validation.data, clubId },
    });
    res.status(201).json({ success: true, data: newSchedule });
  } catch (error) {
    console.error('[POST /schedules]', error);
    res.status(500).json({ error: 'Error al crear el horario' });
  }
});

router.put('/schedules/:id', requireAdminClub, async (req, res) => {
  try {
    const clubId = req.user?.clubId!;
    const scheduleId = req.params.id as string;

    const validation = updateScheduleSchema.safeParse(req.body);
    if (!validation.success)
      return res
        .status(400)
        .json({ error: 'Datos inválidos', details: z.treeifyError(validation.error) });

    const schedule = await prisma.generalTrainingSchedule.findUnique({ where: { id: scheduleId } });
    if (!schedule || (req.user?.role !== 'SuperAdmin' && schedule.clubId !== clubId)) {
      return res.status(404).json({ error: 'Horario no encontrado' });
    }

    const updatedSchedule = await prisma.generalTrainingSchedule.update({
      where: { id: scheduleId },
      data: validation.data,
    });

    res.status(200).json({ success: true, data: updatedSchedule });
  } catch (error) {
    console.error('[PUT /schedules/:id]', error);
    res.status(500).json({ error: 'Error al actualizar el horario' });
  }
});

router.delete('/schedules/:id', requireAdminClub, async (req, res) => {
  try {
    const clubId = req.user?.clubId!;
    const scheduleId = req.params.id as string;

    const schedule = await prisma.generalTrainingSchedule.findUnique({ where: { id: scheduleId } });
    if (!schedule || (req.user?.role !== 'SuperAdmin' && schedule.clubId !== clubId)) {
      return res.status(404).json({ error: 'Horario no encontrado' });
    }

    await prisma.generalTrainingSchedule.delete({ where: { id: scheduleId } });
    res.status(200).json({ success: true, message: 'Horario eliminado' });
  } catch (error) {
    console.error('[DELETE /schedules/:id]', error);
    res.status(500).json({
      error: 'Error al eliminar el horario. Puede que esté en uso por algún entrenamiento.',
    });
  }
});

// ==========================================
// 2. CALENDARIO DE ENTRENAMIENTOS GENERALES
// ==========================================
router.get('/', requireAdminClub, async (req, res) => {
  try {
    const trainings = await prisma.generalTraining.findMany({
      where: getClubWhere(req),
      include: {
        schedule: true,
        template: true,
        attendances: true,
        _count: { select: { attendances: true } },
      },
      orderBy: { date: 'desc' },
    });
    res.status(200).json({ success: true, data: trainings });
  } catch (error) {
    console.error('[GET /trainings]', error);
    res.status(500).json({ error: 'Error al obtener los entrenamientos' });
  }
});

router.post('/', requireAdminClub, async (req, res) => {
  try {
    const clubId = req.user?.clubId!;
    if (!clubId) return res.status(403).json({ error: 'No tienes un club asignado.' });

    const validation = createGeneralTrainingSchema.safeParse(req.body);
    if (!validation.success)
      return res
        .status(400)
        .json({ error: 'Datos inválidos', details: z.treeifyError(validation.error) });

    const { description, startDate, endDate, scheduleId, skillsToTrain } = validation.data;

    const schedule = await prisma.generalTrainingSchedule.findUnique({ where: { id: scheduleId } });
    if (!schedule) return res.status(404).json({ error: 'Horario no encontrado' });

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
      return res.status(400).json({
        error: 'El rango de fechas no contiene ninguno de los días asignados a este horario',
      });
    }

    const currentSeason = await getCurrentSeason(prisma);
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
  } catch (error) {
    console.error('[POST /trainings]', error);
    res.status(500).json({ error: 'Error al programar el entrenamiento' });
  }
});

router.put('/:id', requireAdminClub, async (req, res) => {
  try {
    const clubId = req.user?.clubId!;
    const trainingId = req.params.id as string;

    const validation = updateGeneralTrainingSchema.safeParse(req.body);
    if (!validation.success)
      return res
        .status(400)
        .json({ error: 'Datos inválidos', details: z.treeifyError(validation.error) });

    const training = await prisma.generalTraining.findUnique({ where: { id: trainingId } });
    if (!training || (req.user?.role !== 'SuperAdmin' && training.clubId !== clubId)) {
      return res.status(404).json({ error: 'Entrenamiento no encontrado' });
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
  } catch (error) {
    console.error('[PUT /trainings/:id]', error);
    res.status(500).json({ error: 'Error al actualizar el entrenamiento' });
  }
});

router.delete('/:id', requireAdminClub, async (req, res) => {
  try {
    const clubId = req.user?.clubId!;
    const trainingId = req.params.id as string;

    const training = await prisma.generalTraining.findUnique({ where: { id: trainingId } });
    if (!training || (req.user?.role !== 'SuperAdmin' && training.clubId !== clubId)) {
      return res.status(404).json({ error: 'Entrenamiento no encontrado' });
    }

    await prisma.$transaction(async (tx) => {
      await tx.generalTraining.delete({ where: { id: trainingId } });
      await tx.skillUpdateTemplate.delete({ where: { id: training.templateId } });
    });

    res.status(200).json({ success: true, message: 'Entrenamiento eliminado con éxito' });
  } catch (error) {
    console.error('[DELETE /trainings/:id]', error);
    res.status(500).json({ error: 'Error al eliminar el entrenamiento' });
  }
});

// ==========================================
// 3. ASISTENCIA EN BLOQUE (BULK SYNC)
// ==========================================
router.put('/:id/attendance/bulk', requireAdminClub, async (req, res) => {
  try {
    const trainingId = req.params.id as string;
    const clubId = req.user?.clubId!;

    const validation = bulkAttendanceSchema.safeParse(req.body);
    if (!validation.success) return res.status(400).json({ error: 'Datos inválidos' });

    const { playerIds } = validation.data;

    const training = await prisma.generalTraining.findUnique({
      where: { id: trainingId },
      include: { template: true },
    });

    if (!training || (req.user?.role !== 'SuperAdmin' && training.clubId !== clubId)) {
      return res.status(404).json({ error: 'Entrenamiento no encontrado' });
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
          derechaPlano: calculateGrowth(tpl.derechaPlano, getSkillLevel(pId, 'derechaPlano')),
          revesPlano: calculateGrowth(tpl.revesPlano, getSkillLevel(pId, 'revesPlano')),
          topspinDerecha: calculateGrowth(tpl.topspinDerecha, getSkillLevel(pId, 'topspinDerecha')),
          topspinReves: calculateGrowth(tpl.topspinReves, getSkillLevel(pId, 'topspinReves')),
          corte: calculateGrowth(tpl.corte, getSkillLevel(pId, 'corte')),
          bloqueoDerecha: calculateGrowth(tpl.bloqueoDerecha, getSkillLevel(pId, 'bloqueoDerecha')),
          bloqueoReves: calculateGrowth(tpl.bloqueoReves, getSkillLevel(pId, 'bloqueoReves')),
          servicio: calculateGrowth(tpl.servicio, getSkillLevel(pId, 'servicio')),
          recepcion: calculateGrowth(tpl.recepcion, getSkillLevel(pId, 'recepcion')),
          movilidad: calculateGrowth(tpl.movilidad, getSkillLevel(pId, 'movilidad')),
          fortalezaMental: calculateGrowth(
            tpl.fortalezaMental,
            getSkillLevel(pId, 'fortalezaMental'),
          ),
          experiencia: calculateGrowth(tpl.experiencia, getSkillLevel(pId, 'experiencia')),
        }));

        await tx.playerSkillUpdate.createMany({ data: updatesData });
      }
    });

    res.status(200).json({ success: true, message: 'Asistencia sincronizada correctamente' });
  } catch (error) {
    console.error('[PUT /attendance/bulk]', error);
    res.status(500).json({ error: 'Error procesando sincronización en bloque' });
  }
});

export default router;

import { Router } from 'express';
import bcrypt from 'bcryptjs';
import prisma from '../db';
import {
  createUserSchema,
  updateUserSchema,
  updateProfileSchema,
  createGuestSchema,
} from '../schemas/user';
import { z } from 'zod';
import { requireAdminClub } from '../middleware/auth.middleware';
import { getCurrentSeason } from '../utils/season';
import { templateCuentaCreada } from '../utils/emailtemplate';
import { enviarCorreoGenerico } from '../services/email';
const router = Router();

const LEVEL_BASE_STATS: Record<string, number> = {
  Iniciacion: 0,
  Principiante: 20,
  Intermedio: 40,
  Avanzado: 60,
  Profesional: 80,
};

router.get('/', async (req, res) => {
  try {
    const role = req.user?.role;
    const clubId = req.user?.clubId;

    const playerType = await prisma.userType.findUnique({
      where: {
        name: 'Player',
      },
    });

    if (!playerType) {
      return res
        .status(500)
        .json({ error: 'El rol Player no está configurado en la base de datos' });
    }

    // Filtro base: Solo queremos que devuelva jugadores (no otros admins)
    let whereClause: any = {
      userTypeId: playerType.id,
    };

    // Filtro de Club:
    if (role === 'SuperAdmin') {
      // El SuperAdmin puede ver absolutamente a todos los jugadores del sistema
    } else if (role === 'AdminClub') {
      // El AdminClub solo puede ver a los jugadores que pertenecen a SU club
      whereClause.clubId = clubId;
    } else {
      // Un jugador normal solo debería poder ver el ranking/lista de la gente de su propio club
      whereClause.clubId = clubId;
    }

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

    res.json(users);
  } catch (error) {
    console.error('DAME EL ERROR', error);
    res.status(500).json({ error: 'Error al obtener los usuarios' });
  }
});

router.post('/', requireAdminClub, async (req, res) => {
  try {
    const role = req.user?.role;
    const adminClubId = req.user?.clubId;

    const validation = createUserSchema.safeParse(req.body);

    if (!validation.success) {
      return res.status(400).json({
        error: 'Datos de entrada inválidos',
        details: z.treeifyError(validation.error),
      });
    }

    const { password, clubId, clubStatus, userTypeId, skills, elo, ...userData } = validation.data;

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
        return res.status(403).json({ error: 'No tienes un club asignado para añadir jugadores' });
      }
      finalClubId = adminClubId;
      finalClubStatus = 'Aprobado';
    }

    const currentSeason = await getCurrentSeason(prisma);

    // Si no pasan rol, asumimos Player por defecto
    let finalUserTypeId = userTypeId;
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
        password: hashedPassword,
        forcePasswordChange: isGenerated,
        authProvider: 'LOCAL',
        clubId: finalClubId,
        clubStatus: finalClubStatus as any,
        active: true, // Activado directamente porque lo crea el coach
        userTypeId: finalUserTypeId as string,
        stats: { create: { seasonId: currentSeason.id, elo: elo } },
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

    res.status(201).json(newUser);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error al crear el usuario' });
  }
});

router.put('/me', async (req, res) => {
  try {
    const userId = req.user?.id;

    if (!userId) {
      res.status(401).json({ error: 'Usuario no autenticado' });
      return;
    }

    const validation = updateProfileSchema.safeParse(req.body);
    if (!validation.success) {
      res.status(400).json({ error: 'Datos inválidos', details: validation.error.format() });
      return;
    }

    const data = validation.data;

    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      res.status(404).json({ error: 'Usuario no encontrado' });
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

    if (data.newPassword) {
      if (user.password) {
        if (!data.currentPassword) {
          res.status(400).json({ error: 'Debes proporcionar tu contraseña actual para cambiarla' });
          return;
        }

        const isMatch = await bcrypt.compare(data.currentPassword, user.password);
        if (!isMatch) {
          res.status(401).json({ error: 'La contraseña actual es incorrecta' });
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
  } catch (error) {
    console.error('Error al actualizar perfil:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
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
      return res.status(404).json({ error: 'Usuario no encontrado' });
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
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error al obtener los usuarios' });
  }
});

router.put('/:id', requireAdminClub, async (req, res) => {
  try {
    const id = req.params.id as string;
    const role = req.user?.role;
    const adminClubId = req.user?.clubId;

    // 1. Buscamos al usuario que intentan editar
    const userToEdit = await prisma.user.findUnique({ where: { id } });

    if (!userToEdit) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }

    // 2. Filtro de Club: El presidente solo puede editar a los suyos
    if (role === 'AdminClub' && userToEdit.clubId !== adminClubId) {
      return res
        .status(403)
        .json({ error: 'No tienes permiso para editar jugadores de otros clubes' });
    }

    const validation = updateUserSchema.safeParse(req.body);

    if (!validation.success) {
      res.status(400).json({
        error: 'Datos de entrada inválidos',
        details: z.treeifyError(validation.error),
      });
      return;
    }

    const { elo, skills, ...dataToUpdate } = validation.data;

    // 3. Prevenir que un AdminClub cambie de club a un jugador a la fuerza por aquí
    if (role === 'AdminClub') {
      delete dataToUpdate.clubId;
      delete dataToUpdate.clubStatus;
    }
    const currentSeason = await getCurrentSeason(prisma);

    const updatedUser = await prisma.user.update({
      where: { id: id },
      data: {
        ...dataToUpdate,
        ...(elo !== undefined && {
          stats: {
            upsert: {
              // 👇 Usamos la clave compuesta
              where: {
                userId_seasonId: {
                  userId: id,
                  seasonId: currentSeason.id,
                },
              },
              create: { seasonId: currentSeason.id, elo: elo },
              update: { elo: elo },
            },
          },
        }),
      },
      include: { stats: true },
    });

    res.json(updatedUser);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error al actualizar el usuario' });
  }
});

router.delete('/:id', requireAdminClub, async (req, res) => {
  try {
    const id = req.params.id as string;
    const role = req.user?.role;
    const adminClubId = req.user?.clubId;

    // 1. Buscamos al usuario que intentan borrar
    const userToDelete = await prisma.user.findUnique({ where: { id } });

    if (!userToDelete) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }

    // 2. Filtro de Club: El presidente solo puede borrar a los suyos
    if (role === 'AdminClub' && userToDelete.clubId !== adminClubId) {
      return res
        .status(403)
        .json({ error: 'No tienes permiso para borrar jugadores de otros clubes' });
    }

    await prisma.user.delete({
      where: { id: id },
    });

    res.status(204).send();
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error al borrar el usuario' });
  }
});

// POST: Crear cuenta de Invitado (Solo AdminClub)
router.post('/guest', requireAdminClub, async (req, res) => {
  try {
    // 👇 1. VALIDACIÓN ESTRICTA CON ZOD
    const validation = createGuestSchema.safeParse(req.body);

    if (!validation.success) {
      return res.status(400).json({
        error: 'Datos de entrada inválidos',
        details: z.treeifyError(validation.error),
      });
    }

    // 👇 2. EXTRAER DATOS LIMPIOS Y SEGUROS
    const { name, surname, level, dominantHand, playstyle, elo, skills } = validation.data;
    const clubId = req.user?.clubId;

    if (!clubId) return res.status(403).json({ error: 'No tienes club asignado' });

    const currentSeason = await getCurrentSeason(prisma);

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
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error creando la cuenta de invitado' });
  }
});

export default router;

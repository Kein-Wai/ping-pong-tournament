import { Router } from 'express';
import bcrypt from 'bcryptjs';
import prisma from '../db';
import { createUserSchema, updateUserSchema, updateProfileSchema } from '../schemas/user';
import { z } from 'zod';

const router = Router();

router.get('/', async (req, res) => {
  try {
    const users = await prisma.user.findMany({
      select: { id: true, email: true, name: true, surname: true, userTypeId: true, stats: true },
    });
    res.json(users);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error al obtener los usuarios' });
  }
});

router.post('/', async (req, res) => {
  try {
    const validation = createUserSchema.safeParse(req.body);

    if (!validation.success) {
      res.status(400).json({
        error: 'Datos de entrada inválidos',
        details: z.treeifyError(validation.error),
      });
      return;
    }

    const { password, ...userData } = validation.data;
    let hashedPassword = null;

    if (password) {
      hashedPassword = await bcrypt.hash(password, 10);
    }

    const newUser = await prisma.user.create({
      data: {
        ...userData,
        password: hashedPassword,

        authProvider: password ? 'LOCAL' : 'UNKNOWN',
        stats: {
          create: {
            elo: userData.elo,
          },
        },
      },
      select: {
        id: true,
        email: true,
        name: true,
        surname: true,
        secondSurname: true,
        nickname: true,
      },
    });

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
    const user = await prisma.user.findUnique({ where: { id: id } });
    res.json(user);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error al obtener los usuarios' });
  }
});

router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const validation = updateUserSchema.safeParse(req.body);

    if (!validation.success) {
      res.status(400).json({
        error: 'Datos de entrada inválidos',
        details: z.treeifyError(validation.error),
      });
      return;
    }

    const updatedUser = await prisma.user.update({
      where: { id: id },
      data: {
        ...validation.data,
        ...(validation.data.elo !== undefined && {
          stats: {
            upsert: {
              create: { elo: validation.data.elo },
              update: { elo: validation.data.elo },
            },
          },
        }),
      },
    });

    res.json(updatedUser);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error al actualizar el usuario' });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    await prisma.user.delete({
      where: { id: id },
    });

    res.status(204).send();
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error al borrar el usuario' });
  }
});

export default router;

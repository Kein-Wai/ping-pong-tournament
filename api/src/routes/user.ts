import { Router } from 'express';
import bcrypt from 'bcryptjs'; // <-- Importar bcrypt
import prisma from '../db';
import { createUserSchema, updateUserSchema, updateProfileSchema } from '../schemas/user';
import { z } from 'zod';

const router = Router();

// GET: Obtener todos los usuarios
router.get('/', async (req, res) => {
  try {
    const users = await prisma.user.findMany({
      select: { id: true, email: true, name: true, surname: true, userTypeId: true, stats: true }, // Todo menos password y googleId
    });
    res.json(users);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error al obtener los usuarios' });
  }
});

// POST: Crear un nuevo usuario
router.post('/', async (req, res) => {
  try {
    // 1. Validamos el body con Zod
    const validation = createUserSchema.safeParse(req.body);
    // 2. Si falla, devolvemos un error 400 (Bad Request) con los detalles
    if (!validation.success) {
      res.status(400).json({
        error: 'Datos de entrada inválidos',
        details: z.treeifyError(validation.error),
      });
      return;
    }

    const { password, ...userData } = validation.data;
    let hashedPassword = null;

    // Si nos pasan contraseña, la encriptamos
    if (password) {
      hashedPassword = await bcrypt.hash(password, 10);
    }

    // 3. Si pasa, usamos validation.data (que ya está tipado y limpio)
    const newUser = await prisma.user.create({
      data: {
        ...userData,
        password: hashedPassword,
        // Si hay contraseña es LOCAL, si no (lo crearemos desde la ruta de Google)
        authProvider: password ? 'LOCAL' : 'UNKNOWN',
        stats: {
          create: {
            elo: userData.elo, // Aquí inyectamos el elo que el admin decida
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
        // Evitamos devolver la contraseña hasheada
      },
    });

    // const { password: _, ...userWithoutPassword } = newUser;

    res.status(201).json(newUser);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error al crear el usuario' });
  }
});

router.put('/me', async (req, res) => {
  try {
    // 1. Extraemos el ID del payload del token que tu middleware inyectó
    const userId = req.user?.id;

    if (!userId) {
      res.status(401).json({ error: 'Usuario no autenticado' });
      return;
    }

    // 2. Validamos el body con Zod
    const validation = updateProfileSchema.safeParse(req.body);
    if (!validation.success) {
      res.status(400).json({ error: 'Datos inválidos', details: validation.error.format() });
      return;
    }

    const data = validation.data;

    // 3. Obtenemos al usuario para verificar su contraseña actual
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      res.status(404).json({ error: 'Usuario no encontrado' });
      return;
    }

    // 4. Preparamos el objeto con los campos a actualizar
    const updateData: any = {};
    if (data.name) updateData.name = data.name;
    if (data.surname) updateData.surname = data.surname;
    if (req.body.secondSurname) updateData.secondSurname = req.body.secondSurname;
    if (req.body.nickname) updateData.nickname = req.body.nickname;

    // 5. Lógica estricta de cambio de contraseña
    if (data.newPassword) {
      // Si el usuario tiene una contraseña previa (no entró solo con Google sin clave)
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

      // Hasheamos la nueva contraseña
      updateData.password = await bcrypt.hash(data.newPassword, 10);
    }

    // 6. Ejecutamos la actualización en la BBDD
    // El ELO y el Role están a salvo porque no los incluimos en 'updateData'
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
        // Evitamos devolver la contraseña hasheada
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

// PUT: Actualizar un usuario existente
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
      where: { id: id }, // Convertimos el ID de la URL a número
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

// DELETE: Borrar un usuario
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    await prisma.user.delete({
      where: { id: id },
    });

    res.status(204).send(); // 204 significa "No Content" (Borrado con éxito)
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error al borrar el usuario' });
  }
});

export default router;

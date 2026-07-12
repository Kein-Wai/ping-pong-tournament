import { Router } from 'express';
import bcrypt from 'bcryptjs'; // <-- Importar bcrypt
import prisma from '../db';
import { createUserSchema, updateUserSchema } from '../schemas/user.schema';
import { z } from 'zod';

const router = Router();

// GET: Obtener todos los usuarios
router.get('/', async (req, res) => {
  try {
    const users = await prisma.user.findMany();
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
      },
    });

    const { password: _, ...userWithoutPassword } = newUser;

    res.status(201).json(newUser);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error al crear el usuario' });
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
      data: validation.data,
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

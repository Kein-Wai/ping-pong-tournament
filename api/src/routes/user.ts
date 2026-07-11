import { Router } from 'express';
import prisma from '../db';
import { createUserSchema, updateUserSchema } from '../schemas/user.schema';

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
        details: validation.error.format(),
      });
      return;
    }

    // 3. Si pasa, usamos validation.data (que ya está tipado y limpio)
    const newUser = await prisma.user.create({
      data: validation.data,
    });

    res.status(201).json(newUser);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error al crear el usuario' });
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
        details: validation.error.format(),
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

import { Router } from 'express';
import { Prisma } from '@prisma/client';
import { z } from 'zod';
import prisma from '../db';
import { asyncHandler, sendData, sendError, sendMessage } from '../http/response';
import { warmupRoutineSchema } from '../schemas/warmupRoutine';

const router = Router();

/** Máximo de rutinas que puede guardar un jugador: evita que un usuario libre llene la tabla. */
export const MAX_ROUTINES_PER_PLAYER = 5;

// Sin userId: el cliente no necesita saber a quién pertenece, siempre es al jugador autenticado.
const ROUTINE_SELECT = {
  id: true,
  name: true,
  items: true,
  createdAt: true,
  updatedAt: true,
} as const;

const hasPrismaCode = (error: unknown, code: string): boolean =>
  typeof error === 'object' && error !== null && (error as { code?: string }).code === code;

/**
 * Conflictos de escritura que se explican al jugador con un 409:
 * - P2002: ya tiene otra rutina con ese nombre (índice único userId + name).
 * - P2034: dos peticiones chocaron en la transacción serializable; basta con reintentar.
 */
const conflictMessage = (error: unknown): string | null => {
  if (hasPrismaCode(error, 'P2002')) return 'Ya tienes una rutina con ese nombre.';
  if (hasPrismaCode(error, 'P2034')) return 'No se pudo guardar la rutina. Inténtalo de nuevo.';
  return null;
};

// La más recientemente guardada o modificada primero: es la que carga el cliente al abrir la pantalla.
router.get(
  '/',
  asyncHandler(async (req, res) => {
    const routines = await prisma.warmupRoutine.findMany({
      where: { userId: req.user?.id },
      orderBy: { updatedAt: 'desc' },
      select: ROUTINE_SELECT,
    });

    sendData(res, routines);
  }, 'Error al obtener las rutinas de calentamiento', 500),
);

router.post(
  '/',
  asyncHandler(async (req, res) => {
    const userId = req.user?.id;
    if (!userId) return sendError(res, 401, 'No autorizado');

    const validation = warmupRoutineSchema.safeParse(req.body);
    if (!validation.success) {
      return sendError(res, 400, 'Datos inválidos', z.treeifyError(validation.error));
    }

    try {
      // Contar y crear en una transacción serializable: sin ella, dos peticiones simultáneas con
      // cuatro rutinas guardadas pasarían las dos la comprobación y el jugador acabaría con seis.
      const result = await prisma.$transaction(
        async (tx) => {
          const saved = await tx.warmupRoutine.count({ where: { userId } });
          if (saved >= MAX_ROUTINES_PER_PLAYER) return null;

          return tx.warmupRoutine.create({
            data: { userId, name: validation.data.name, items: validation.data.items },
            select: ROUTINE_SELECT,
          });
        },
        { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
      );

      if (!result) {
        return sendError(
          res,
          409,
          `Has alcanzado el máximo de ${MAX_ROUTINES_PER_PLAYER} rutinas. Borra una para guardar otra.`,
        );
      }
      sendData(res, result, 201);
    } catch (error) {
      const message = conflictMessage(error);
      if (message) return sendError(res, 409, message);
      throw error;
    }
  }, 'Error al guardar la rutina de calentamiento', 500),
);

/**
 * Las rutinas son personales: solo su propietario las modifica. Si la rutina no existe o es de
 * otro responde igual (404), para no revelar que existe. El filtro por usuario va en la consulta.
 */
const NOT_FOUND_MESSAGE = 'Rutina no encontrada';
const isOwnRoutine = async (id: string, userId: string | undefined): Promise<boolean> => {
  if (!userId) return false;
  const routine = await prisma.warmupRoutine.findFirst({ where: { id, userId }, select: { id: true } });
  return routine !== null;
};

router.put(
  '/:id',
  asyncHandler(async (req, res) => {
    const id = req.params.id as string;
    if (!(await isOwnRoutine(id, req.user?.id))) return sendError(res, 404, NOT_FOUND_MESSAGE);

    const validation = warmupRoutineSchema.safeParse(req.body);
    if (!validation.success) {
      return sendError(res, 400, 'Datos inválidos', z.treeifyError(validation.error));
    }

    try {
      const updated = await prisma.warmupRoutine.update({
        where: { id },
        data: validation.data,
        select: ROUTINE_SELECT,
      });
      sendData(res, updated);
    } catch (error) {
      const message = conflictMessage(error);
      if (message) return sendError(res, 409, message);
      throw error;
    }
  }, 'Error al actualizar la rutina de calentamiento', 500),
);

router.delete(
  '/:id',
  asyncHandler(async (req, res) => {
    const id = req.params.id as string;
    if (!(await isOwnRoutine(id, req.user?.id))) return sendError(res, 404, NOT_FOUND_MESSAGE);

    await prisma.warmupRoutine.delete({ where: { id } });

    sendMessage(res, 'Rutina eliminada');
  }, 'Error al borrar la rutina de calentamiento', 500),
);

export default router;

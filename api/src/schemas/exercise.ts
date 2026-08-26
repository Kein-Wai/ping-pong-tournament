import { z } from 'zod';
import { ExerciseCategory } from '@prisma/client';

// Usamos z.nativeEnum para que Zod lea directamente tu Enum de Prisma
// Lo hacemos .optional() por si en el futuro quieres hacer un GET sin filtros
export const getExercisesQuerySchema = z.object({
  category: z.enum(ExerciseCategory).optional(),
});

export const createExerciseSchema = z.object({
  name: z.string().min(3, 'El nombre debe tener al menos 3 caracteres'),
  code: z.number().optional(),
  description: z.string().min(5, 'Añade una descripción más detallada'),
  category: z.enum(ExerciseCategory),
});

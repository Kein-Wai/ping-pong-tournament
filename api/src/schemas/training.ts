import { z } from 'zod';

export const createTrainingSchema = z.object({
  playerId: z.uuid('El ID del jugador debe ser válido'),
  strengths: z.string().min(3, 'Las fortalezas deben tener al menos 3 caracteres'),
  weaknesses: z.string().min(3, 'Las debilidades deben tener al menos 3 caracteres'),
  objectives: z.string().min(3, 'Los objetivos deben tener al menos 3 caracteres'),
  sessionsPerWeek: z.number().int().min(1).max(5, 'Máximo 5 sesiones semanales'),
  weeks: z.number().int().min(1).max(12, 'Un plan no debe exceder las 12 semanas'),
  startDate: z.iso.datetime('Formato de fecha inválido').refine(
    (dateStr) => {
      const inputDate = new Date(dateStr);
      const today = new Date();
      today.setHours(0, 0, 0, 0); // Ignoramos la hora actual
      return inputDate >= today;
    },
    { message: 'La fecha de inicio no puede estar en el pasado' },
  ),
});

export const addExerciseToSessionSchema = z.object({
  exerciseId: z.uuid('El ID del ejercicio debe ser un UUID válido'),
  sets: z.number().int().min(1, 'Las series deben ser al menos 1').optional(),
  reps: z.number().int().min(1, 'Las repeticiones deben ser al menos 1').optional(),
  durationMinutes: z.number().int().min(1, 'La duración debe ser de al menos 1 minuto').optional(),
});

export const createSingleSessionSchema = z.object({
  date: z.iso.datetime(),
  title: z.string().optional().nullable(),
});

export const completeSessionSchema = z.object({
  // Array de strings con los nombres exactos de las skills que el usuario ha marcado
  skillsWorked: z
    .array(
      z.enum([
        'derechaPlano',
        'revesPlano',
        'topspinDerecha',
        'topspinReves',
        'corte',
        'bloqueoDerecha',
        'bloqueoReves',
        'servicio',
        'recepcion',
        'movilidad',
        'fortalezaMental',
        'experiencia',
      ]),
    )
    .max(4, 'No puedes centrarte en más de 4 skills por sesión'),
});

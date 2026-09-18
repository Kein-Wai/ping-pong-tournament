import { z } from 'zod';

export const createScheduleSchema = z.object({
  name: z.string().min(3, 'El nombre debe tener al menos 3 letras'),
  startTime: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/, 'Formato HH:mm (ej. 17:00)'),
  endTime: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/, 'Formato HH:mm (ej. 19:00)'),
  daysOfWeek: z.array(z.number().int().min(0).max(6)).min(1, 'Debes seleccionar al menos un día'),
});

export const createGeneralTrainingSchema = z.object({
  description: z.string().optional(),
  startDate: z.string().datetime(),
  endDate: z.string().datetime(),
  scheduleId: z.string().uuid(),
  skillsToTrain: z.object({
    derechaPlano: z.boolean().default(false),
    revesPlano: z.boolean().default(false),
    topspinDerecha: z.boolean().default(false),
    topspinReves: z.boolean().default(false),
    corte: z.boolean().default(false),
    bloqueoDerecha: z.boolean().default(false),
    bloqueoReves: z.boolean().default(false),
    servicio: z.boolean().default(false),
    recepcion: z.boolean().default(false),
    movilidad: z.boolean().default(false),
    fortalezaMental: z.boolean().default(false),
    experiencia: z.boolean().default(false),
  }),
});

export const bulkAttendanceSchema = z.object({
  playerIds: z.array(z.uuid()),
});

// Versiones parciales para actualizar
export const updateScheduleSchema = createScheduleSchema.partial();
export const updateGeneralTrainingSchema = createGeneralTrainingSchema.partial();

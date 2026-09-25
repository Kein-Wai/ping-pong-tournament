import { z } from 'zod';
import { EventRegion } from '@prisma/client';

export const createEventSchema = z.object({
  name: z.string().min(3, 'El nombre debe tener al menos 3 caracteres'),
  date: z.iso.datetime('Fecha inválida'),
  endDate: z.iso.datetime().optional().nullable(),
  region: z
    .enum([
      EventRegion.Club,
      EventRegion.Local,
      EventRegion.Regional,
      EventRegion.Provincial,
      EventRegion.Autonomico,
      EventRegion.Nacional,
      EventRegion.Internacional,
    ])
    .optional(),
  location: z.string().optional().nullable(),
  color: z.string().default('blue'),
});

export const updateEventSchema = createEventSchema.partial();

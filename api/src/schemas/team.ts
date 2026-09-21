// src/schemas/team.ts
import { z } from 'zod';

export const createTeamSchema = z.object({
  name: z.string().min(3, 'El nombre del equipo debe tener al menos 3 caracteres'),
  category: z.string().min(2, 'La categoría es obligatoria (ej: 1ª Autonómica)'),
  level: z.string().min(2, 'El nivel es obligatorio'),
});

export const updateTeamPlayersSchema = z.object({
  playerIds: z.array(z.uuid('Los IDs de los jugadores deben ser válidos')),
});

export const createTeamMatchSchema = z.object({
  rivalName: z.string().min(2, 'El nombre del rival es obligatorio'),
  date: z.iso.datetime('La fecha debe ser válida'),
  isHome: z.boolean(),
  location: z.string().optional().nullable(),
});
export const updateTeamMatchSchema = z.object({
  status: z.enum(['Programado', 'Completado', 'Cancelado']),
  ourScore: z.number().int().min(0).optional().nullable(),
  rivalScore: z.number().int().min(0).optional().nullable(),

  rivalName: z.string().min(2).optional(),
  date: z.iso.datetime().optional(),
  isHome: z.boolean().optional(),
  location: z.string().optional().nullable(),
});

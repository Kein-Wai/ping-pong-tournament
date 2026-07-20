import { z } from 'zod';
import { ClubStatus, UserClubStatus } from '@prisma/client';

export const createClubSchema = z.object({
  name: z.string().min(3, 'El nombre del club debe tener al menos 3 caracteres'),
  city: z
    .string()
    .min(2, 'Debes introducir una ciudad válida (mínimo 2 letras)')
    .regex(/^[a-zA-ZáéíóúÁÉÍÓÚñÑçÇ\s-]+$/, 'El nombre de la ciudad no es válido'),
  address: z.string().optional().nullable(),
  foundedAt: z.iso.datetime().optional().nullable(),
});

export const updateClubSchema = z.object({
  name: z.string().min(3).optional(),
  city: z.string().min(2).optional(),
  address: z.string().optional().nullable(),
  foundedAt: z.iso.datetime().optional().nullable(),
  status: z.enum([ClubStatus.Pendiente, ClubStatus.Aprobado, ClubStatus.Inactivo]).optional(),
});

export const updateMemberStatusSchema = z.object({
  status: z.enum([UserClubStatus.Aprobado, UserClubStatus.Rechazado]),
});

import { z } from 'zod';
import { ClubStatus, UserClubStatus } from '@prisma/client';

export const createClubSchema = z.object({
  name: z.string().min(3, 'El nombre del club debe tener al menos 3 caracteres'),
});

export const updateClubSchema = z.object({
  name: z.string().min(3).optional(),
  status: z.enum([ClubStatus.Pendiente, ClubStatus.Aprobado, ClubStatus.Inactivo]).optional(),
});
export const updateMemberStatusSchema = z.object({
  status: z.enum([UserClubStatus.Aprobado, UserClubStatus.Rechazado]),
});

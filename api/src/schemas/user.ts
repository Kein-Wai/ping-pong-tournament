import { z } from 'zod';
import { UserClubStatus } from '@prisma/client';

export const loginLocalSchema = z.object({
  email: z.email(),
  password: z.string().min(1),
});

export const loginGoogleSchema = z.object({
  credential: z.string().min(1, 'El token de Google es obligatorio'),
});

export const registerSchema = z
  .object({
    email: z.email('El formato del email no es válido'),
    surname: z.string().min(2, 'El apellido debe tener al menos 2 caracteres').optional(),
    name: z.string().min(3, 'El nombre debe tener al menos 3 caracteres'),
    password: z
      .string()
      .min(8, 'La contraseña debe tener al menos 8 caracteres')
      .max(32, { message: 'La contraseña no puede exceder de 32 caracteres' })
      .regex(/[A-Z]/, { message: 'Debe contener al menos una mayuscula' })
      .regex(/[a-z]/, { message: 'Debe contener almenos una minuscula' })
      .regex(/\d/, { message: 'Debe contener almenos un numero' })
      .regex(/[@$!%*?&]/, { message: 'Debe almenos contener un character especial' }),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Las contraseñas no coinciden',
    path: ['confirmPassword'],
  });

export const createUserSchema = z.object({
  email: z.email('El formato del email no es válido'),
  name: z.string().min(3, 'El nombre debe tener al menos 3 caracteres'),
  surname: z.string().min(2, 'El apellido debe tener al menos 2 caracteres').optional(),
  userTypeId: z.uuid('El tipo de usuario debe ser un UUID válido'),
  password: z
    .string()
    .min(8, 'La contraseña debe tener al menos 8 caracteres')
    .max(32, { message: 'La contraseña no puede exceder de 32 caracteres' })
    .regex(/[A-Z]/, { message: 'Debe contener al menos una mayuscula' })
    .regex(/[a-z]/, { message: 'Debe contener almenos una minuscula' })
    .regex(/\d/, { message: 'Debe contener almenos un numero' })
    .regex(/[@$!%*?&]/, { message: 'Debe almenos contener un character especial' })
    .optional(),
  elo: z.number().int().positive().optional().default(500),
  clubId: z.string().uuid('El ID del club debe ser un UUID').nullable().optional(),
  clubStatus: z
    .enum([
      UserClubStatus.Registrado,
      UserClubStatus.Pendiente,
      UserClubStatus.Aprobado,
      UserClubStatus.Rechazado,
    ])
    .optional(),
});

export const updateUserSchema = createUserSchema.partial();

export const updateProfileSchema = z
  .object({
    name: z.string().optional(),
    surname: z.string().optional(),
    currentPassword: z.string().optional(),
    newPassword: z
      .string()
      .min(6, 'La nueva contraseña debe tener al menos 6 caracteres')
      .optional(),
    confirmPassword: z.string().optional(),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: 'Las contraseñas no coinciden',
    path: ['confirmPassword'],
  });

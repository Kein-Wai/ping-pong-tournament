import { z } from 'zod';

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
    // Esta validación personalizada se ejecutará automáticamente
    message: 'Las contraseñas no coinciden',
    path: ['confirmPassword'], // Le dice a Zod que el error pertenece a este campo
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
});

export const updateUserSchema = createUserSchema.partial();

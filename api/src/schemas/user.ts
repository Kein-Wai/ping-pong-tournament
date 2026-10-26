import { z } from 'zod';
import { UserClubStatus, DominantHand, Playstyle, PlayerLevel, RubberType } from '@prisma/client';

const statValidator = z.number().int().min(0).max(100);

// 👇 MAGIA DE ZOD: Transformamos los strings vacíos ("") a null antes de validar
const emptyToNull = <T extends z.ZodTypeAny>(schema: T) =>
  z.preprocess((val) => (val === '' ? null : val), schema);

// Extraemos el Enum de las gomas para no repetir código
const RubberEnumZod = z.enum([
  RubberType.LISA,
  RubberType.PICOS_CORTOS,
  RubberType.PICOS_MEDIOS,
  RubberType.PICOS_LARGOS,
  RubberType.ANTISPIN,
]);

export const updateSkillsSchema = z.object({
  derechaPlano: statValidator,
  revesPlano: statValidator,
  topspinDerecha: statValidator,
  topspinReves: statValidator,
  corte: statValidator,
  bloqueoDerecha: statValidator,
  bloqueoReves: statValidator,
  servicio: statValidator,
  recepcion: statValidator,
  movilidad: statValidator,
  fortalezaMental: statValidator,
  experiencia: statValidator,
});

export const loginLocalSchema = z.object({
  email: z.email(),
  password: z.string().min(1),
});

export const loginGoogleSchema = z.object({
  credential: z.string().min(1, 'El token de Google es obligatorio'),
  role: z.enum(['Player', 'AdminClub']).optional().default('Player'),
});

export const refreshTokenSchema = z.object({
  refreshToken: z.string().min(1, 'El refresh token es obligatorio'),
});

export const registerSchema = z
  .object({
    email: z.email('El formato del email no es válido'),
    surname: emptyToNull(
      z.string().min(2, 'El apellido debe tener al menos 2 caracteres').optional().nullable(),
    ),
    name: z.string().min(3, 'El nombre debe tener al menos 3 caracteres'),
    role: z.enum(['Player', 'AdminClub']).optional().default('Player'),
    password: z
      .string()
      .min(8, 'La contraseña debe tener al menos 8 caracteres')
      .max(32, { message: 'La contraseña no puede exceder de 32 caracteres' })
      .regex(/[A-Z]/, { message: 'Debe contener al menos una mayúscula' })
      .regex(/[a-z]/, { message: 'Debe contener al menos una minúscula' })
      .regex(/\d/, { message: 'Debe contener al menos un número' })
      .regex(/[@$!%*?&]/, { message: 'Debe contener al menos un carácter especial' }),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Las contraseñas no coinciden',
    path: ['confirmPassword'],
  });

export const createUserSchema = z.object({
  email: z.string().email('El formato del email no es válido'),
  name: z.string().min(3, 'El nombre debe tener al menos 3 caracteres'),
  surname: emptyToNull(z.string().optional().nullable()),
  userTypeId: z.string().uuid('El tipo de usuario debe ser un UUID válido').optional(),
  password: z
    .string()
    .min(8, 'La contraseña debe tener al menos 8 caracteres')
    .max(32, { message: 'La contraseña no puede exceder de 32 caracteres' })
    .regex(/[A-Z]/, { message: 'Debe contener al menos una mayúscula' })
    .regex(/[a-z]/, { message: 'Debe contener al menos una minúscula' })
    .regex(/\d/, { message: 'Debe contener al menos un número' })
    .regex(/[@$!%*?&]/, { message: 'Debe contener al menos un carácter especial' })
    .optional(),
  elo: z
    .number()
    .int()
    .min(0, 'El ELO no puede ser negativo')
    .max(10000, 'El ELO máximo es 10000')
    .optional()
    .default(500),
  clubId: z.string().uuid('El ID del club debe ser un UUID').nullable().optional(),

  clubStatus: z
    .enum([
      UserClubStatus.Registrado,
      UserClubStatus.Pendiente,
      UserClubStatus.Aprobado,
      UserClubStatus.Rechazado,
    ])
    .optional(),
  level: z
    .enum([
      PlayerLevel.Iniciacion,
      PlayerLevel.Principiante,
      PlayerLevel.Intermedio,
      PlayerLevel.Avanzado,
      PlayerLevel.Profesional,
    ])
    .optional(),
  // 👇 Blindados con emptyToNull
  dominantHand: emptyToNull(
    z.enum([DominantHand.Diestro, DominantHand.Zurdo]).optional().nullable(),
  ),
  playstyle: emptyToNull(z.enum([Playstyle.Ofensivo, Playstyle.Defensivo]).optional().nullable()),
  rubberForehand: emptyToNull(RubberEnumZod.optional().nullable()),
  rubberBackhand: emptyToNull(RubberEnumZod.optional().nullable()),
  skills: updateSkillsSchema.optional(),
});

export const updateUserSchema = createUserSchema
  .partial()
  .extend({
    nickname: emptyToNull(z.string().optional().nullable()),
    avatarUrl: emptyToNull(z.string().url('URL de avatar inválida').optional().nullable()),
    birthDate: emptyToNull(z.string().datetime('Fecha inválida').optional().nullable()),
    elo: z.number().int().min(0).max(10000).optional(),
    newPassword: emptyToNull(
      z
        .string()
        .min(8, 'La nueva contraseña debe tener al menos 8 caracteres')
        .regex(/[A-Z]/, 'Debe contener al menos una mayúscula')
        .regex(/[a-z]/, 'Debe contener al menos una minúscula')
        .regex(/\d/, 'Debe contener al menos un número')
        .regex(/[@$!%*?&]/, 'Debe contener al menos un carácter especial')
        .optional()
        .nullable(),
    ),
    confirmPassword: emptyToNull(z.string().optional().nullable()),
  })
  .refine(
    (data) => {
      if (data.newPassword) {
        return data.newPassword === data.confirmPassword;
      }
      return true;
    },
    {
      message: 'Las contraseñas no coinciden',
      path: ['confirmPassword'],
    },
  );

export const updateProfileSchema = z
  .object({
    name: z.string().optional(),
    birthDate: emptyToNull(z.string().datetime().optional().nullable()),
    surname: emptyToNull(z.string().optional().nullable()),
    nickname: emptyToNull(z.string().optional().nullable()),
    avatarUrl: emptyToNull(z.string().url('La URL del avatar no es válida').optional().nullable()),
    currentPassword: z.string().optional(),
    newPassword: emptyToNull(
      z
        .string()
        .min(8, 'La nueva contraseña debe tener al menos 8 caracteres')
        .max(32, 'La contraseña no puede exceder de 32 caracteres')
        .regex(/[A-Z]/, 'Debe contener al menos una mayúscula')
        .regex(/[a-z]/, 'Debe contener al menos una minúscula')
        .regex(/\d/, 'Debe contener al menos un número')
        .regex(/[@$!%*?&]/, 'Debe contener al menos un carácter especial')
        .optional()
        .nullable(),
    ),
    confirmPassword: emptyToNull(z.string().optional().nullable()),
    dominantHand: emptyToNull(
      z.enum([DominantHand.Diestro, DominantHand.Zurdo]).optional().nullable(),
    ),
    playstyle: emptyToNull(z.enum([Playstyle.Ofensivo, Playstyle.Defensivo]).optional().nullable()),
    rubberForehand: emptyToNull(RubberEnumZod.optional().nullable()),
    rubberBackhand: emptyToNull(RubberEnumZod.optional().nullable()),
  })
  .refine(
    (data) => {
      if (data.newPassword) {
        return data.newPassword === data.confirmPassword;
      }
      return true;
    },
    {
      message: 'Las contraseñas no coinciden',
      path: ['confirmPassword'],
    },
  );

export const forgotPasswordSchema = z.object({
  email: z.email('El formato del email no es válido'),
});

export const resetPasswordSchema = z
  .object({
    token: z.string().min(1, 'El token es obligatorio'),
    newPassword: z
      .string()
      .min(8, 'La contraseña debe tener al menos 8 caracteres')
      .max(32, { message: 'La contraseña no puede exceder de 32 caracteres' })
      .regex(/[A-Z]/, { message: 'Debe contener al menos una mayúscula' })
      .regex(/[a-z]/, { message: 'Debe contener al menos una minúscula' })
      .regex(/\d/, { message: 'Debe contener al menos un número' })
      .regex(/[@$!%*?&]/, { message: 'Debe contener al menos un carácter especial' }),
    confirmPassword: z.string(),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: 'Las contraseñas no coinciden',
    path: ['confirmPassword'],
  });

export const createGuestSchema = z.object({
  name: z.string().min(3, 'El nombre debe tener al menos 3 caracteres'),
  surname: emptyToNull(z.string().optional().nullable()),
  level: z
    .enum([
      PlayerLevel.Iniciacion,
      PlayerLevel.Principiante,
      PlayerLevel.Intermedio,
      PlayerLevel.Avanzado,
      PlayerLevel.Profesional,
    ])
    .optional()
    .default(PlayerLevel.Iniciacion),
  dominantHand: z
    .enum([DominantHand.Diestro, DominantHand.Zurdo])
    .optional()
    .default(DominantHand.Diestro),
  playstyle: z
    .enum([Playstyle.Ofensivo, Playstyle.Defensivo])
    .optional()
    .default(Playstyle.Ofensivo),
  rubberForehand: emptyToNull(RubberEnumZod.optional().nullable()),
  rubberBackhand: emptyToNull(RubberEnumZod.optional().nullable()),
  elo: z
    .number()
    .int()
    .min(0, 'El ELO no puede ser negativo')
    .max(10000, 'El ELO máximo es 10000')
    .optional()
    .default(500),
  skills: updateSkillsSchema.optional(),
});

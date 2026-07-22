"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateProfileSchema = exports.updateUserSchema = exports.createUserSchema = exports.registerSchema = exports.loginGoogleSchema = exports.loginLocalSchema = void 0;
const zod_1 = require("zod");
const client_1 = require("@prisma/client");
exports.loginLocalSchema = zod_1.z.object({
    email: zod_1.z.email(),
    password: zod_1.z.string().min(1),
});
exports.loginGoogleSchema = zod_1.z.object({
    credential: zod_1.z.string().min(1, 'El token de Google es obligatorio'),
    role: zod_1.z.enum(['Player', 'AdminClub']).optional().default('Player'),
});
exports.registerSchema = zod_1.z
    .object({
    email: zod_1.z.email('El formato del email no es válido'),
    surname: zod_1.z.string().min(2, 'El apellido debe tener al menos 2 caracteres').optional(),
    name: zod_1.z.string().min(3, 'El nombre debe tener al menos 3 caracteres'),
    role: zod_1.z.enum(['Player', 'AdminClub']).optional().default('Player'),
    password: zod_1.z
        .string()
        .min(8, 'La contraseña debe tener al menos 8 caracteres')
        .max(32, { message: 'La contraseña no puede exceder de 32 caracteres' })
        .regex(/[A-Z]/, { message: 'Debe contener al menos una mayuscula' })
        .regex(/[a-z]/, { message: 'Debe contener almenos una minuscula' })
        .regex(/\d/, { message: 'Debe contener almenos un numero' })
        .regex(/[@$!%*?&]/, { message: 'Debe almenos contener un character especial' }),
    confirmPassword: zod_1.z.string(),
})
    .refine((data) => data.password === data.confirmPassword, {
    message: 'Las contraseñas no coinciden',
    path: ['confirmPassword'],
});
exports.createUserSchema = zod_1.z.object({
    email: zod_1.z.email('El formato del email no es válido'),
    name: zod_1.z.string().min(3, 'El nombre debe tener al menos 3 caracteres'),
    surname: zod_1.z.string().min(2, 'El apellido debe tener al menos 2 caracteres').optional(),
    userTypeId: zod_1.z.uuid('El tipo de usuario debe ser un UUID válido'),
    password: zod_1.z
        .string()
        .min(8, 'La contraseña debe tener al menos 8 caracteres')
        .max(32, { message: 'La contraseña no puede exceder de 32 caracteres' })
        .regex(/[A-Z]/, { message: 'Debe contener al menos una mayuscula' })
        .regex(/[a-z]/, { message: 'Debe contener almenos una minuscula' })
        .regex(/\d/, { message: 'Debe contener almenos un numero' })
        .regex(/[@$!%*?&]/, { message: 'Debe almenos contener un character especial' })
        .optional(),
    elo: zod_1.z.number().int().positive().optional().default(500),
    clubId: zod_1.z.string().uuid('El ID del club debe ser un UUID').nullable().optional(),
    clubStatus: zod_1.z
        .enum([
        client_1.UserClubStatus.Registrado,
        client_1.UserClubStatus.Pendiente,
        client_1.UserClubStatus.Aprobado,
        client_1.UserClubStatus.Rechazado,
    ])
        .optional(),
});
exports.updateUserSchema = exports.createUserSchema.partial();
exports.updateProfileSchema = zod_1.z
    .object({
    name: zod_1.z.string().optional(),
    surname: zod_1.z.string().optional(),
    currentPassword: zod_1.z.string().optional(),
    newPassword: zod_1.z
        .string()
        .min(6, 'La nueva contraseña debe tener al menos 6 caracteres')
        .optional(),
    confirmPassword: zod_1.z.string().optional(),
})
    .refine((data) => data.newPassword === data.confirmPassword, {
    message: 'Las contraseñas no coinciden',
    path: ['confirmPassword'],
});

"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateMemberStatusSchema = exports.updateClubSchema = exports.createClubSchema = void 0;
const zod_1 = require("zod");
const client_1 = require("@prisma/client");
exports.createClubSchema = zod_1.z.object({
    name: zod_1.z.string().min(3, 'El nombre del club debe tener al menos 3 caracteres'),
    city: zod_1.z
        .string()
        .min(2, 'Debes introducir una ciudad válida (mínimo 2 letras)')
        .regex(/^[a-zA-ZáéíóúÁÉÍÓÚñÑçÇ\s-]+$/, 'El nombre de la ciudad no es válido'),
    address: zod_1.z.string().optional().nullable(),
    foundedAt: zod_1.z.iso.datetime().optional().nullable(),
});
exports.updateClubSchema = zod_1.z.object({
    name: zod_1.z.string().min(3).optional(),
    city: zod_1.z.string().min(2).optional(),
    address: zod_1.z.string().optional().nullable(),
    foundedAt: zod_1.z.iso.datetime().optional().nullable(),
    status: zod_1.z.enum([client_1.ClubStatus.Pendiente, client_1.ClubStatus.Aprobado, client_1.ClubStatus.Inactivo]).optional(),
});
exports.updateMemberStatusSchema = zod_1.z.object({
    status: zod_1.z.enum([client_1.UserClubStatus.Aprobado, client_1.UserClubStatus.Rechazado]),
});

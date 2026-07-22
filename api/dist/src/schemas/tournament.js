"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.registerParticipantSchema = exports.createTournamentSchema = exports.validateTournamentBusinessRules = exports.baseTournamentObject = void 0;
const zod_1 = require("zod");
const client_1 = require("@prisma/client");
exports.baseTournamentObject = zod_1.z.object({
    dateStart: zod_1.z.iso.datetime('Formato de fecha inválido'),
    name: zod_1.z.string().min(3, 'El nombre debe tener al menos 3 caracteres'),
    numPlayers: zod_1.z.number().int().min(2, 'Debe haber al menos 2 jugadores'),
    numGroup: zod_1.z.number().int().min(1, 'Debe haber al menos 1 grupo').nullable().optional(),
    numGroupPlayers: zod_1.z.number().int().min(2).nullable().optional(),
    typeTournament: zod_1.z.enum(client_1.TypeTournament).optional(),
    levelTournament: zod_1.z.enum(client_1.LevelTournament).optional(),
    rounds: zod_1.z.enum(client_1.Rounds).optional(),
    status: zod_1.z.enum(client_1.TournamentStatus).optional(),
    typeKnockout: zod_1.z.enum(client_1.TypeKnockout).optional(),
    playersKnockout: zod_1.z.number().int().min(1).nullable().optional(),
    sortGroups: zod_1.z.enum(client_1.SortGroups).optional(),
    sortKnockout: zod_1.z.enum(client_1.SortKnockout).optional(),
    allPos: zod_1.z.boolean().optional().default(false),
    setsToWinGroup: zod_1.z
        .number()
        .int()
        .refine((val) => [2, 3, 4].includes(val), {
        message: 'Los sets para ganar en grupos deben ser 2 (al mejor de 3), 3 (al mejor de 5) o 4 (al mejor de 7)',
    })
        .optional()
        .default(2),
    setsToWinKnockout: zod_1.z
        .number()
        .int()
        .refine((val) => [2, 3, 4].includes(val), {
        message: 'Los sets para ganar en eliminatorias deben ser 2 (al mejor de 3), 3 (al mejor de 5) o 4 (al mejor de 7)',
    })
        .optional()
        .default(3),
});
const validateTournamentBusinessRules = (data, ctx) => {
    const type = data.rounds;
    const players = data.numPlayers;
    const groups = data.numGroup;
    const playersPerGroup = data.numGroupPlayers;
    const playersKnock = data.playersKnockout;
    if (!type)
        return;
    if (type === client_1.Rounds.TodosvsTodos) {
        if (players < 3 || players > 10) {
            ctx.addIssue({
                code: 'custom',
                message: 'Un torneo de Todos vs Todos debe tener entre 3 y 10 jugadores.',
                path: ['numPlayers'],
            });
        }
        if (groups === undefined || groups !== 1) {
            ctx.addIssue({
                code: 'custom',
                message: 'Un torneo de Todos vs Todos es una liga única, debe tener 1 solo grupo.',
                path: ['numGroup'],
            });
        }
    }
    if (type === client_1.Rounds.GruposKnockout) {
        if (players < 6 || players > 128) {
            ctx.addIssue({
                code: 'custom',
                message: 'Un torneo de Grupos y Eliminatorias debe tener entre 6 y 128 jugadores.',
                path: ['numPlayers'],
            });
        }
        if (!groups || groups < 2 || groups > 16) {
            ctx.addIssue({
                code: 'custom',
                message: 'Para este formato, debes crear entre 2 y 16 grupos.',
                path: ['numGroup'],
            });
        }
        if (!playersPerGroup || playersPerGroup < 3) {
            ctx.addIssue({
                code: 'custom',
                message: 'Debe haber al menos 3 jugadores por grupo en este formato.',
                path: ['numGroupPlayers'],
            });
        }
        if (!playersKnock) {
            ctx.addIssue({
                code: 'custom',
                message: 'Debe especificarse un número para que se clasifiquen a llave en este formato.',
                path: ['numKnockouts'],
            });
        }
        if (playersKnock && groups && playersKnock > players / groups) {
            ctx.addIssue({
                code: 'custom',
                message: 'No pueden haber más clasificados que jugadores en grupos.',
                path: ['numKnockouts'],
            });
        }
    }
    if (type === client_1.Rounds.Knockout) {
        if (players < 4 || players > 128) {
            ctx.addIssue({
                code: 'custom',
                message: 'Un torneo de solo Eliminatorias debe tener entre 4 y 128 jugadores.',
                path: ['numPlayers'],
            });
        }
        if (groups && groups > 0) {
            ctx.addIssue({
                code: 'custom',
                message: 'Un torneo de eliminación directa no puede tener configuración de grupos.',
                path: ['numGroup'],
            });
        }
    }
};
exports.validateTournamentBusinessRules = validateTournamentBusinessRules;
exports.createTournamentSchema = exports.baseTournamentObject.superRefine(exports.validateTournamentBusinessRules);
exports.registerParticipantSchema = zod_1.z.object({
    playerId: zod_1.z.uuid('El ID del jugador debe ser un UUID válido'),
    registeredAt: zod_1.z.iso.datetime('Formato de fecha inválido').optional(),
    status: zod_1.z.enum(client_1.PlayerTournamentStatus).optional(),
});

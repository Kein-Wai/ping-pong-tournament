"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const db_1 = __importDefault(require("../db"));
const match_1 = require("../schemas/match");
const zod_1 = require("zod");
const stats_1 = require("../utils/stats");
const match_processor_1 = require("../utils/match-processor");
const standings_1 = require("../utils/standings");
const router = (0, express_1.Router)();
router.get('/', async (req, res) => {
    try {
        if (req.user) {
            const clubId = req.user.clubId;
            const userId = req.user.id;
            const role = req.user.role;
            let whereCondition = {};
            if (role === 'AdminClub' || (role === 'Player' && clubId)) {
                whereCondition = {
                    OR: [
                        { tournament: { clubId: clubId } },
                        { playerOne: { clubId: clubId } },
                        { playerTwo: { clubId: clubId } },
                    ],
                };
            }
            else if (role === 'Player' && !clubId) {
                whereCondition = {
                    OR: [{ playerOneId: userId }, { playerTwoId: userId }],
                };
            }
            const matches = await db_1.default.match.findMany({
                where: whereCondition,
                orderBy: { dateStart: 'desc' },
                include: {
                    playerOne: {
                        select: {
                            id: true,
                            name: true,
                            surname: true,
                            email: true,
                            club: {
                                select: { id: true, name: true, city: true },
                            },
                        },
                    },
                    playerTwo: {
                        select: {
                            id: true,
                            name: true,
                            surname: true,
                            email: true,
                            club: {
                                select: { id: true, name: true, city: true },
                            },
                        },
                    },
                    tournament: true,
                    league: true,
                    group: true,
                    knockout: true,
                },
            });
            res.status(200).json(matches);
        }
        else {
            res
                .status(401)
                .json({ error: 'Acceso denegado. Usuario no proporcionado o formato incorrecto.' });
        }
    }
    catch (error) {
        console.error('Error al obtener los partidos:', error);
        res.status(500).json({ error: 'Error interno al obtener los partidos' });
    }
});
router.post('/', async (req, res) => {
    try {
        const validation = match_1.createMatchSchema.safeParse(req.body);
        if (!validation.success) {
            res.status(400).json({
                error: 'Datos inválidos',
                details: zod_1.z.treeifyError(validation.error),
            });
            return;
        }
        const { playerOneId, playerTwoId, dateStart, tournamentId, groupId, knockoutId, leagueId, status, setOnePlayerOne, setOnePlayerTwo, setTwoPlayerOne, setTwoPlayerTwo, setThreePlayerOne, setThreePlayerTwo, setFourPlayerOne, setFourPlayerTwo, setFivePlayerOne, setFivePlayerTwo, setSixPlayerOne, setSixPlayerTwo, setSevenPlayerOne, setSevenPlayerTwo, } = validation.data;
        if (playerOneId === playerTwoId) {
            res.status(400).json({ error: 'Un jugador no puede enfrentarse a sí mismo' });
            return;
        }
        const newMatch = await db_1.default.match.create({
            data: {
                playerOneId,
                playerTwoId,
                dateStart: dateStart ? new Date(dateStart) : new Date(),
                status: status,
                tournamentId,
                groupId,
                knockoutId,
                leagueId,
                setOnePlayerOne,
                setOnePlayerTwo,
                setTwoPlayerOne,
                setTwoPlayerTwo,
                setThreePlayerOne,
                setThreePlayerTwo,
                setFourPlayerOne,
                setFourPlayerTwo,
                setFivePlayerOne,
                setFivePlayerTwo,
                setSixPlayerOne,
                setSixPlayerTwo,
                setSevenPlayerOne,
                setSevenPlayerTwo,
            },
        });
        await (0, stats_1.handleMatchStatsUpdate)(db_1.default, null, newMatch);
        await (0, match_processor_1.processMatchResult)(db_1.default, newMatch);
        res.status(201).json({
            message: 'Partido programado con éxito',
            match: newMatch,
        });
    }
    catch (error) {
        console.error('Error al crear el partido:', error);
        res.status(500).json({ error: 'Error interno al crear el partido' });
    }
});
router.put('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const validation = match_1.baseMatchObject.partial().safeParse(req.body);
        if (!validation.success) {
            res.status(400).json({
                error: 'Datos inválidos',
                details: zod_1.z.treeifyError(validation.error),
            });
            return;
        }
        const existingMatch = await db_1.default.match.findUnique({
            where: { id },
        });
        if (!existingMatch) {
            res.status(404).json({ error: 'Partido no encontrado' });
            return;
        }
        const mergedData = {
            ...existingMatch,
            ...validation.data,
            dateStart: existingMatch.dateStart instanceof Date
                ? existingMatch.dateStart.toISOString()
                : existingMatch.dateStart,
        };
        const businessValidation = match_1.baseMatchObject
            .superRefine(match_1.validateMatchBusinessRules)
            .safeParse(mergedData);
        if (!businessValidation.success) {
            res.status(400).json({
                error: 'El marcador no cumple las reglas del partido',
                details: zod_1.z.treeifyError(businessValidation.error),
            });
            return;
        }
        const data = validation.data;
        delete data.setsToWin;
        const matchStatus = data.status ? data.status : existingMatch.status;
        const updatedMatch = await db_1.default.match.update({
            where: { id },
            data: {
                ...data,
                status: matchStatus,
            },
        });
        await (0, stats_1.handleMatchStatsUpdate)(db_1.default, existingMatch, updatedMatch);
        if (updatedMatch.groupId) {
            await (0, standings_1.updateGroupStandings)(db_1.default, updatedMatch.groupId);
        }
        await (0, match_processor_1.processMatchResult)(db_1.default, updatedMatch);
        res.status(200).json({
            message: 'Partido actualizado con éxito',
            match: updatedMatch,
        });
    }
    catch (error) {
        console.error('Error al actualizar el partido:', error);
        res.status(500).json({ error: 'Error interno al actualizar el partido' });
    }
});
exports.default = router;

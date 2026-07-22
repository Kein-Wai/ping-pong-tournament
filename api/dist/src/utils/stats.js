"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.handleMatchStatsUpdate = void 0;
const client_1 = require("@prisma/client");
const constants_1 = require("../constants");
const match_1 = require("./match");
// Función auxiliar para calcular la variación de ELO de un partido
const calculateEloDeltas = (p1Score, p2Score, p1WinsMatch) => {
    const diff = Math.abs(p1Score - p2Score);
    let bucket;
    if (diff <= 24)
        bucket = constants_1.POINTS_MATCHES['24'];
    else if (diff <= 49)
        bucket = constants_1.POINTS_MATCHES['49'];
    else if (diff <= 99)
        bucket = constants_1.POINTS_MATCHES['99'];
    else if (diff <= 249)
        bucket = constants_1.POINTS_MATCHES['249'];
    else
        bucket = constants_1.POINTS_MATCHES['750'];
    const p1IsFavorite = p1Score >= p2Score;
    let p1ScoreDelta = 0;
    let p2ScoreDelta = 0;
    if (p1WinsMatch) {
        const pointsExchanged = p1IsFavorite ? bucket[0] : bucket[1];
        p1ScoreDelta = pointsExchanged;
        p2ScoreDelta = -Math.min(pointsExchanged, p2Score - 1);
    }
    else {
        const pointsExchanged = !p1IsFavorite ? bucket[0] : bucket[1];
        p2ScoreDelta = pointsExchanged;
        p1ScoreDelta = -Math.min(pointsExchanged, p1Score - 1);
    }
    return { p1ScoreDelta, p2ScoreDelta };
};
// Función principal que soporta edición/reversión de partidos
const handleMatchStatsUpdate = async (prisma, previousMatch, newMatch) => {
    const wasCompleted = previousMatch?.status === client_1.MatchStatus.Completado;
    const isCompletedNow = newMatch.status === client_1.MatchStatus.Completado;
    // Si no estaba completado antes ni lo está ahora, no hay nada que calcular
    if (!wasCompleted && !isCompletedNow) {
        return;
    }
    // ------------------------------------------------------------------
    // 1. PASO 1: REVERTIR MARCADOR ANTIGUO (Si el partido ya estaba completado)
    // ------------------------------------------------------------------
    if (wasCompleted) {
        const prevRes = (0, match_1.calculateMatchResults)(previousMatch);
        const p1Stats = await prisma.stats.findFirst({ where: { userId: previousMatch.playerOneId } });
        const p2Stats = await prisma.stats.findFirst({ where: { userId: previousMatch.playerTwoId } });
        if (p1Stats && p2Stats) {
            const p1Score = p1Stats.elo || constants_1.SCORE_DEFAULT;
            const p2Score = p2Stats.elo || constants_1.SCORE_DEFAULT;
            const { p1ScoreDelta, p2ScoreDelta } = calculateEloDeltas(p1Score, p2Score, prevRes.p1WinsMatch);
            // Deshacemos (restamos) los stats antiguos
            await prisma.stats.update({
                where: { id: p1Stats.id },
                data: {
                    elo: { decrement: p1ScoreDelta },
                    matchWon: { decrement: prevRes.p1WinsMatch ? 1 : 0 },
                    matchLost: { decrement: prevRes.p1WinsMatch ? 0 : 1 },
                    setWon: { decrement: prevRes.p1Sets },
                    setLost: { decrement: prevRes.p2Sets },
                    pointWon: { decrement: prevRes.p1Points },
                    pointLost: { decrement: prevRes.p2Points },
                },
            });
            await prisma.stats.update({
                where: { id: p2Stats.id },
                data: {
                    elo: { decrement: p2ScoreDelta },
                    matchWon: { decrement: prevRes.p1WinsMatch ? 0 : 1 },
                    matchLost: { decrement: prevRes.p1WinsMatch ? 1 : 0 },
                    setWon: { decrement: prevRes.p2Sets },
                    setLost: { decrement: prevRes.p1Sets },
                    pointWon: { decrement: prevRes.p2Points },
                    pointLost: { decrement: prevRes.p1Points },
                },
            });
        }
    }
    // ------------------------------------------------------------------
    // 2. PASO 2: APLICAR MARCADOR NUEVO (Si el estado actual es Completado)
    // ------------------------------------------------------------------
    if (isCompletedNow) {
        const newRes = (0, match_1.calculateMatchResults)(newMatch);
        const p1Stats = await prisma.stats.findFirst({ where: { userId: newMatch.playerOneId } });
        const p2Stats = await prisma.stats.findFirst({ where: { userId: newMatch.playerTwoId } });
        let p1Score = p1Stats?.elo && p1Stats.elo > 0 ? p1Stats.elo : constants_1.SCORE_DEFAULT;
        let p2Score = p2Stats?.elo && p2Stats.elo > 0 ? p2Stats.elo : constants_1.SCORE_DEFAULT;
        const { p1ScoreDelta, p2ScoreDelta } = calculateEloDeltas(p1Score, p2Score, newRes.p1WinsMatch);
        const saveOrUpdate = async (userId, statsId, scoreDelta, wonMatch, lostMatch, wonSets, lostSets, wonPoints, lostPoints) => {
            if (statsId) {
                await prisma.stats.update({
                    where: { id: statsId },
                    data: {
                        elo: { increment: scoreDelta },
                        matchWon: { increment: wonMatch },
                        matchLost: { increment: lostMatch },
                        setWon: { increment: wonSets },
                        setLost: { increment: lostSets },
                        pointWon: { increment: wonPoints },
                        pointLost: { increment: lostPoints },
                    },
                });
            }
            else {
                await prisma.stats.create({
                    data: {
                        userId,
                        elo: constants_1.SCORE_DEFAULT + scoreDelta,
                        matchWon: wonMatch,
                        matchLost: lostMatch,
                        setWon: wonSets,
                        setLost: lostSets,
                        pointWon: wonPoints,
                        pointLost: lostPoints,
                        tournamentWon: 0,
                        tournamentLost: 0,
                    },
                });
            }
        };
        await saveOrUpdate(newMatch.playerOneId, p1Stats?.id, p1ScoreDelta, newRes.p1WinsMatch ? 1 : 0, newRes.p1WinsMatch ? 0 : 1, newRes.p1Sets, newRes.p2Sets, newRes.p1Points, newRes.p2Points);
        await saveOrUpdate(newMatch.playerTwoId, p2Stats?.id, p2ScoreDelta, newRes.p1WinsMatch ? 0 : 1, newRes.p1WinsMatch ? 1 : 0, newRes.p2Sets, newRes.p1Sets, newRes.p2Points, newRes.p1Points);
    }
};
exports.handleMatchStatsUpdate = handleMatchStatsUpdate;

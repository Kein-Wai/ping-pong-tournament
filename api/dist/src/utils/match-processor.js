"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.processMatchResult = void 0;
const client_1 = require("@prisma/client");
const client_2 = require("@prisma/client");
const standings_1 = require("./standings");
const knockout_1 = require("./knockout");
const processMatchResult = async (prisma, match) => {
    if (match.status !== client_2.MatchStatus.Completado) {
        return;
    }
    if (match.tournamentId) {
        const tournament = await prisma.tournament.findUnique({
            where: { id: match.tournamentId },
        });
        if (tournament) {
            if (match.groupId) {
                const group = await prisma.tournamentGroup.findUnique({
                    where: { id: match.groupId },
                });
                if (group) {
                    const groupResult = await (0, standings_1.updateGroupStandings)(prisma, group.id);
                    if (groupResult?.isGroupPhaseFinished) {
                        console.log(`🏆 Fase de grupos terminada para el torneo ${tournament.id}. Generando eliminatorias...`);
                        try {
                            const allGroups = await prisma.tournamentGroup.findMany({
                                where: { tournamentId: tournament.id },
                            });
                            for (const g of allGroups) {
                                await (0, standings_1.updateGroupStandings)(prisma, g.id);
                            }
                            const harvest = await (0, knockout_1.harvestKnockoutPlayers)(prisma, tournament.id);
                            if (harvest.bracketA.length > 0) {
                                const matchesA = (0, knockout_1.createKnockoutDraw)(harvest.bracketA, tournament.sortKnockout || 'Siembra', tournament.allPos || false);
                                await (0, knockout_1.saveKnockoutBracket)(prisma, tournament.id, client_1.KnockoutType.A, matchesA, new Date());
                            }
                            if (harvest.typeKnockout === 'LlaveAB' && harvest.bracketB.length > 0) {
                                const matchesB = (0, knockout_1.createKnockoutDraw)(harvest.bracketB, tournament.sortKnockout || 'Siembra', tournament.allPos || false);
                                await (0, knockout_1.saveKnockoutBracket)(prisma, tournament.id, client_1.KnockoutType.B, matchesB, new Date());
                            }
                            await prisma.tournament.update({
                                where: { id: tournament.id },
                                data: { knockoutCreated: true },
                            });
                            console.log('✅ Cuadro de eliminatorias generado y guardado exitosamente.');
                        }
                        catch (error) {
                            console.error('❌ Error crítico al generar el cuadro automáticamente:', error);
                        }
                    }
                }
            }
            if (match.knockoutId) {
                const knockout = await prisma.tournamentKnockout.findUnique({
                    where: { id: match.knockoutId },
                });
                if (knockout) {
                    console.log(`Procesando partido de eliminatoria: ${knockout.id}`);
                    await (0, knockout_1.processKnockoutAdvancement)(prisma, match.id);
                }
            }
        }
    }
    if (match.leagueId) {
        const league = await prisma.league.findUnique({
            where: { id: match.leagueId },
        });
        if (league) {
            console.log(`Procesando partido de liga: ${league.id}`);
        }
    }
};
exports.processMatchResult = processMatchResult;

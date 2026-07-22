"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.fetchGroupClassifications = exports.fetchGroupMatches = void 0;
const fetchGroupMatches = async (prisma, tournamentId, groupId) => {
    const whereClause = {
        tournamentId,
        knockoutId: null,
    };
    if (groupId) {
        whereClause.groupId = groupId;
    }
    return await prisma.match.findMany({
        where: whereClause,
        include: {
            playerOne: { select: { id: true, name: true, surname: true } },
            playerTwo: { select: { id: true, name: true, surname: true } },
            group: { select: { id: true, group: true } },
        },
        orderBy: [{ group: { group: 'asc' } }, { dateStart: 'asc' }],
    });
};
exports.fetchGroupMatches = fetchGroupMatches;
const fetchGroupClassifications = async (prisma, tournamentId, groupId) => {
    const whereClause = {
        tournamentGroup: { tournamentId },
    };
    if (groupId) {
        whereClause.tournamentGroupId = groupId;
    }
    return await prisma.tournamentGroupClas.findMany({
        where: whereClause,
        include: {
            player: { select: { id: true, name: true, surname: true, stats: true } },
            tournamentGroup: { select: { group: true } },
        },
        orderBy: [{ tournamentGroup: { group: 'asc' } }, { position: 'asc' }],
    });
};
exports.fetchGroupClassifications = fetchGroupClassifications;

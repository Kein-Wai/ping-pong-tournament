import { Router } from 'express';
import prisma from '../db';
import { createMatchSchema, baseMatchObject, validateMatchBusinessRules } from '../schemas/match';
import { z } from 'zod';
import { handleMatchStatsUpdate } from '../utils/stats';
import { processMatchResult } from '../utils/match-processor';
import { updateGroupStandings } from '../utils/standings';
import { resolveCurrentSeason } from '../utils/season';
import { getScopeClubId, hasClubPermission } from '../utils/auth';
import { getMatchOwnerClubId } from '../utils/match-access';
import { requireAdminClub } from '../middleware/auth.middleware';
import { asyncHandler, sendData, sendMessage } from '../http/response';

const router = Router();

router.get(
  '/',
  asyncHandler(async (req, res) => {
    if (!req.user) {
      return res.status(401).json({ success: false, error: 'Usuario no autenticado' });
    }

    const userId = req.user.id;
    const role = req.user.role;
    // El club al que queda acotado el alcance lo decide el seam de utils/auth.
    const scopeClubId = getScopeClubId(req.user);

    let whereCondition: any = {};

    if (role === 'SuperAdmin') {
      // El SuperAdmin puede ver absolutamente todos los partidos del sistema
      whereCondition = {};
    } else if (role === 'Player' && !scopeClubId) {
      // 🚨 BLOQUEO DE SEGURIDAD: Jugador libre SOLO ve sus propios partidos, jamás los de otros libres
      whereCondition = {
        OR: [{ playerOneId: userId }, { playerTwoId: userId }],
      };
    } else if (!scopeClubId) {
      // 🚨 BLOQUEO DE SEGURIDAD: Si es Admin pero su token no tiene clubId, le devolvemos vacío para evitar la fuga de nulos
      return res.status(200).json({ success: true, data: [] });
    } else {
      // Ve los partidos de su club (Torneos internos, ligas, etc)
      whereCondition = {
        OR: [
          { tournament: { clubId: scopeClubId } },
          { playerOne: { clubId: scopeClubId } },
          { playerTwo: { clubId: scopeClubId } },
        ],
      };
    }

    const matches = await prisma.match.findMany({
      where: whereCondition,
      orderBy: { dateStart: 'desc' },
      include: {
        playerOne: {
          select: {
            id: true,
            name: true,
            surname: true,
            email: true,
            dominantHand: true,
            playstyle: true,
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
            dominantHand: true,
            playstyle: true,
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

    sendData(res, matches);
  }, 'Error interno al obtener los partidos'),
);

router.post(
  '/',
  requireAdminClub,
  asyncHandler(async (req, res) => {
    const validation = createMatchSchema.safeParse(req.body);

    if (!validation.success) {
      res
        .status(400)
        .json({
          success: false,
          error: 'Datos inválidos',
          details: z.treeifyError(validation.error),
        });
      return;
    }

    const {
      playerOneId,
      playerTwoId,
      dateStart,
      tournamentId,
      groupId,
      knockoutId,
      leagueId,
      status,
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
    } = validation.data;

    if (playerOneId === playerTwoId) {
      res.status(400).json({ success: false, error: 'Un jugador no puede enfrentarse a sí mismo' });
      return;
    }

    // Autorización ANTES de escribir: el partido es del club del torneo o, sin torneo, del de los jugadores.
    const ownership = tournamentId
      ? {
          tournament: await prisma.tournament.findUnique({
            where: { id: tournamentId },
            select: { clubId: true },
          }),
        }
      : {
          playerOne: await prisma.user.findUnique({
            where: { id: playerOneId },
            select: { clubId: true },
          }),
        };
    if (!hasClubPermission(req.user, getMatchOwnerClubId(ownership))) {
      res
        .status(403)
        .json({ success: false, error: 'No tienes permiso para crear partidos en este club' });
      return;
    }
    const currentSeason = await resolveCurrentSeason(prisma);
    const newMatch = await prisma.match.create({
      data: {
        playerOneId,
        playerTwoId,
        seasonId: currentSeason.id,
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

    await handleMatchStatsUpdate(prisma, null, newMatch);

    await processMatchResult(prisma, newMatch);

    sendMessage(res, 'Partido programado con éxito', 201, { match: newMatch });
  }, 'Error interno al crear el partido'),
);

router.put(
  '/:id',
  requireAdminClub,
  asyncHandler(async (req, res) => {
    const id = req.params.id as string;

    const validation = baseMatchObject.partial().safeParse(req.body);

    if (!validation.success) {
      res
        .status(400)
        .json({
          success: false,
          error: 'Datos inválidos',
          details: z.treeifyError(validation.error),
        });
      return;
    }

    const existingMatch = await prisma.match.findUnique({
      where: { id },
      include: {
        tournament: { select: { clubId: true } },
        playerOne: { select: { clubId: true } },
      },
    });

    if (!existingMatch) {
      res.status(404).json({ success: false, error: 'Partido no encontrado' });
      return;
    }

    if (!hasClubPermission(req.user, getMatchOwnerClubId(existingMatch))) {
      res.status(403).json({ success: false, error: 'No tienes permiso para editar este partido' });
      return;
    }

    const mergedData = {
      ...existingMatch,
      ...validation.data,
      dateStart:
        existingMatch.dateStart instanceof Date
          ? existingMatch.dateStart.toISOString()
          : existingMatch.dateStart,
    };

    const businessValidation = baseMatchObject
      .superRefine(validateMatchBusinessRules)
      .safeParse(mergedData);

    if (!businessValidation.success) {
      res
        .status(400)
        .json({
          success: false,
          error: 'El marcador no cumple las reglas del partido',
          details: z.treeifyError(businessValidation.error),
        });
      return;
    }

    const data = validation.data;
    delete (data as any).setsToWin;

    const matchStatus = data.status ? data.status : existingMatch.status;

    const updatedMatch = await prisma.match.update({
      where: { id },
      data: {
        ...data,
        status: matchStatus,
      },
    });

    await handleMatchStatsUpdate(prisma, existingMatch, updatedMatch);

    if (updatedMatch.groupId) {
      await updateGroupStandings(prisma, updatedMatch.groupId);
    }

    await processMatchResult(prisma, updatedMatch);

    sendMessage(res, 'Partido actualizado con éxito', 200, { match: updatedMatch });
  }, 'Error interno al actualizar el partido'),
);

export default router;

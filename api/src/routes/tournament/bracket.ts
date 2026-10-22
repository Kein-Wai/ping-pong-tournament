import { Router } from 'express';
import prisma from '../../db';
import { z } from 'zod';
import { MatchStatus, PlayerTournamentStatus, KnockoutType } from '@prisma/client';
import { resolveCurrentSeason } from '../../utils/season';
import { hasClubPermission } from '../../utils/auth';

const router = Router();
import { swapPlayersSchema } from '../../schemas/tournament';
import { generateTournamentGroups } from '../../utils/group-generator';
import { validateSwap, swapPlayers } from '../../utils/tournament-swap';
import { requireAdminClub } from '../../middleware/auth.middleware';
import { BYE_USER_ID, TBD_USER_ID } from '../../constants';
import { generateTournamentExcel } from '../../services/excel';

router.post('/:id/generate-groups', async (req, res) => {
  try {
    const tournamentId = req.params.id;

    const result = await generateTournamentGroups(prisma, tournamentId);

    res.status(200).json(result);
  } catch (error: any) {
    console.error('Error al generar grupos:', error);

    res.status(400).json({ error: error.message || 'Error al generar los grupos' });
  }
});

router.put('/:id/swap-players', requireAdminClub, async (req, res) => {
  try {
    const tournamentId = req.params.id as string;
    const adminClubId = req.user?.clubId;

    const tournament = await prisma.tournament.findUnique({ where: { id: tournamentId } });
    if (!tournament) return res.status(404).json({ error: 'Torneo no encontrado' });

    if (!hasClubPermission(req.user, tournament.clubId)) {
      return res.status(403).json({ error: 'No tienes permisos sobre este torneo' });
    }
    if (tournament.status === 'Completado') {
      return res
        .status(400)
        .json({ error: 'No se pueden intercambiar jugadores en un torneo finalizado' });
    }

    const validation = swapPlayersSchema.safeParse(req.body);
    if (!validation.success)
      return res
        .status(400)
        .json({ error: 'Datos inválidos', details: z.treeifyError(validation.error) });

    const { playerAId, playerBId } = validation.data;

    // 1. BLOQUEO ANTI-CLONACIÓN (Fantasmas)
    if (playerAId === playerBId)
      return res.status(400).json({ error: 'Debes seleccionar dos jugadores distintos' });
    if (
      [playerAId, playerBId].includes(BYE_USER_ID) ||
      [playerAId, playerBId].includes(TBD_USER_ID)
    ) {
      return res.status(400).json({
        error:
          'No puedes intercambiar jugadores comodín (Exentos o TBD). Selecciona dos jugadores reales.',
      });
    }

    // 2. BLOQUEO TEMPORAL (Congelación del Sorteo)
    const isGroups = tournament.status === 'Grupos';
    const isKnockout = [
      'R128avos',
      'R64avos',
      'R32avos',
      'R16avos',
      'Octavos',
      'Cuartos',
      'Semifinales',
      'Final',
    ].includes(tournament.status || '');

    if (isGroups) {
      const startedGroupMatches = await prisma.match.count({
        where: { tournamentId, groupId: { not: null }, status: { not: 'Programado' } },
      });
      if (startedGroupMatches > 0)
        return res.status(400).json({
          error: 'La fase de grupos ya ha comenzado. No se admiten cambios de posiciones.',
        });
    } else if (isKnockout) {
      const startedKnockoutMatches = await prisma.match.count({
        where: {
          tournamentId,
          knockoutId: { not: null },
          status: { not: 'Programado' },
          playerOneId: { not: BYE_USER_ID },
          playerTwoId: { not: BYE_USER_ID }, // Ignoramos los "Pases directos" que se autocompletan al inicio
        },
      });
      if (startedKnockoutMatches > 0)
        return res.status(400).json({
          error: 'Las eliminatorias ya han comenzado. No se admiten cambios en el cuadro.',
        });
    }

    // 3. TRANSACCIÓN SEGURA (Con protección del historial)
    await prisma.$transaction(async (tx) => {
      // A) Swap de Grupos (SÓLO si seguimos en fase de grupos)
      if (isGroups) {
        const groupClasA = await tx.tournamentGroupClas.findFirst({
          where: { playerId: playerAId, tournamentGroup: { tournamentId } },
        });
        const groupClasB = await tx.tournamentGroupClas.findFirst({
          where: { playerId: playerBId, tournamentGroup: { tournamentId } },
        });

        if (groupClasA)
          await tx.tournamentGroupClas.update({
            where: { id: groupClasA.id },
            data: { playerId: playerBId },
          });
        if (groupClasB)
          await tx.tournamentGroupClas.update({
            where: { id: groupClasB.id },
            data: { playerId: playerAId },
          });
      }

      // 👇 B) NUEVO: Swap de Clasificación Final (Vital para sustituciones en Eliminatorias)
      // Si un eliminado (ej. puesto 17) sustituye a un clasificado (sin puesto aún), intercambiamos sus destinos
      const clasA = await tx.tournamentClas.findFirst({
        where: { playerId: playerAId, tournamentId },
      });
      const clasB = await tx.tournamentClas.findFirst({
        where: { playerId: playerBId, tournamentId },
      });

      if (clasA)
        await tx.tournamentClas.update({ where: { id: clasA.id }, data: { playerId: playerBId } });
      if (clasB)
        await tx.tournamentClas.update({ where: { id: clasB.id }, data: { playerId: playerAId } });

      // B) Swap de Partidos (Aislando por fase para no reescribir la historia)
      const matchWhere: any = {
        tournamentId,
        OR: [
          { playerOneId: playerAId },
          { playerTwoId: playerAId },
          { playerOneId: playerBId },
          { playerTwoId: playerBId },
        ],
      };

      if (isGroups) matchWhere.groupId = { not: null };
      else if (isKnockout) matchWhere.knockoutId = { not: null };

      const matchesToSwap = await tx.match.findMany({ where: matchWhere });

      for (const m of matchesToSwap) {
        let newP1 = m.playerOneId;
        let newP2 = m.playerTwoId;

        if (m.playerOneId === playerAId) newP1 = playerBId;
        else if (m.playerOneId === playerBId) newP1 = playerAId;

        if (m.playerTwoId === playerAId) newP2 = playerBId;
        else if (m.playerTwoId === playerBId) newP2 = playerAId;

        await tx.match.update({
          where: { id: m.id },
          data: { playerOneId: newP1, playerTwoId: newP2 },
        });
      }
    });

    res.status(200).json({ success: true, message: 'Jugadores intercambiados con éxito' });
  } catch (error) {
    console.error('Error al intercambiar jugadores:', error);
    res.status(500).json({ error: 'Error interno al intercambiar jugadores' });
  }
});

router.post('/generate-excel', async (req, res) => {
  try {
    const { tournamentInfo, players } = req.body;

    // Generamos el Excel pasando la info real
    const excelBuffer = await generateTournamentExcel(tournamentInfo, players);

    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    );
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="Torneo_${tournamentInfo.name.replace(/\s+/g, '_')}.xlsx"`,
    );

    res.send(excelBuffer);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error al generar el Excel' });
  }
});

export default router;

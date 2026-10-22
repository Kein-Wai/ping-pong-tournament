import { Router } from 'express';
import prisma from '../../db';
import { z } from 'zod';
import { MatchStatus, PlayerTournamentStatus, KnockoutType } from '@prisma/client';
import { resolveCurrentSeason } from '../../utils/season';
import { hasClubPermission } from '../../utils/auth';

const router = Router();
import { registerParticipantSchema } from '../../schemas/tournament';
import { registerParticipant } from '../../utils/tournament-inscriptions';
import { requireAdminClub } from '../../middleware/auth.middleware';
import { enviarCorreoGenerico } from '../../services/email';
import { templateInscripcionTorneo } from '../../utils/emailtemplate';

router.post('/:id/register', async (req, res) => {
  try {
    const tournamentId = req.params.id;
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({ error: 'Usuario no autenticado' });
    }

    // 👇 Traemos los datos frescos del usuario desde la BD
    const currentUser = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!currentUser || !currentUser.email || !currentUser.name) {
      return res.status(401).json({ error: 'Faltan datos del usuario en la base de datos' });
    }

    const validation = registerParticipantSchema.safeParse(req.body);
    if (!validation.success) {
      res.status(400).json({ error: 'Datos inválidos', details: validation.error.format() });
      return;
    }
    const { playerId } = validation.data;

    const tournament = await prisma.tournament.findUnique({
      where: { id: tournamentId },
      include: {
        _count: {
          select: { participants: true },
        },
      },
    });

    if (!tournament) {
      res.status(404).json({ error: 'Torneo no encontrado' });
      return;
    }

    if (tournament.typeTournament === 'Interno') {
      if (currentUser.clubId !== tournament.clubId || currentUser.clubStatus !== 'Aprobado') {
        res.status(403).json({
          error:
            'Acceso denegado. Este torneo es privado y exclusivo para los miembros del club organizador.',
        });
        return;
      }
    }

    if (tournament.groupsCreated) {
      res
        .status(400)
        .json({ error: 'Las inscripciones están cerradas. Los grupos ya se han generado.' });
      return;
    }

    if (tournament._count.participants >= tournament.numPlayers) {
      res.status(400).json({ error: 'El torneo ya ha alcanzado el límite máximo de jugadores' });
      return;
    }

    const existingParticipant = await prisma.tournamentParticipant.findUnique({
      where: {
        tournamentId_playerId: {
          tournamentId,
          playerId,
        },
      },
    });

    if (existingParticipant) {
      res.status(400).json({ error: 'El jugador ya está inscrito en este torneo' });
      return;
    }

    const newParticipant = await prisma.tournamentParticipant.create({
      data: {
        tournamentId,
        playerId,
        status: PlayerTournamentStatus.Pendiente,
      },
    });

    enviarCorreoGenerico(
      currentUser.email,
      'Te han inscrito en un nuevo torneo',
      templateInscripcionTorneo(currentUser.name, tournament),
    ).catch(console.error);

    res.status(201).json({
      message: 'Jugador inscrito con éxito',
      participant: newParticipant,
    });
  } catch (error) {
    console.error('Error al inscribir jugador:', error);
    res.status(500).json({ error: 'Error interno al inscribir jugador' });
  }
});

router.post('/:id/register-bulk', requireAdminClub, async (req, res) => {
  try {
    const tournamentId = req.params.id as string;
    const { playerIds } = req.body; // Array de IDs
    const adminClubId = req.user?.clubId;

    const tournament = await prisma.tournament.findUnique({
      where: { id: tournamentId },
      include: { _count: { select: { participants: true } } },
    });

    if (!tournament) return res.status(404).json({ error: 'Torneo no encontrado' });

    if (!hasClubPermission(req.user, tournament.clubId)) {
      return res.status(403).json({ error: 'No tienes permiso sobre este torneo' });
    }
    if (tournament.groupsCreated) {
      return res.status(400).json({ error: 'Las inscripciones están cerradas.' });
    }

    const availableSpots = tournament.numPlayers - tournament._count.participants;
    if (playerIds.length > availableSpots) {
      return res.status(400).json({ error: `Solo quedan ${availableSpots} plazas disponibles.` });
    }

    // Filtrar los que ya están inscritos por si acaso
    const existing = await prisma.tournamentParticipant.findMany({
      where: { tournamentId, playerId: { in: playerIds } },
    });
    const existingIds = existing.map((e) => e.playerId);
    const newPlayers = playerIds.filter((id: string) => !existingIds.includes(id));

    // Insertamos los nuevos confirmándolos directamente
    const dataToInsert = newPlayers.map((id: string) => ({
      tournamentId,
      playerId: id,
      status: 'Confirmado' as any,
    }));

    await prisma.tournamentParticipant.createMany({ data: dataToInsert });

    if (newPlayers.length > 0) {
      const currentSeason = await resolveCurrentSeason(prisma);
      await prisma.stats.updateMany({
        where: { userId: { in: newPlayers }, seasonId: currentSeason.id },
        data: { tournamentPart: { increment: 1 } },
      });
    }

    // 👇 NUEVO: Buscamos a los jugadores recién inscritos para mandarles el email
    if (newPlayers.length > 0) {
      const enrolledUsers = await prisma.user.findMany({
        where: { id: { in: newPlayers } },
        select: { email: true, name: true },
      });

      // Disparamos los correos en segundo plano (Fire-and-forget)
      enrolledUsers.forEach((user) => {
        if (user.email && user.name && !user.email.endsWith('.local')) {
          enviarCorreoGenerico(
            user.email,
            'Te han inscrito en un nuevo torneo',
            templateInscripcionTorneo(user.name, tournament),
          ).catch((err) => console.error(`Fallo silencioso al enviar email a ${user.email}:`, err));
        }
      });
    }

    res.status(201).json({ success: true, message: 'Jugadores inscritos con éxito' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error al inscribir jugadores masivamente' });
  }
});

router.put('/:id/participants/:playerId/status', requireAdminClub, async (req, res) => {
  try {
    const id = req.params.id as string;
    const playerId = req.params.playerId as string;
    const { status } = req.body;
    const adminClubId = req.user?.clubId;

    const currentSeason = await resolveCurrentSeason(prisma);

    const tournament = await prisma.tournament.findUnique({ where: { id } });
    if (!tournament || !hasClubPermission(req.user, tournament.clubId)) {
      return res.status(403).json({ error: 'No tienes permisos sobre este torneo' });
    }

    const currentParticipant = await prisma.tournamentParticipant.findUnique({
      where: { tournamentId_playerId: { tournamentId: id, playerId } },
    });

    if (!currentParticipant) {
      return res.status(404).json({ error: 'Participante no encontrado' });
    }

    const updatedParticipant = await prisma.tournamentParticipant.update({
      where: { tournamentId_playerId: { tournamentId: id, playerId } },
      data: { status },
    });

    if (status === 'NoPresentado' && currentParticipant.status !== 'NoPresentado') {
      await prisma.stats.updateMany({
        where: { userId: playerId, seasonId: currentSeason.id },
        data: { elo: { decrement: 100 } },
      });
    } else if (status !== 'NoPresentado' && currentParticipant.status === 'NoPresentado') {
      await prisma.stats.updateMany({
        where: { userId: playerId, seasonId: currentSeason.id },
        data: { elo: { increment: 100 } },
      });
    }

    if (status === 'Confirmado' && currentParticipant.status !== 'Confirmado') {
      await prisma.stats.updateMany({
        where: { userId: playerId, seasonId: currentSeason.id },
        data: { tournamentPart: { increment: 1 } },
      });
    } else if (status !== 'Confirmado' && currentParticipant.status === 'Confirmado') {
      // Si le quitan el "Confirmado" (porque lo pasan a Pendiente o NoPresentado), le restamos la participación
      await prisma.stats.updateMany({
        where: { userId: playerId, seasonId: currentSeason.id },
        data: { tournamentPart: { decrement: 1 } },
      });
    }

    res.status(200).json({ success: true, message: `Jugador marcado como ${status}` });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error al actualizar el estado del participante' });
  }
});

export default router;

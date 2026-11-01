import { PrismaClient } from '@prisma/client';
import { RANDOM_PLAYER_EMAIL } from './players';

/**
 * Borra SOLO el contenido del club demo para regenerarlo, sin tocar nada ajeno:
 * - lo que cuelga del club (torneos, ligas, equipos, eventos, entrenamientos grupales);
 * - lo que pertenece a los jugadores demo (estadísticas, habilidades, análisis, planes);
 * - los jugadores aleatorios, que se reconocen por su email.
 *
 * Se conservan el club, su admin y las cuentas con login propio (`namedEmails`), para
 * que no cambien de id ni se cierren sus sesiones. Todo va en una transacción: o se
 * borra entero o no se borra nada.
 *
 * El orden importa: `Match`, `LeagueClas`, `Stats` y los grupos/eliminatorias no se
 * borran en cascada, así que van antes de aquello de lo que dependen.
 */
export const clearDemoContent = async (
  prisma: PrismaClient,
  clubId: string,
  namedEmails: readonly string[],
) => {
  await prisma.$transaction(
    async (tx) => {
      const randomPlayers = await tx.user.findMany({
        where: {
          clubId,
          email: { startsWith: RANDOM_PLAYER_EMAIL.prefix, endsWith: RANDOM_PLAYER_EMAIL.suffix },
        },
        select: { id: true },
      });
      const namedPlayers = await tx.user.findMany({
        where: { email: { in: [...namedEmails] } },
        select: { id: true },
      });
      const randomIds = randomPlayers.map((player) => player.id);
      const demoIds = [...randomIds, ...namedPlayers.map((player) => player.id)];

      const [tournaments, leagues] = await Promise.all([
        tx.tournament.findMany({ where: { clubId }, select: { id: true } }),
        tx.league.findMany({ where: { clubId }, select: { id: true } }),
      ]);
      const tournamentIds = tournaments.map((tournament) => tournament.id);
      const leagueIds = leagues.map((league) => league.id);

      // Partidos: los de los torneos y ligas del club y todos los de jugadores demo.
      await tx.match.deleteMany({
        where: {
          OR: [
            { tournamentId: { in: tournamentIds } },
            { leagueId: { in: leagueIds } },
            { playerOneId: { in: demoIds } },
            { playerTwoId: { in: demoIds } },
          ],
        },
      });

      // Torneos: primero lo que no se borra en cascada. Participantes y clasificación sí caen con el torneo.
      await tx.tournamentGroupClas.deleteMany({
        where: { tournamentGroup: { tournamentId: { in: tournamentIds } } },
      });
      await tx.tournamentGroup.deleteMany({ where: { tournamentId: { in: tournamentIds } } });
      await tx.tournamentKnockout.deleteMany({ where: { tournamentId: { in: tournamentIds } } });
      await tx.tournament.deleteMany({ where: { clubId } });

      // Ligas: la clasificación no cae en cascada; los participantes sí.
      await tx.leagueClas.deleteMany({
        where: { OR: [{ leagueId: { in: leagueIds } }, { playerId: { in: demoIds } }] },
      });
      await tx.league.deleteMany({ where: { clubId } });

      // Vida del club: equipos (con sus partidos y disponibilidades), calendario y entrenamientos.
      await tx.team.deleteMany({ where: { clubId } });
      await tx.clubEvent.deleteMany({ where: { clubId } });
      await tx.generalTrainingAttendance.deleteMany({ where: { clubId } });
      await tx.playerSkillUpdate.deleteMany({ where: { playerId: { in: demoIds } } });
      await tx.generalTraining.deleteMany({ where: { clubId } });
      await tx.generalTrainingSchedule.deleteMany({ where: { clubId } });

      // Contenido personal de los jugadores demo. Las sesiones de plan arrastran sus ejercicios.
      await tx.manualMatch.deleteMany({ where: { userId: { in: demoIds } } });
      await tx.trainingSession.deleteMany({ where: { playerId: { in: demoIds } } });
      await tx.playerTraining.deleteMany({ where: { playerId: { in: demoIds } } });
      await tx.stats.deleteMany({ where: { userId: { in: demoIds } } });
      await tx.playerSkills.deleteMany({ where: { userId: { in: demoIds } } });

      // Los jugadores aleatorios ya no tienen nada que los referencie.
      await tx.user.deleteMany({ where: { id: { in: randomIds } } });
    },
    { timeout: 120_000 },
  );
};

import {
  PrismaClient,
  Match,
  MatchStatus,
  KnockoutType,
  TypeKnockout,
  Rounds,
  Tournament,
  TournamentGroup,
} from '@prisma/client';
import { updateGroupStandings } from './standings';
import {
  harvestKnockoutPlayers,
  saveKnockoutBracket,
  processKnockoutAdvancement,
} from './knockout';
import { createKnockoutDraw } from './knockout-engine';
import { computeEliminatedPositions } from './tournament-positions';

type KnockoutHarvest = Awaited<ReturnType<typeof harvestKnockoutPlayers>>;

/**
 * Que hay que hacer cuando un partido pasa a "Completado".
 *
 * Este es el seam externo del modulo: una unica funcion. Por dentro coordina
 * tres operaciones independientes (cerrar un todos contra todos, generar el
 * cuadro de eliminatorias y avanzar una eliminatoria), cada una aislada en su
 * propia funcion para que el flujo se lea de un vistazo y para que un fallo en
 * una de ellas no arrase a las demas.
 */
export const processMatchResult = async (prisma: PrismaClient, match: Match) => {
  if (match.status !== MatchStatus.Completado) return;

  if (match.tournamentId) {
    await processTournamentMatch(prisma, match, match.tournamentId);
  }

  if (match.leagueId) {
    const league = await prisma.league.findUnique({
      where: { id: match.leagueId },
    });

    if (league) {
      console.info(`Procesando partido de liga: ${league.id}`);
    }
  }
};

/** Procesa un partido que pertenece a un torneo. */
const processTournamentMatch = async (
  prisma: PrismaClient,
  match: Match,
  tournamentId: string,
) => {
  const tournament = await prisma.tournament.findUnique({
    where: { id: tournamentId },
  });

  if (!tournament) return;

  if (match.groupId) {
    await advanceGroupPhase(prisma, tournament, match.groupId);
  }

  if (match.knockoutId) {
    const knockout = await prisma.tournamentKnockout.findUnique({
      where: { id: match.knockoutId },
    });

    if (knockout) {
      await processKnockoutAdvancement(prisma, match.id);
    }
  }
};

/**
 * Avanza la fase de grupos: recalcula la tabla del grupo y, cuando ya no
 * quedan partidos pendientes, cierra el torneo o genera el cuadro de
 * eliminatorias.
 */
const advanceGroupPhase = async (
  prisma: PrismaClient,
  tournament: Tournament,
  groupId: string,
) => {
  const group = await prisma.tournamentGroup.findUnique({
    where: { id: groupId },
  });

  if (!group) return;

  const groupResult = await updateGroupStandings(prisma, group.id);

  if (!groupResult?.isGroupPhaseFinished) return;

  if (tournament.rounds === Rounds.TodosvsTodos) {
    await closeRoundRobinTournament(prisma, tournament, group);
    return;
  }

  await createKnockoutFromGroups(prisma, tournament);
};

/**
 * Cierra un torneo de todos contra todos: fija las posiciones finales, suma la
 * victoria al ganador y marca el torneo como completado.
 */
const closeRoundRobinTournament = async (
  prisma: PrismaClient,
  tournament: Tournament,
  group: TournamentGroup,
) => {
  console.info(
    `Torneo Todos vs Todos terminado (${tournament.id}). Guardando posiciones finales...`,
  );

  try {
    const finalStandings = await prisma.tournamentGroupClas.findMany({
      where: { tournamentGroupId: group.id },
      orderBy: { position: 'asc' },
    });

    await prisma.$transaction(async (tx) => {
      for (const standing of finalStandings) {
        await tx.tournamentClas.create({
          data: {
            tournamentId: tournament.id,
            playerId: standing.playerId,
            position: standing.position,
            lastRound: 'Final',
          },
        });

        if (standing.position === 1) {
          await tx.stats.updateMany({
            where: { userId: standing.playerId, seasonId: tournament.seasonId },
            data: { tournamentWon: { increment: 1 } },
          });
        }
      }

      await tx.tournament.update({
        where: { id: tournament.id },
        data: { status: 'Completado' },
      });
    });

    console.info('Torneo Todos vs Todos completado y cerrado con exito.');
  } catch (error) {
    console.error('Error al cerrar el torneo Todos vs Todos:', error);
  }
};

/**
 * Genera el cuadro de eliminatorias a partir de los clasificados de la fase de
 * grupos: siembra la llave, guarda los partidos y fija la posicion final de los
 * jugadores que se quedan fuera.
 */
const createKnockoutFromGroups = async (prisma: PrismaClient, tournament: Tournament) => {
  console.info(
    `Fase de grupos terminada para el torneo ${tournament.id}. Generando eliminatorias...`,
  );

  try {
    const allGroups = await prisma.tournamentGroup.findMany({
      where: { tournamentId: tournament.id },
    });

    for (const group of allGroups) {
      await updateGroupStandings(prisma, group.id);
    }

    const harvest = await harvestKnockoutPlayers(prisma, tournament.id);

    if (harvest.bracketA.length > 0) {
      const matchesA = createKnockoutDraw(
        harvest.bracketA,
        tournament.sortKnockout || 'Siembra',
      );

      await saveKnockoutBracket(
        prisma,
        tournament.id,
        KnockoutType.A,
        matchesA,
        new Date(),
        tournament.allPos || false,
      );
    }

    if (harvest.typeKnockout === TypeKnockout.LlaveAB && harvest.bracketB.length > 0) {
      const matchesB = createKnockoutDraw(
        harvest.bracketB,
        tournament.sortKnockout || 'Siembra',
      );

      await saveKnockoutBracket(
        prisma,
        tournament.id,
        KnockoutType.B,
        matchesB,
        new Date(),
        tournament.allPos || false,
      );
    }

    const groupClassifications = await prisma.tournamentGroupClas.findMany({
      where: { tournamentGroup: { tournamentId: tournament.id } },
    });

    const eliminatedData = computeEliminatedPositions(
      groupClassifications,
      collectAdvancingPlayerIds(harvest),
      harvest.numGroups,
    ).map((eliminated) => ({
      ...eliminated,
      tournamentId: tournament.id,
      lastRound: null,
    }));

    if (eliminatedData.length > 0) {
      await prisma.tournamentClas.createMany({ data: eliminatedData });
    }

    await prisma.tournament.update({
      where: { id: tournament.id },
      data: { knockoutCreated: true },
    });

    console.info('Cuadro de eliminatorias generado y guardado exitosamente.');
  } catch (error) {
    console.error('Error critico al generar el cuadro automaticamente:', error);
  }
};

/** Jugadores que avanzan a eliminatorias, entre las dos llaves. */
const collectAdvancingPlayerIds = (harvest: KnockoutHarvest): string[] => {
  const advancingToA = harvest.bracketA.map((player) => player.id);
  const advancingToB =
    harvest.typeKnockout === TypeKnockout.LlaveAB
      ? harvest.bracketB.map((player) => player.id)
      : [];

  return [...advancingToA, ...advancingToB];
};

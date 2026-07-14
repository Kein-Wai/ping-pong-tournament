import { PrismaClient, Match } from '@prisma/client';
import { STATUS } from '../constants';
import { updateGroupStandings } from './standings'; // La que creamos antes para recalcular el grupo

export const processMatchResult = async (prisma: PrismaClient, match: Match) => {
  // Solo procesamos la lógica extra si el partido está FINALIZADO / COMPLETADO
  if (match.status !== STATUS.COMPLETED) {
    return;
  }

  // =====================================================================
  // 2. SI EL PARTIDO ES DE UN TOURNAMENT
  // =====================================================================
  if (match.tournamentId) {
    // 2.1 Ver si el tournament existe
    const tournament = await prisma.tournament.findUnique({
      where: { id: match.tournamentId },
    });

    if (tournament) {
      // 2.2 Ver si el partido es de group
      if (match.groupId) {
        // 2.2.1 Ver si el group existe
        const group = await prisma.tournamentGroup.findUnique({
          where: { id: match.groupId },
        });

        if (group) {
          // 2.2.2 Actualizar el tournament_group_clas
          // Aquí llamamos a la función que ya construimos antes y que hace el recálculo
          const groupResult = await updateGroupStandings(prisma, group.id);

          // (Opcional) Si necesitas saber si la fase ha terminado, groupResult te lo dice:
          // if (groupResult?.isGroupPhaseFinished) { console.log('Fase de grupos terminada'); }
        }
      }

      // 2.3 Ver si el partido es de knockout
      if (match.knockoutId) {
        // 2.3.1 Ver si el knockout existe
        const knockout = await prisma.tournamentKnockout.findUnique({
          where: { id: match.knockoutId },
        });

        if (knockout) {
          // Lógica futura para avanzar en el cuadro de eliminatorias
          console.log(`Procesando partido de eliminatoria: ${knockout.id}`);
        }
      }
    }
  }

  // =====================================================================
  // 3. SI EL PARTIDO ES DE LEAGUE
  // =====================================================================
  if (match.leagueId) {
    // 3.1 Ver si el league existe
    const league = await prisma.league.findUnique({
      where: { id: match.leagueId },
    });

    if (league) {
      // 3.2 Lógica futura para actualizar la clasificación de la liga
      // Ejemplo: await updateLeagueStandings(prisma, league.id);
      console.log(`Procesando partido de liga: ${league.id}`);
    }
  }
};

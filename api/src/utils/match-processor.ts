import { PrismaClient, Match, KnockoutType } from '@prisma/client';
import { MatchStatus } from '@prisma/client';
import { updateGroupStandings } from './standings';

import { harvestKnockoutPlayers, createKnockoutDraw, saveKnockoutBracket } from './knockout';

export const processMatchResult = async (prisma: PrismaClient, match: Match) => {
  if (match.status !== MatchStatus.Completado) {
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
          const groupResult = await updateGroupStandings(prisma, group.id);

          if (groupResult?.isGroupPhaseFinished) {
            console.log(
              `🏆 Fase de grupos terminada para el torneo ${tournament.id}. Generando eliminatorias...`,
            );

            try {
              const harvest = await harvestKnockoutPlayers(prisma, tournament.id);

              if (harvest.bracketA.length > 0) {
                const matchesA = createKnockoutDraw(
                  harvest.bracketA,
                  tournament.sortKnockout || 'Siembra',
                  tournament.allPos || false,
                );

                await saveKnockoutBracket(
                  prisma,
                  tournament.id,
                  KnockoutType.A,
                  matchesA,
                  new Date(),
                );
              }

              if (harvest.typeKnockout === 'LlaveAB' && harvest.bracketB.length > 0) {
                const matchesB = createKnockoutDraw(
                  harvest.bracketB,
                  tournament.sortKnockout || 'Siembra',
                  tournament.allPos || false,
                );
                await saveKnockoutBracket(
                  prisma,
                  tournament.id,
                  KnockoutType.B,
                  matchesB,
                  new Date(),
                );
              }

              await prisma.tournament.update({
                where: { id: tournament.id },
                data: { knockoutCreated: true },
              });

              console.log('✅ Cuadro de eliminatorias generado y guardado exitosamente.');
            } catch (error) {
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

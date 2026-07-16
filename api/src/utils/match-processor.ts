import { PrismaClient, Match, KnockoutType } from '@prisma/client';
import { MatchStatus } from '@prisma/client';
import { updateGroupStandings } from './standings';
// 👇 1. Importamos la artillería pesada que construimos en knockout.ts
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
          // Recalculamos la clasificación y miramos si hemos terminado
          const groupResult = await updateGroupStandings(prisma, group.id);

          // =====================================================================
          // 🚀 EL ESLABÓN PERDIDO: AUTOMATIZACIÓN DEL CUADRO
          // =====================================================================
          if (groupResult?.isGroupPhaseFinished) {
            console.log(
              `🏆 Fase de grupos terminada para el torneo ${tournament.id}. Generando eliminatorias...`,
            );

            try {
              // A) Cosechamos a los jugadores usando las reglas del torneo
              const harvest = await harvestKnockoutPlayers(prisma, tournament.id);

              // B) Generamos y guardamos la Llave Principal (A)
              if (harvest.bracketA.length > 0) {
                const matchesA = createKnockoutDraw(
                  harvest.bracketA,
                  tournament.sortKnockout || 'Siembra', // Respetamos lo que eligió el Admin
                  tournament.allPos || false,
                );

                // Forzamos una fecha base (el Admin o el frontend la podrán editar después)
                await saveKnockoutBracket(
                  prisma,
                  tournament.id,
                  KnockoutType.A,
                  matchesA,
                  new Date(),
                );
              }

              // C) Generamos y guardamos la Llave de Consolación (B) si el torneo lo pide
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

              // D) Dejamos constancia en el torneo de que las llaves ya han nacido
              await prisma.tournament.update({
                where: { id: tournament.id },
                data: { knockoutCreated: true },
              });

              console.log('✅ Cuadro de eliminatorias generado y guardado exitosamente.');
            } catch (error) {
              console.error('❌ Error crítico al generar el cuadro automáticamente:', error);
            }
          }
          // =====================================================================
        }
      }

      if (match.knockoutId) {
        const knockout = await prisma.tournamentKnockout.findUnique({
          where: { id: match.knockoutId },
        });

        if (knockout) {
          // Aquí en el futuro puedes meter tu función `processKnockoutAdvancement`
          // para que los jugadores avancen a la siguiente ronda automáticamente.
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

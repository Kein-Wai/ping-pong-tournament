import type { Match, Prisma, PrismaClient } from '@prisma/client';
import { handleMatchStatsUpdate } from './stats';
import { updateGroupStandings } from './standings';
import { processMatchResult } from './match-processor';

/**
 * Guardado de un partido y sus efectos. Este es el seam de «aplicar un
 * resultado»: las rutas validan y autorizan, y aquí vive lo que debe ocurrir
 * junto o no ocurrir.
 *
 * Dentro de una transacción van el partido, las estadísticas de los jugadores
 * (revertir el marcador anterior y aplicar el nuevo) y la clasificación del
 * grupo: si una falla, no queda un partido completado sin ELO ni tabla, algo que
 * un reintento no podría arreglar porque ya vería el partido como completado.
 *
 * El avance del torneo (cerrar el round robin, generar el cuadro, avanzar una
 * eliminatoria) corre DESPUÉS del commit: abre sus propias transacciones y se
 * recalcula desde los partidos ya guardados, así que un fallo ahí no deshace el
 * resultado.
 */

/** Crea un partido y aplica sus estadísticas. */
export const createMatch = async (
  prisma: PrismaClient,
  data: Prisma.MatchUncheckedCreateInput,
): Promise<Match> => {
  const match = await prisma.$transaction(async (tx) => {
    const created = await tx.match.create({ data });
    await handleMatchStatsUpdate(tx, null, created);
    return created;
  });

  await processMatchResult(prisma, match);
  return match;
};

/** Actualiza un partido: revierte/aplica estadísticas y recalcula la clasificación del grupo. */
export const updateMatch = async (
  prisma: PrismaClient,
  existing: Match,
  data: Prisma.MatchUncheckedUpdateInput,
): Promise<Match> => {
  const match = await prisma.$transaction(async (tx) => {
    const updated = await tx.match.update({ where: { id: existing.id }, data });
    await handleMatchStatsUpdate(tx, existing, updated);
    if (updated.groupId) {
      await updateGroupStandings(tx, updated.groupId);
    }
    return updated;
  });

  await processMatchResult(prisma, match);
  return match;
};

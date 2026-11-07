import { MatchStatus, type Prisma } from '@prisma/client';
import type { UserPayload } from '../middleware/auth.middleware';
import type { SyncManualMatchInput } from '../schemas/manualMatch';
import {
  canManageManualMatch,
  isApprovedClubAdmin,
  manualMatchOwnershipSelect,
  managedPlayerWhere,
} from './manual-match-access';
import { completeManualMatch } from './manual-match-completion';
import { resolveCurrentSeason } from './season';

export type SyncOutcome =
  | { kind: 'ok'; match: unknown }
  | { kind: 'not-found' }
  | { kind: 'forbidden'; message: string }
  | { kind: 'conflict'; message: string };

/** Campos del partido que viajan en el documento (sin identidad, dueño ni estado). */
const documentFields = (match: SyncManualMatchInput['match']) => {
  const { playerId: _playerId, status: _status, date, ...fields } = match;
  return { ...fields, date: date ? new Date(date) : undefined };
};

/**
 * Aplica el documento de un partido enviado por la app móvil (ADR 0003). Es idempotente y debe
 * ejecutarse en una transacción:
 *  - partido nuevo (el móvil lo creó sin conexión): se inserta con el id que eligió el móvil;
 *  - partido existente: el móvil debe enviar la versión que descargó; si el servidor tiene otra,
 *    el partido cambió en otro dispositivo y se responde conflicto sin tocar nada;
 *  - reenviar el mismo `syncId` devuelve el estado actual sin repetir nada;
 *  - las estadísticas y las habilidades se suman solo la primera vez que se finaliza.
 */
export const syncManualMatch = async (
  tx: Prisma.TransactionClient,
  actor: UserPayload,
  matchId: string,
  doc: SyncManualMatchInput,
): Promise<SyncOutcome> => {
  const existing = await tx.manualMatch.findUnique({
    where: { id: matchId },
    select: { ...manualMatchOwnershipSelect, id: true, version: true, status: true, lastSyncId: true },
  });

  const finalStatus = doc.match.status;
  // Un partido finalizado se guarda primero como iniciado y lo cierra `completeManualMatch`,
  // que es quien suma las estadísticas.
  const storedStatus = finalStatus === MatchStatus.Completado ? MatchStatus.Iniciado : finalStatus;

  let ownerId: string;
  if (existing) {
    if (!canManageManualMatch(existing, actor)) return { kind: 'not-found' };
    ownerId = existing.userId;
    if (existing.lastSyncId === doc.syncId) {
      return { kind: 'ok', match: await readMatch(tx, matchId) };
    }
    if (doc.baseVersion !== existing.version) {
      return { kind: 'conflict', message: 'El partido cambió en otro dispositivo.' };
    }
    if (existing.status === MatchStatus.Completado) {
      return { kind: 'conflict', message: 'El partido ya está finalizado.' };
    }
  } else {
    // El móvil dice que ya existía: ha desaparecido del servidor, no se recrea a ciegas.
    if (doc.baseVersion !== null) return { kind: 'not-found' };
    const playerId = doc.match.playerId;
    const isCoachAnalysis = !!playerId && playerId !== actor.id;
    if (isCoachAnalysis) {
      if (!isApprovedClubAdmin(actor)) {
        return {
          kind: 'forbidden',
          message: 'Solo el entrenador de un club aprobado puede analizar a un jugador',
        };
      }
      const player = await tx.user.findFirst({
        where: { id: playerId, ...managedPlayerWhere(actor.clubId) },
        select: { id: true },
      });
      if (!player) return { kind: 'not-found' };
    }
    ownerId = isCoachAnalysis ? playerId : actor.id;
  }

  // Un punto con el id de otro partido no se puede adoptar: sería robarlo.
  const pointIds = doc.points.map((point) => point.id);
  if (pointIds.length > 0) {
    const foreign = await tx.pointAnalysis.findMany({
      where: { id: { in: pointIds }, NOT: { manualMatchId: matchId } },
      select: { id: true },
    });
    if (foreign.length > 0) {
      return { kind: 'conflict', message: 'Algún punto pertenece a otro partido.' };
    }
  }

  if (existing) {
    await tx.manualMatch.update({
      where: { id: matchId },
      data: {
        ...documentFields(doc.match),
        status: storedStatus,
        version: { increment: 1 },
        lastSyncId: doc.syncId,
      },
    });
    await tx.pointAnalysis.deleteMany({ where: { manualMatchId: matchId } });
  } else {
    const season = await resolveCurrentSeason(tx);
    await tx.manualMatch.create({
      data: {
        ...documentFields(doc.match),
        date: doc.match.date ? new Date(doc.match.date) : new Date(),
        id: matchId,
        userId: ownerId,
        coachId: ownerId !== actor.id ? actor.id : undefined,
        seasonId: season.id,
        status: storedStatus,
        version: 1,
        lastSyncId: doc.syncId,
      },
    });
  }

  if (doc.points.length > 0) {
    await tx.pointAnalysis.createMany({
      data: doc.points.map(({ id, ...point }) => ({ ...point, id, manualMatchId: matchId })),
    });
  }

  if (finalStatus === MatchStatus.Completado && doc.result) {
    await completeManualMatch(tx, { matchId, userId: ownerId, result: doc.result });
  }

  return { kind: 'ok', match: await readMatch(tx, matchId) };
};

const readMatch = (tx: Prisma.TransactionClient, matchId: string) =>
  tx.manualMatch.findUnique({
    where: { id: matchId },
    include: { points: { orderBy: { pointOrder: 'asc' } } },
  });

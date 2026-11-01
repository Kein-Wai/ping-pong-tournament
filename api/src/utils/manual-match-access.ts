import { UserClubStatus, type Prisma } from '@prisma/client';
import type { UserPayload } from '../middleware/auth.middleware';

/**
 * Lo que `canManageManualMatch` necesita saber de un análisis. Toda consulta que
 * decida un acceso lo pide con `manualMatchOwnershipSelect`, para no repetir el
 * `select` a mano en cada ruta.
 */
export interface ManualMatchOwnership {
  userId: string;
  user: { clubId: string | null; clubStatus: string | null; userType: { name: string } };
}

export const manualMatchOwnershipSelect = {
  userId: true,
  user: { select: { clubId: true, clubStatus: true, userType: { select: { name: true } } } },
} satisfies Prisma.ManualMatchSelect;

/**
 * AdminClub con club aprobado. Es la misma condición que `requireAdminClub`, pero
 * como función: `/manual-matches` es una ruta de jugadores y solo cuando se actúa
 * sobre otro jugador se exige ser entrenador de un club aprobado.
 */
export const isApprovedClubAdmin = (
  actor: UserPayload | undefined,
): actor is UserPayload & { clubId: string } =>
  actor?.role === 'AdminClub' && !!actor.clubId && actor.clubStatus === 'Aprobado';

/**
 * Los jugadores que un entrenador puede analizar: miembros Aprobados de su club y de
 * tipo Player. Es la única definición de ese conjunto: la usan el listado y el alta,
 * y `canManageManualMatch` aplica la misma regla en memoria. Un aspirante pendiente
 * ya tiene `clubId` pero aún no ha sido aceptado; otro AdminClub no es un jugador.
 */
export const managedPlayerWhere = (clubId: string): Prisma.UserWhereInput => ({
  clubId,
  clubStatus: UserClubStatus.Aprobado,
  userType: { name: 'Player' },
});

/**
 * Un análisis lo gestiona su dueño (el jugador analizado) y los AdminClub del club
 * *actual* del dueño cuando el dueño es un jugador Aprobado (`managedPlayerWhere`).
 * Si el jugador se va del club, el club pierde el acceso y el jugador conserva el análisis.
 */
export const canManageManualMatch = (
  match: ManualMatchOwnership,
  actor: UserPayload | undefined,
): boolean => {
  if (!actor) return false;
  if (match.userId === actor.id) return true;
  return (
    isApprovedClubAdmin(actor) &&
    actor.clubId === match.user.clubId &&
    match.user.clubStatus === UserClubStatus.Aprobado &&
    match.user.userType.name === 'Player'
  );
};

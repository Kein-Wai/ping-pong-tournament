// src/utils/auth.ts
import { UserPayload } from '../middleware/auth.middleware';

/**
 * Alcance de club de un usuario frente a los recursos que pertenecen a un club.
 * - 'all':  sin restricción (SuperAdmin).
 * - 'club': acotado a su club.
 * - 'none': sin club asignado, no debe ver recursos de club.
 */
export type ClubScope =
  | { kind: 'all' }
  | { kind: 'club'; clubId: string }
  | { kind: 'none' };

/**
 * Resuelve el alcance de club de un usuario. Es la única fuente de verdad de
 * esta política: el resto de helpers se derivan de aquí.
 *
 * Un usuario sin club asignado NO hereda un alcance global: es 'none', no 'all'.
 */
export const resolveClubScope = (user: UserPayload | undefined): ClubScope => {
  if (!user) return { kind: 'none' };
  if (user.role === 'SuperAdmin') return { kind: 'all' };
  if (!user.clubId) return { kind: 'none' };

  return { kind: 'club', clubId: user.clubId };
};

/**
 * Comprueba si un usuario tiene permiso para modificar un recurso de un club específico.
 * SuperAdmin: Siempre true.
 * AdminClub: True solo si el clubId del recurso coincide con su clubId.
 * Player: False (no suelen tener permisos de edición de recursos de club).
 */
export const hasClubPermission = (
  user: UserPayload | undefined,
  targetClubId: string | null | undefined,
): boolean => {
  if (!user) return false;
  if (user.role === 'SuperAdmin') return true;
  if (user.role === 'AdminClub') return user.clubId === targetClubId;

  return false;
};

/**
 * Comprueba si un usuario puede LEER los recursos de un club.
 * SuperAdmin: siempre.
 * AdminClub y Player: solo los del club al que pertenecen.
 */
export const canAccessClub = (
  user: UserPayload | undefined,
  targetClubId: string | null | undefined,
): boolean => {
  if (!user) return false;
  if (user.role === 'SuperAdmin') return true;
  if (!user.clubId || !targetClubId) return false;

  return user.clubId === targetClubId;
};

/**
 * Devuelve el club al que está acotado el alcance del usuario, o null si su
 * alcance no está acotado (SuperAdmin, o usuario sin club asignado).
 */
export const getScopeClubId = (user: UserPayload | undefined): string | null => {
  const scope = resolveClubScope(user);

  return scope.kind === 'club' ? scope.clubId : null;
};

/**
 * Indica que el usuario no tiene club asignado y, por tanto, no debe ver
 * ningún recurso perteneciente a un club (modelos con clubId obligatorio).
 */
export const isOutOfClubScope = (user: UserPayload | undefined): boolean =>
  resolveClubScope(user).kind === 'none';

/**
 * Filtro `where` para recursos con clubId OBLIGATORIO.
 * - SuperAdmin: sin filtro, ve todo el sistema.
 * - Con club: se limita a su club.
 *
 * Para el caso 'none' (sin club) usa antes isOutOfClubScope(): este filtro no
 * puede expressar "sin club" porque la columna es obligatoria.
 */
export const buildClubScope = (user: UserPayload | undefined): { clubId?: string } => {
  const scope = resolveClubScope(user);

  return scope.kind === 'club' ? { clubId: scope.clubId } : {};
};

/**
 * Filtro `where` para recursos con clubId OPCIONAL (nullable).
 * - SuperAdmin: sin filtro, ve todo el sistema.
 * - Con club: se limita a su club.
 * - Sin club: solo ve los recursos que tampoco pertenecen a ningún club.
 */
export const buildNullableClubScope = (
  user: UserPayload | undefined,
): { clubId?: string | null } => {
  const scope = resolveClubScope(user);

  if (scope.kind === 'club') return { clubId: scope.clubId };
  if (scope.kind === 'none') return { clubId: null };

  return {};
};

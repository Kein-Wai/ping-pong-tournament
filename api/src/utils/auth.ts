// src/utils/auth.ts
import { UserPayload } from '../middleware/auth.middleware';

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

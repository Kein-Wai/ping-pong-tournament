import type { UserPayload } from '../middleware/auth.middleware';
import { hasClubPermission } from './auth';

/**
 * Jugador al que pertenece un plan, una sesión o un ejercicio de entrenamiento.
 */
export interface TrainingOwner {
  id: string;
  clubId: string | null;
}

/**
 * Ver un entrenamiento: el propio jugador, el AdminClub de su club y el SuperAdmin.
 */
export const canViewTraining = (user: UserPayload | undefined, owner: TrainingOwner): boolean =>
  !!user && (user.id === owner.id || hasClubPermission(user, owner.clubId));

/**
 * Gestionar un entrenamiento (asignar o quitar ejercicios, borrar el plan): el
 * AdminClub del club del jugador y el SuperAdmin. El propio jugador no.
 */
export const canManageTraining = (user: UserPayload | undefined, owner: TrainingOwner): boolean =>
  hasClubPermission(user, owner.clubId);

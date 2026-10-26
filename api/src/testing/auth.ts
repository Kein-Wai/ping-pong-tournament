import jwt from 'jsonwebtoken';
import type { UserPayload } from '../middleware/auth.middleware';

/**
 * Identidades de prueba para los tests de seguridad. Se firman con el
 * JWT_SECRET de pruebas y pasan por el `verifyToken` real.
 */
export const TEST_JWT_SECRET = 'secreto-de-pruebas';

export const CLUB_1 = 'club-1';
export const CLUB_2 = 'club-2';

export const identities = {
  superAdmin: { id: 'super-1', role: 'SuperAdmin', clubId: null },
  adminClub1: { id: 'admin-1', role: 'AdminClub', clubId: CLUB_1 },
  adminClub2: { id: 'admin-2', role: 'AdminClub', clubId: CLUB_2 },
  playerClub1: { id: 'player-1', role: 'Player', clubId: CLUB_1 },
  playerClub2: { id: 'player-2', role: 'Player', clubId: CLUB_2 },
  freePlayer: { id: 'free-1', role: 'Player', clubId: null },
} satisfies Record<string, UserPayload>;

export type IdentityName = keyof typeof identities;

/** Cabecera Authorization con un token real de la identidad indicada. */
export const bearer = (name: IdentityName): { Authorization: string } => ({
  Authorization: `Bearer ${jwt.sign(identities[name], TEST_JWT_SECRET)}`,
});

/** Debe llamarse antes de levantar la app: verifyToken lee el secreto del entorno. */
export const useTestJwtSecret = (): void => {
  process.env.JWT_SECRET = TEST_JWT_SECRET;
};

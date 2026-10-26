import crypto from 'crypto';
import prisma from '../db';
import { issueToken } from './session';

/** Vigencia del refresh token: lo que dura la sesión si el usuario no vuelve a escribir su contraseña. */
const REFRESH_TOKEN_TTL_MS = 30 * 24 * 60 * 60 * 1000;

interface SessionUser {
  id: string;
  clubId: string | null;
  userType: { name: string };
}

export interface SessionTokens {
  token: string;
  refreshToken: string;
}

// En la base de datos solo vive el hash: una copia filtrada de la tabla no permite renovar sesiones.
const hashToken = (raw: string): string => crypto.createHash('sha256').update(raw).digest('hex');

/**
 * Abre una sesión: token de acceso corto y refresh token opaco. `familyId`
 * encadena las rotaciones de una misma sesión para poder revocarlas juntas.
 */
export const startSession = async (
  user: SessionUser,
  familyId: string = crypto.randomUUID(),
): Promise<SessionTokens> => {
  const refreshToken = crypto.randomBytes(48).toString('base64url');
  await prisma.refreshToken.create({
    data: {
      userId: user.id,
      familyId,
      tokenHash: hashToken(refreshToken),
      expiresAt: new Date(Date.now() + REFRESH_TOKEN_TTL_MS),
    },
  });
  return { token: issueToken(user), refreshToken };
};

const revokeFamily = (familyId: string) =>
  prisma.refreshToken.updateMany({
    where: { familyId, revokedAt: null },
    data: { revokedAt: new Date() },
  });

/**
 * Canjea un refresh token por una sesión nueva y lo revoca (rotación). Devuelve
 * `null` si no sirve. Presentar uno ya usado indica que alguien tiene una copia:
 * se revoca toda la familia y la sesión legítima debe volver a iniciarse.
 */
export const rotateRefreshToken = async (raw: string): Promise<SessionTokens | null> => {
  const stored = await prisma.refreshToken.findUnique({
    where: { tokenHash: hashToken(raw) },
    select: {
      id: true,
      familyId: true,
      expiresAt: true,
      revokedAt: true,
      user: {
        select: { id: true, active: true, clubId: true, userType: { select: { name: true } } },
      },
    },
  });
  if (!stored) return null;

  if (stored.revokedAt) {
    await revokeFamily(stored.familyId);
    return null;
  }
  if (stored.expiresAt <= new Date() || !stored.user.active) return null;

  // Condicional a `revokedAt: null`: de dos peticiones simultáneas con el mismo token solo una lo consume.
  const claimed = await prisma.refreshToken.updateMany({
    where: { id: stored.id, revokedAt: null },
    data: { revokedAt: new Date() },
  });
  if (claimed.count === 0) {
    await revokeFamily(stored.familyId);
    return null;
  }

  return startSession(stored.user, stored.familyId);
};

/** Cierra la sesión del refresh token indicado; un token desconocido no es un error. */
export const revokeRefreshToken = async (raw: string): Promise<void> => {
  await prisma.refreshToken.updateMany({
    where: { tokenHash: hashToken(raw), revokedAt: null },
    data: { revokedAt: new Date() },
  });
};

/** Cierra todas las sesiones del usuario (p. ej. al cambiar la contraseña). */
export const revokeAllUserSessions = async (userId: string): Promise<void> => {
  await prisma.refreshToken.updateMany({
    where: { userId, revokedAt: null },
    data: { revokedAt: new Date() },
  });
};

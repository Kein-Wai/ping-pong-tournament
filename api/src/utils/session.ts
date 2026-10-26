import jwt from 'jsonwebtoken';
import { getRequiredEnv } from '../config';
import prisma from '../db';
import type { UserPayload } from '../middleware/auth.middleware';

/** Vigencia del token de acceso; la sesión larga la sostiene el refresh token (`utils/refresh-token`). */
export const ACCESS_TOKEN_TTL = '1h';

interface TokenSubject {
  id: string;
  clubId: string | null;
  userType: { name: string };
}

/**
 * Firma el token de acceso. Es el único sitio que decide qué viaja en el JWT.
 * Rol y club van solo para que la interfaz los lea; la API no se fía de ellos
 * y los vuelve a leer de la base de datos en cada petición (`loadSessionIdentity`).
 */
export const issueToken = (user: TokenSubject): string =>
  jwt.sign(
    { id: user.id, role: user.userType.name, clubId: user.clubId },
    getRequiredEnv('JWT_SECRET'),
    { expiresIn: ACCESS_TOKEN_TTL },
  );

const isRecordNotFound = (error: unknown): boolean =>
  typeof error === 'object' && error !== null && (error as { code?: string }).code === 'P2025';

/**
 * Rol y club vigentes del usuario. Devuelve `null` si ya no existe o está
 * desactivado; cualquier otro fallo (base de datos caída) se propaga para que
 * no se confunda con una sesión caducada.
 */
export const loadSessionIdentity = async (id: string): Promise<UserPayload | null> => {
  try {
    const user = await prisma.user.findUniqueOrThrow({
      where: { id },
      select: {
        id: true,
        active: true,
        clubId: true,
        userType: { select: { name: true } },
        club: { select: { status: true } },
      },
    });
    if (!user.active) return null;
    return {
      id: user.id,
      role: user.userType.name,
      clubId: user.clubId,
      clubStatus: user.club?.status ?? null,
    };
  } catch (error) {
    if (isRecordNotFound(error)) return null;
    throw error;
  }
};

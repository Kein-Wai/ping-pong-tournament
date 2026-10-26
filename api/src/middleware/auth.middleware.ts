import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { getRequiredEnv } from '../config';
import { loadSessionIdentity } from '../utils/session';
import { sendError } from '../http/response';

export interface UserPayload {
  id: string;
  role: string;
  clubId?: string | null;
  /** Estado del club del usuario, leído de la base de datos en cada petición. */
  clubStatus?: string | null;
}

declare global {
  // La única forma de ampliar Request de Express es fusionar su namespace.
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      user?: UserPayload;
    }
  }
}

// Nivel 1: Dios (Solo para ti)
export const requireSuperAdmin = (req: Request, res: Response, next: NextFunction): void => {
  if (!req.user) {
    sendError(res, 401, 'Usuario no autenticado');
    return;
  }
  if (req.user.role !== 'SuperAdmin') {
    sendError(res, 403, 'Acceso denegado. Solo el SuperAdmin puede realizar esta acción.');
    return;
  }
  next();
};

// Nivel 2 (base): Presidentes de Club, sea cual sea el estado de su club.
export const requireAdminClubAnyStatus = (
  req: Request,
  res: Response,
  next: NextFunction,
): void => {
  if (!req.user) {
    sendError(res, 401, 'Usuario no autenticado');
    return;
  }
  if (req.user.role !== 'SuperAdmin' && req.user.role !== 'AdminClub') {
    sendError(res, 403, 'Acceso denegado. Se requieren permisos de Administrador de Club.');
    return;
  }
  next();
};

/**
 * Nivel 2: Presidentes de Club (Tú también puedes pasar por aquí).
 *
 * Un club recién solicitado está Pendiente hasta que el SuperAdmin lo aprueba:
 * mientras tanto su AdminClub solo puede gestionar los datos del club (rutas con
 * `requireAdminClubAnyStatus`), no operar con torneos, partidos, equipos ni miembros.
 */
export const requireAdminClub = (req: Request, res: Response, next: NextFunction): void => {
  requireAdminClubAnyStatus(req, res, () => {
    const { role, clubId, clubStatus } = req.user ?? {};
    if (role === 'AdminClub' && clubId && clubStatus !== 'Aprobado') {
      sendError(res, 403, 'Tu club está pendiente de aprobación por el SuperAdmin.');
      return;
    }
    next();
  });
};

export const verifyToken = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    sendError(res, 401, 'Acceso denegado. Token no proporcionado o formato incorrecto.');
    return;
  }

  const token = authHeader.split(' ')[1];

  let claims: UserPayload;
  try {
    claims = jwt.verify(token, getRequiredEnv('JWT_SECRET')) as UserPayload;
  } catch {
    sendError(res, 401, 'Token inválido o expirado.');
    return;
  }

  try {
    // El rol y el club del JWT pueden llevar semanas de retraso: la fuente de verdad es la base de datos.
    const identity = await loadSessionIdentity(claims.id);
    if (!identity) {
      sendError(res, 401, 'Token inválido o expirado.');
      return;
    }
    req.user = identity;
    next();
  } catch (error) {
    next(error);
  }
};

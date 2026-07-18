import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

export interface UserPayload {
  id: string;
  email: string;
  role: string;
  clubId?: string | null;
  clubStatus?: string | null;
}

declare global {
  namespace Express {
    interface Request {
      user?: UserPayload;
    }
  }
}

// Nivel 1: Dios (Solo para ti)
export const requireSuperAdmin = (req: Request, res: Response, next: NextFunction): void => {
  if (!req.user) {
    res.status(401).json({ error: 'Usuario no autenticado' });
    return;
  }
  if (req.user.role !== 'SuperAdmin') {
    res
      .status(403)
      .json({ error: 'Acceso denegado. Solo el SuperAdmin puede realizar esta acción.' });
    return;
  }
  next();
};

// Nivel 2: Presidentes de Club (Tú también puedes pasar por aquí)
export const requireAdminClub = (req: Request, res: Response, next: NextFunction): void => {
  if (!req.user) {
    res.status(401).json({ error: 'Usuario no autenticado' });
    return;
  }
  if (req.user.role !== 'SuperAdmin' && req.user.role !== 'AdminClub') {
    res
      .status(403)
      .json({ error: 'Acceso denegado. Se requieren permisos de Administrador de Club.' });
    return;
  }
  next();
};

export const verifyToken = (req: Request, res: Response, next: NextFunction): void => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res
      .status(401)
      .json({ error: 'Acceso denegado. Token no proporcionado o formato incorrecto.' });
    return;
  }

  const token = authHeader.split(' ')[1];

  try {
    const secret = process.env.JWT_SECRET || 'fallback-secret';
    const decoded = jwt.verify(token, secret) as UserPayload;
    req.user = decoded;
    next();
  } catch (error) {
    res.status(401).json({ error: 'Token inválido o expirado.' });
  }
};

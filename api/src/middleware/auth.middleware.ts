import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

export interface UserPayload {
  id: string;
  email: string;
  role: string;
}

declare global {
  namespace Express {
    interface Request {
      user?: UserPayload;
    }
  }
}

export const requireAdmin = (req: Request, res: Response, next: NextFunction): void => {
  // Verificamos que el usuario exista (verifyToken ya debería haberlo comprobado)
  if (!req.user) {
    res.status(401).json({ error: 'Usuario no autenticado' });
    return;
  }

  // Comprobamos el rol exacto (Asegúrate de que coincide con el nombre en tu BD)
  if (req.user.role !== 'Admin') {
    res.status(403).json({ error: 'Acceso denegado. Se requieren permisos de Administrador.' });
    return;
  }

  // Si es Admin, le abrimos la puerta VIP
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

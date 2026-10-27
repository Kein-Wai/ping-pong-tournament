import { Request, Response, NextFunction } from 'express';
import { sendError } from '../http/response';

/**
 * Solo jugadores: para secciones personales que la gestión del club no usa
 * (p. ej. el calentamiento).
 *
 * Vive aparte de `auth.middleware` a propósito: 17 tests de rutas sustituyen ese
 * módulo entero con una lista fija de guardas, y añadir uno nuevo allí los rompe.
 * Cuando esos tests migren al arnés real (fase G4 de docs/PENDIENTES.md), este guarda
 * puede pasar a `auth.middleware` junto a los demás.
 */
export const requirePlayer = (req: Request, res: Response, next: NextFunction): void => {
  if (!req.user) {
    sendError(res, 401, 'Usuario no autenticado');
    return;
  }
  if (req.user.role !== 'Player') {
    sendError(res, 403, 'Acceso denegado. Esta sección es solo para jugadores.');
    return;
  }
  next();
};

import { NextFunction, Request, Response } from 'express';
import { ZodError } from 'zod';
import { ApiError, sendError } from './response';

/**
 * Middleware central de errores de la API.
 *
 * Un unico punto donde se decide que se responde cuando algo falla, para que
 * el cliente siempre reciba el mismo contrato: { success: false, error }.
 *
 * La implementacion escribe en el log el detalle real (status, ruta, causa),
 * pero al cliente solo le llega un mensaje generico: nunca se filtran stack
 * traces ni datos sensibles.
 */
export const errorHandler = (
  error: unknown,
  req: Request,
  res: Response,
  next: NextFunction,
): void => {
  if (res.headersSent) {
    next(error);
    return;
  }

  // Error de validacion de Zod: se devuelven los detalles por campo.
  if (error instanceof ZodError) {
    console.error(`[${req.method} ${req.originalUrl}] Error de validacion:`, error.issues);
    sendError(res, 400, 'Datos invalidos', error.flatten());
    return;
  }

  // Error de negocio: el mensaje que ve el usuario es seguro por definicion.
  if (error instanceof ApiError) {
    console.error(`[${req.method} ${req.originalUrl}] ${error.message}`);
    sendError(res, error.status, error.message, error.details);
    return;
  }

  console.error(`[${req.method} ${req.originalUrl}] Error no controlado:`, error);
  sendError(res, 500, 'Error interno del servidor');
};

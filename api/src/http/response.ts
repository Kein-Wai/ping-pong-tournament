import { Request, Response, NextFunction, RequestHandler } from 'express';
import { ParamsDictionary } from 'express-serve-static-core';

/**
 * Contrato de respuesta de la API. Un unico formato para que el cliente
 * siempre sepa donde mirar.
 */
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  details?: unknown;
  message?: string;
}

/**
 * Error de negocio de la API: lleva el codigo HTTP y el mensaje que ve el
 * usuario. Los errores de validacion de Zod se pasan como `details`.
 */
export class ApiError extends Error {
  readonly status: number;
  readonly details?: unknown;

  constructor(status: number, message: string, details?: unknown) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.details = details;
  }
}

/** Responde con exito: { success: true, data }. */
export const sendData = <T>(res: Response, data: T, status = 200): Response =>
  res.status(status).json({ success: true, data } satisfies ApiResponse<T>);

/** Responde con exito y un mensaje para el toast del cliente. */
export const sendMessage = (
  res: Response,
  message: string,
  status = 200,
  data?: unknown,
): Response =>
  res.status(status).json({
    success: true,
    message,
    ...(data !== undefined ? { data } : {}),
  });

/** Responde con un error de negocio: { success: false, error, details }. */
export const sendError = (
  res: Response,
  status: number,
  message: string,
  details?: unknown,
): Response =>
  res.status(status).json({
    success: false,
    error: message,
    ...(details !== undefined ? { details } : {}),
  });

/**
 * Convierte un handler asincrono en un handler de Express que propaga los
 * errores al middleware central de errores.
 *
 * Modulo PURO: solo encaja la funcion en la interface de Express (que espera
 * 3 argumentos y no captura rechazos de promesa). El `errorMessage` es el
 * texto que veria el cliente si el handler falla; el detalle real (causa,
 * stack) se queda en el log del servidor.
 *
 * Si el error lanzado ya es un ApiError, se respeta su mensaje y su codigo:
 * un error de dominio no debe disfrazarse de fallo del servidor.
 */
export const asyncHandler =
  <P extends ParamsDictionary = ParamsDictionary>(
    handler: (req: Request<P>, res: Response, next: NextFunction) => Promise<unknown>,
    errorMessage = 'Error interno del servidor',
    status = 500,
  ): RequestHandler<P> =>
  (req, res, next) => {
    Promise.resolve(handler(req as Request<P>, res, next)).catch((error) => {
      console.error(`[${req.method} ${req.originalUrl}] ${errorMessage}:`, error);
      next(error instanceof ApiError ? error : new ApiError(status, errorMessage));
    });
  };

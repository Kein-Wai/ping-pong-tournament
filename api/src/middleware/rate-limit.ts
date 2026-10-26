import rateLimit from 'express-rate-limit';
import { sendError } from '../http/response';

const MINUTE = 60 * 1000;

/**
 * Límite por IP con el contrato de error de la API. Los contadores viven en
 * memoria del proceso: bastan con una sola instancia; con varias habría que
 * pasar a un almacén compartido.
 */
const createLimiter = (windowMs: number, limit: number, skipSuccessfulRequests = false) =>
  rateLimit({
    windowMs,
    limit,
    skipSuccessfulRequests,
    standardHeaders: 'draft-7',
    legacyHeaders: false,
    handler: (_req, res) => {
      sendError(res, 429, 'Demasiados intentos. Inténtalo de nuevo más tarde.');
    },
  });

/** Red general para toda la API: frena abusos sin molestar a un uso normal. */
export const apiLimiter = createLimiter(15 * MINUTE, 1000);

/** Login local y Google: solo cuentan los intentos fallidos, para no penalizar a quien acierta. */
export const loginLimiter = createLimiter(15 * MINUTE, 10, true);

/** Registro: crea cuentas y envía un correo de verificación. */
export const registerLimiter = createLimiter(60 * MINUTE, 10);

/** Recuperación de contraseña: envía correos y consume tokens de un solo uso. */
export const passwordResetLimiter = createLimiter(15 * MINUTE, 5);

/** Renovación de sesión: holgado porque varias pestañas pueden renovar a la vez. */
export const refreshLimiter = createLimiter(15 * MINUTE, 60);

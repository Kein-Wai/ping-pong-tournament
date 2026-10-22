import { requestBodyFromSchema } from '../zod-schema';
import { forgotPasswordSchema, loginGoogleSchema, loginLocalSchema, registerSchema, resetPasswordSchema } from '../../schemas/user';
export const authPaths = {
      '/api/auth/register': {
        post: {
          requestBody: requestBodyFromSchema(registerSchema),
          summary: 'Registra un nuevo jugador (Público)',
          description:
            'Crea un nuevo usuario con el rol de Player automáticamente con estado de club "Registrado" y devuelve un JWT.',
          tags: ['Auth'],
          responses: {
            201: { description: 'Jugador registrado con éxito.' },
            400: { description: 'Datos inválidos o el email ya está en uso' },
          },
        },
      },
      '/api/auth/login': {
        post: {
          requestBody: requestBodyFromSchema(loginLocalSchema),
          summary: 'Inicia sesión con email y contraseña (Local)',
          tags: ['Auth'],
          responses: {
            200: { description: 'Login exitoso, devuelve el JWT con los claims de club incluidos' },
            401: { description: 'Credenciales incorrectas' },
          },
        },
      },
      '/api/auth/google': {
        post: {
          requestBody: requestBodyFromSchema(loginGoogleSchema),
          summary: 'Inicia sesión o regístrate usando Google (OAuth2)',
          tags: ['Auth'],
          responses: {
            200: { description: 'Autenticación exitosa, devuelve el JWT propio de la API' },
          },
        },
      },
      '/api/auth/verify/{token}': {
        get: {
          summary: 'Verificar correo electrónico de cuenta nueva',
          tags: ['Auth'],
          parameters: [{ name: 'token', in: 'path', required: true, schema: { type: 'string' } }],
          responses: {
            200: { description: 'Redirección al frontend (Login)' },
            401: { description: 'Token incorrecto o caducado' },
          },
        },
      },
      '/api/auth/forgot-password': {
        post: {
          requestBody: requestBodyFromSchema(forgotPasswordSchema),
          summary: 'Solicitar recuperación de contraseña',
          tags: ['Auth'],
          responses: {
            200: { description: 'Instrucciones enviadas (si el email existe)' },
          },
        },
      },
      '/api/auth/reset-password': {
        post: {
          requestBody: requestBodyFromSchema(resetPasswordSchema),
          summary: 'Establecer nueva contraseña usando un token de recuperación',
          tags: ['Auth'],
          responses: {
            200: { description: 'Contraseña actualizada con éxito' },
            400: { description: 'Token inválido o caducado' },
          },
        },
      },

      // ==========================================
      // CLUBS
      // ==========================================
};

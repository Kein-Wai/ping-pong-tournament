import { requestBodyFromSchema } from '../zod-schema';
import { createUserSchema } from '../../schemas/user';

export const usersPaths = {
      '/api/users': {
        get: {
          summary: 'Obtiene la lista de jugadores filtrada por contexto de Club',
          tags: ['Users'],
          responses: { 200: { description: 'Lista de jugadores devuelta exitosamente' } },
        },
        post: {
          summary: 'Crear un usuario manualmente (AdminClub / SuperAdmin)',
          tags: ['Users'],
          requestBody: requestBodyFromSchema(createUserSchema),
          responses: { 201: { description: 'Usuario creado exitosamente' } },
        },
      },
      '/api/users/guest': {
        post: {
          summary: 'Crear cuenta de Invitado o Híbrida (AdminClub)',
          description:
            'Si se envía el email, crea un usuario real. Si se omite, crea un invitado "fantasma".',
          tags: ['Users'],
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['name'],
                  properties: {
                    email: { type: 'string', format: 'email', description: 'Opcional' },
                    name: { type: 'string' },
                    surname: { type: 'string' },
                    level: {
                      type: 'string',
                      enum: ['Iniciacion', 'Principiante', 'Intermedio', 'Avanzado', 'Profesional'],
                    },
                    dominantHand: { type: 'string', enum: ['Diestro', 'Zurdo'] },
                    playstyle: { type: 'string', enum: ['Ofensivo', 'Defensivo'] },
                    elo: { type: 'integer', default: 500 },
                  },
                },
              },
            },
          },
          responses: { 201: { description: 'Invitado o Usuario creado con éxito' } },
        },
      },
      '/api/users/me': {
        put: {
          summary: 'Actualizar perfil del usuario logueado',
          tags: ['Users'],
          responses: { 200: { description: 'Perfil actualizado' } },
        },
      },
      '/api/users/{id}': {
        get: {
          summary: 'Obtener el detalle de un usuario específico',
          tags: ['Users'],
          parameters: [
            { name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } },
          ],
          responses: { 200: { description: 'Datos del usuario devueltos' } },
        },
        put: {
          summary: 'Actualizar un usuario (AdminClub)',
          tags: ['Users'],
          parameters: [
            { name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } },
          ],
          responses: { 200: { description: 'Usuario actualizado' } },
        },
        delete: {
          summary: 'Eliminar un usuario del sistema (AdminClub)',
          tags: ['Users'],
          parameters: [
            { name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } },
          ],
          responses: { 204: { description: 'Usuario eliminado' } },
        },
      },

      // ==========================================
      // TOURNAMENTS
      // ==========================================
};

import { requestBodyFromSchema } from '../zod-schema';
import { createClubSchema } from '../../schemas/club';

export const clubsPaths = {
      '/api/clubs': {
        get: {
          summary: 'Listar todos los clubes activos (Público)',
          tags: ['Clubs'],
          responses: { 200: { description: 'Lista de clubes aprobados obtenida con éxito' } },
        },
        post: {
          summary: 'Solicitar la creación de un nuevo Club (Público)',
          tags: ['Clubs'],
          requestBody: requestBodyFromSchema(createClubSchema),
          responses: { 201: { description: 'Club solicitado con éxito' } },
        },
      },
      '/api/clubs/{id}/join': {
        post: {
          summary: 'Solicitar unirse a un Club',
          tags: ['Clubs'],
          parameters: [
            { name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } },
          ],
          responses: { 200: { description: 'Solicitud enviada al administrador del club' } },
        },
      },
      '/api/clubs/{id}/members': {
        get: {
          summary: 'Listar todos los miembros del Club (AdminClub / SuperAdmin)',
          tags: ['Clubs'],
          parameters: [
            { name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } },
          ],
          responses: { 200: { description: 'Miembros obtenidos exitosamente' } },
        },
      },
      '/api/clubs/{id}/members/{userId}/status': {
        put: {
          summary: 'Aprobar o Rechazar la membresía de un jugador',
          description:
            'Acepta al jugador e inyecta su nivel y estadísticas iniciales de ELO y Skills RPG.',
          tags: ['Clubs'],
          parameters: [
            { name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } },
            {
              name: 'userId',
              in: 'path',
              required: true,
              schema: { type: 'string', format: 'uuid' },
            },
          ],
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    status: { type: 'string', enum: ['Aprobado', 'Rechazado'] },
                    level: { type: 'string' },
                    elo: { type: 'integer' },
                  },
                },
              },
            },
          },
          responses: { 200: { description: 'Estado actualizado' } },
        },
      },

      // ==========================================
      // USER TYPES
      // ==========================================
};

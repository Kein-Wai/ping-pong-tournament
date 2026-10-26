import { requestBodyFromSchema } from '../zod-schema';
import { createTeamMatchSchema, createTeamSchema, updateTeamPlayersSchema } from '../../schemas/team';
export const teamsPaths = {
      '/api/teams': {
        post: {
          requestBody: requestBodyFromSchema(createTeamSchema),
          summary: 'Crear un equipo (AdminClub)',
          tags: ['Teams'],
          responses: { 201: { description: 'Equipo creado exitosamente' } },
        },
      },
      '/api/teams/club/{clubId}': {
        get: {
          summary: 'Listar equipos de un club',
          tags: ['Teams'],
          parameters: [
            {
              name: 'clubId',
              in: 'path',
              required: true,
              schema: { type: 'string', format: 'uuid' },
            },
          ],
          responses: { 200: { description: 'Equipos obtenidos con éxito' } },
        },
      },
      '/api/teams/{id}': {
        delete: {
          summary: 'Eliminar un equipo y su calendario (AdminClub)',
          tags: ['Teams'],
          parameters: [
            { name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } },
          ],
          responses: { 200: { description: 'Equipo eliminado con éxito' } },
        },
      },
      '/api/teams/{id}/players': {
        put: {
          requestBody: requestBodyFromSchema(updateTeamPlayersSchema),
          summary: 'Actualizar plantilla del equipo',
          tags: ['Teams'],
          parameters: [
            { name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } },
          ],
          responses: { 200: { description: 'Plantilla y nivel actualizados' } },
        },
      },
      '/api/teams/{id}/matches': {
        post: {
          requestBody: requestBodyFromSchema(createTeamMatchSchema),
          summary: 'Añadir partido al calendario del equipo',
          tags: ['Teams'],
          parameters: [
            { name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } },
          ],
          responses: { 201: { description: 'Partido del equipo programado' } },
        },
      },

      // ==========================================
      // GENERAL TRAININGS (Clases Grupales)
      // ==========================================
};

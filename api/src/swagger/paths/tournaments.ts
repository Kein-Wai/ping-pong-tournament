import { requestBodyFromSchema } from '../zod-schema';
import { createTournamentSchema } from '../../schemas/tournament';

export const tournamentsPaths = {
      '/api/tournaments': {
        get: {
          summary: 'Obtener todos los torneos accesibles',
          tags: ['Tournaments'],
          responses: { 200: { description: 'Lista filtrada devuelta exitosamente' } },
        },
        post: {
          summary: 'Crear un nuevo torneo asociado al Club (AdminClub)',
          tags: ['Tournaments'],
          requestBody: requestBodyFromSchema(createTournamentSchema),
          responses: { 201: { description: 'Torneo creado con éxito' } },
        },
      },
      '/api/tournaments/{id}': {
        get: {
          summary: 'Obtener un torneo específico',
          tags: ['Tournaments'],
          parameters: [
            { name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } },
          ],
          responses: { 200: { description: 'Estructura e inscripciones' } },
        },
        put: {
          summary: 'Actualizar configuración/formato',
          tags: ['Tournaments'],
          parameters: [
            { name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } },
          ],
          responses: { 200: { description: 'Torneo actualizado' } },
        },
        delete: {
          summary: 'Eliminar un torneo programado',
          tags: ['Tournaments'],
          parameters: [
            { name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } },
          ],
          responses: { 200: { description: 'Torneo eliminado' } },
        },
      },
      '/api/tournaments/{id}/register': {
        post: {
          summary: 'Inscribir un jugador en el torneo',
          tags: ['Tournaments'],
          parameters: [
            { name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } },
          ],
          responses: { 201: { description: 'Inscripción procesada' } },
        },
      },
      '/api/tournaments/{id}/register-bulk': {
        post: {
          summary: 'Inscribir múltiples jugadores de golpe (AdminClub)',
          tags: ['Tournaments'],
          parameters: [
            { name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } },
          ],
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    playerIds: { type: 'array', items: { type: 'string', format: 'uuid' } },
                  },
                },
              },
            },
          },
          responses: { 201: { description: 'Jugadores inscritos' } },
        },
      },
      '/api/tournaments/{id}/generate-groups': {
        post: {
          summary: 'Cerrar inscripciones y estructurar Fase de Grupos',
          tags: ['Tournaments'],
          parameters: [
            { name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } },
          ],
          responses: { 200: { description: 'Grupos generados' } },
        },
      },
      '/api/tournaments/{id}/swap-players': {
        put: {
          summary: 'Intercambiar la posición de dos jugadores en el cuadro (AdminClub)',
          tags: ['Tournaments'],
          parameters: [
            { name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } },
          ],
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    playerAId: { type: 'string', format: 'uuid' },
                    playerBId: { type: 'string', format: 'uuid' },
                  },
                },
              },
            },
          },
          responses: {
            200: { description: 'Jugadores intercambiados con éxito' },
            400: { description: 'La fase ya ha comenzado' },
          },
        },
      },

      // ==========================================
      // MATCHES
      // ==========================================
};

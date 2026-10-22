import { requestBodyFromSchema } from '../zod-schema';
import { baseMatchObject } from '../../schemas/match';
export const matchesPaths = {
      '/api/matches': {
        get: {
          summary: 'Obtener el listado histórico de partidos',
          tags: ['Matches'],
          responses: { 200: { description: 'Partidos devueltos exitosamente' } },
        },
        post: {
          summary: 'Registrar enfrentamientos y procesar cómputos de ELO',
          tags: ['Matches'],
          responses: { 201: { description: 'Partido creado' } },
        },
      },
      '/api/matches/{id}': {
        put: {
          requestBody: requestBodyFromSchema(baseMatchObject),
          summary: 'Actualizar el resultado de un partido',
          tags: ['Matches'],
          parameters: [
            { name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } },
          ],
          responses: { 200: { description: 'Partido actualizado y estadísticas recalculadas' } },
        },
      },

      // ==========================================
      // EXERCISES
      // ==========================================
};

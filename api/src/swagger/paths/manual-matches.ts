import { requestBodyFromSchema } from '../zod-schema';
import { addPointSchema, createManualMatchSchema } from '../../schemas/manualMatch';
export const manual_matchesPaths = {
      '/api/manual-matches': {
        get: {
          summary:
            'Listar partidos de análisis del usuario; el AdminClub (club aprobado) recibe además los de los jugadores de su club',
          tags: ['Manual Matches'],
          parameters: [
            {
              name: 'playerId',
              in: 'query',
              required: false,
              description: 'Filtra por jugador analizado. Nunca amplía lo que el usuario puede ver.',
              schema: { type: 'string' },
            },
          ],
          responses: { 200: { description: 'Partidos obtenidos' } },
        },
        post: {
          requestBody: requestBodyFromSchema(createManualMatchSchema),
          summary:
            'Crear un partido de análisis; con playerId, un AdminClub de club aprobado lo crea para un jugador de su club',
          tags: ['Manual Matches'],
          responses: {
            201: { description: 'Partido creado' },
            403: { description: 'Solo el entrenador de un club aprobado puede analizar a un jugador' },
            404: { description: 'Jugador no encontrado en el club' },
          },
        },
      },
      '/api/manual-matches/{id}': {
        get: {
          summary: 'Obtener reporte completo de un partido (puntos incluidos)',
          tags: ['Manual Matches'],
          parameters: [
            { name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } },
          ],
          responses: { 200: { description: 'Reporte del partido devuelto' } },
        },
        put: {
          summary: 'Actualizar configuración del rival en el partido',
          tags: ['Manual Matches'],
          parameters: [
            { name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } },
          ],
          responses: { 200: { description: 'Datos del rival actualizados' } },
        },
      },
      '/api/manual-matches/{id}/points': {
        post: {
          requestBody: requestBodyFromSchema(addPointSchema),
          summary: 'Registrar un punto individual (Tracker)',
          tags: ['Manual Matches'],
          parameters: [
            { name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } },
          ],
          responses: { 201: { description: 'Punto guardado exitosamente' } },
        },
      },
      '/api/manual-matches/{id}/points/{pointId}': {
        delete: {
          summary: 'Deshacer (Borrar) el último punto registrado',
          tags: ['Manual Matches'],
          parameters: [
            { name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } },
            {
              name: 'pointId',
              in: 'path',
              required: true,
              schema: { type: 'string', format: 'uuid' },
            },
          ],
          responses: { 200: { description: 'Punto eliminado' } },
        },
      },
      '/api/manual-matches/{id}/complete': {
        put: {
          summary: 'Finalizar partido de análisis',
          tags: ['Manual Matches'],
          parameters: [
            { name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } },
          ],
          responses: { 200: { description: 'Partido completado con éxito' } },
        },
      },

      // ==========================================
      // SKILLS (RPG)
      // ==========================================
};

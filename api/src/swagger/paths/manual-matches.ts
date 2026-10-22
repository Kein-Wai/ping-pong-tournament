import { requestBodyFromSchema } from '../zod-schema';
import { addPointSchema } from '../../schemas/manualMatch';
export const manual_matchesPaths = {
      '/api/manual-matches': {
        get: {
          summary: 'Listar partidos de análisis del usuario',
          tags: ['Manual Matches'],
          responses: { 200: { description: 'Partidos obtenidos' } },
        },
        post: {
          summary: 'Crear un partido de análisis',
          tags: ['Manual Matches'],
          responses: { 201: { description: 'Partido creado' } },
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

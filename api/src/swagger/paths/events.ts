import { requestBodyFromSchema } from '../zod-schema';
import { createEventSchema, updateEventSchema } from '../../schemas/event';
export const eventsPaths = {
      '/api/events': {
        post: {
          requestBody: requestBodyFromSchema(createEventSchema),
          summary: 'Crear un evento de calendario (AdminClub)',
          tags: ['Events'],
          responses: { 201: { description: 'Evento creado' } },
        },
      },
      '/api/events/club/{clubId}': {
        get: {
          summary: 'Obtener eventos de un club',
          tags: ['Events'],
          parameters: [
            {
              name: 'clubId',
              in: 'path',
              required: true,
              schema: { type: 'string', format: 'uuid' },
            },
          ],
          responses: { 200: { description: 'Lista de eventos con sus recordatorios adjuntos' } },
        },
      },
      '/api/events/{id}': {
        put: {
          requestBody: requestBodyFromSchema(updateEventSchema),
          summary: 'Editar un evento',
          tags: ['Events'],
          parameters: [
            { name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } },
          ],
          responses: { 200: { description: 'Evento actualizado' } },
        },
        delete: {
          summary: 'Borrar un evento',
          tags: ['Events'],
          parameters: [
            { name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } },
          ],
          responses: { 200: { description: 'Evento eliminado' } },
        },
      },
      '/api/events/{id}/reminders': {
        post: {
          summary: 'Activar avisos por email para un evento',
          tags: ['Events'],
          parameters: [
            { name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } },
          ],
          responses: { 201: { description: 'Recordatorios activados' } },
        },
        delete: {
          summary: 'Cancelar los avisos de este evento',
          tags: ['Events'],
          parameters: [
            { name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } },
          ],
          responses: { 200: { description: 'Recordatorios eliminados' } },
        },
      },

      // ==========================================
      // FEEDBACK (Bugs y Sugerencias)
      // ==========================================
};

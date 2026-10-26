import { requestBodyFromSchema } from '../zod-schema';
import { updateGeneralTrainingSchema, updateScheduleSchema } from '../../schemas/generalTraining';
export const general_trainingsPaths = {
      '/api/general-trainings': {
        get: {
          summary: 'Listar calendario de clases programadas',
          tags: ['General Trainings'],
          responses: { 200: { description: 'Calendario obtenido' } },
        },
        post: {
          summary: 'Programar clases en bloque',
          tags: ['General Trainings'],
          responses: { 201: { description: 'Clases programadas exitosamente' } },
        },
      },
      '/api/general-trainings/{id}': {
        put: {
          requestBody: requestBodyFromSchema(updateGeneralTrainingSchema),
          summary: 'Actualizar detalle de clase grupal',
          tags: ['General Trainings'],
          parameters: [
            { name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } },
          ],
          responses: { 200: { description: 'Clase actualizada' } },
        },
        delete: {
          summary: 'Eliminar una clase grupal',
          tags: ['General Trainings'],
          parameters: [
            { name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } },
          ],
          responses: { 200: { description: 'Clase eliminada' } },
        },
      },
      '/api/general-trainings/schedules': {
        get: {
          summary: 'Listar horarios base del club',
          tags: ['General Trainings'],
          responses: { 200: { description: 'Horarios obtenidos' } },
        },
        post: {
          summary: 'Crear un horario base (AdminClub)',
          tags: ['General Trainings'],
          responses: { 201: { description: 'Horario creado' } },
        },
      },
      '/api/general-trainings/schedules/{id}': {
        put: {
          requestBody: requestBodyFromSchema(updateScheduleSchema),
          summary: 'Actualizar horario base',
          tags: ['General Trainings'],
          parameters: [
            { name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } },
          ],
          responses: { 200: { description: 'Horario actualizado' } },
        },
        delete: {
          summary: 'Eliminar horario base',
          tags: ['General Trainings'],
          parameters: [
            { name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } },
          ],
          responses: { 200: { description: 'Horario eliminado' } },
        },
      },
      '/api/general-trainings/{id}/attendance/bulk': {
        put: {
          summary: 'Sincronizar asistencia de una clase',
          tags: ['General Trainings'],
          parameters: [
            { name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } },
          ],
          responses: { 200: { description: 'Asistencia y experiencia sincronizadas' } },
        },
      },

      // ==========================================
      // MANUAL MATCHES (Análisis Pro)
      // ==========================================
};

import { requestBodyFromSchema } from '../zod-schema';
import { addExerciseToSessionSchema, createTrainingSchema } from '../../schemas/training';
export const trainingsPaths = {
      '/api/trainings': {
        post: {
          requestBody: requestBodyFromSchema(createTrainingSchema),
          summary: 'Crear un macrociclo de entrenamiento (AdminClub)',
          tags: ['Trainings'],
          responses: { 201: { description: 'Plan creado con éxito' } },
        },
      },
      '/api/trainings/{planId}': {
        get: {
          summary: 'Obtener un macrociclo completo con sus sesiones',
          tags: ['Trainings'],
          parameters: [
            {
              name: 'planId',
              in: 'path',
              required: true,
              schema: { type: 'string', format: 'uuid' },
            },
          ],
          responses: { 200: { description: 'Plan devuelto exitosamente' } },
        },
        delete: {
          summary: 'Eliminar un plan de entrenamiento completo (AdminClub)',
          tags: ['Trainings'],
          parameters: [
            {
              name: 'planId',
              in: 'path',
              required: true,
              schema: { type: 'string', format: 'uuid' },
            },
          ],
          responses: { 200: { description: 'Plan eliminado' } },
        },
      },
      '/api/trainings/player/{playerId}': {
        get: {
          summary: 'Lista de planes de un jugador específico',
          tags: ['Trainings'],
          parameters: [
            {
              name: 'playerId',
              in: 'path',
              required: true,
              schema: { type: 'string', format: 'uuid' },
            },
          ],
          responses: { 200: { description: 'Planes obtenidos con éxito' } },
        },
      },
      '/api/trainings/player/{playerId}/upcoming': {
        get: {
          summary: 'Obtener próximas sesiones inminentes del jugador',
          tags: ['Trainings'],
          parameters: [
            {
              name: 'playerId',
              in: 'path',
              required: true,
              schema: { type: 'string', format: 'uuid' },
            },
          ],
          responses: { 200: { description: 'Lista de sesiones inminentes devuelta' } },
        },
      },
      '/api/trainings/sessions/{sessionId}': {
        get: {
          summary: 'Detalles y ejercicios de una sesión específica',
          tags: ['Trainings'],
          parameters: [
            {
              name: 'sessionId',
              in: 'path',
              required: true,
              schema: { type: 'string', format: 'uuid' },
            },
          ],
          responses: { 200: { description: 'Sesión obtenida con éxito' } },
        },
      },
      '/api/trainings/sessions/{sessionId}/exercises': {
        post: {
          requestBody: requestBodyFromSchema(addExerciseToSessionSchema),
          summary: 'Añadir un ejercicio a una sesión (AdminClub)',
          tags: ['Trainings'],
          parameters: [
            {
              name: 'sessionId',
              in: 'path',
              required: true,
              schema: { type: 'string', format: 'uuid' },
            },
          ],
          responses: { 201: { description: 'Ejercicio añadido exitosamente' } },
        },
      },
      '/api/trainings/sessions/{targetSessionId}/clone-from/{sourceSessionId}': {
        post: {
          summary: 'Clonar ejercicios de una sesión a otra',
          tags: ['Trainings'],
          parameters: [
            {
              name: 'targetSessionId',
              in: 'path',
              required: true,
              schema: { type: 'string', format: 'uuid' },
            },
            {
              name: 'sourceSessionId',
              in: 'path',
              required: true,
              schema: { type: 'string', format: 'uuid' },
            },
          ],
          responses: { 201: { description: 'Ejercicios clonados con éxito' } },
        },
      },
      '/api/trainings/sessions/exercises/{sessionExerciseId}': {
        put: {
          summary: 'Actualizar estado de un ejercicio',
          tags: ['Trainings'],
          parameters: [
            {
              name: 'sessionExerciseId',
              in: 'path',
              required: true,
              schema: { type: 'string', format: 'uuid' },
            },
          ],
          responses: { 200: { description: 'Estado actualizado' } },
        },
        delete: {
          summary: 'Quitar un ejercicio de una sesión (AdminClub)',
          tags: ['Trainings'],
          parameters: [
            {
              name: 'sessionExerciseId',
              in: 'path',
              required: true,
              schema: { type: 'string', format: 'uuid' },
            },
          ],
          responses: { 200: { description: 'Ejercicio quitado con éxito' } },
        },
      },

      // ==========================================
      // TEAMS (Equipos)
      // ==========================================
};

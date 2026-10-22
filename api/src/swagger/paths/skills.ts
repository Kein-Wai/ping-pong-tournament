export const skillsPaths = {
      '/api/skills/{playerId}': {
        put: {
          summary: 'Editar manualmente los atributos (AdminClub)',
          tags: ['Skills'],
          parameters: [
            {
              name: 'playerId',
              in: 'path',
              required: true,
              schema: { type: 'string', format: 'uuid' },
            },
          ],
          responses: { 200: { description: 'Atributos actualizados' } },
        },
      },
      '/api/skills/{playerId}/consolidate': {
        put: {
          summary: 'Consolidar progreso (AdminClub)',
          tags: ['Skills'],
          parameters: [
            {
              name: 'playerId',
              in: 'path',
              required: true,
              schema: { type: 'string', format: 'uuid' },
            },
          ],
          responses: { 200: { description: 'Progreso consolidado de manera permanente' } },
        },
      },

      // ==========================================
      // EVENTS (Calendario)
      // ==========================================
};

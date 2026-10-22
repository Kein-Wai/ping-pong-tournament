export const feedbackPaths = {
      '/api/feedback': {
        get: {
          summary: 'Listar reportes de bugs y sugerencias',
          tags: ['Feedback'],
          responses: { 200: { description: 'Reportes devueltos' } },
        },
        post: {
          summary: 'Enviar un reporte',
          tags: ['Feedback'],
          responses: { 201: { description: 'Reporte registrado exitosamente' } },
        },
      },
      '/api/feedback/{id}/status': {
        put: {
          summary: 'Cambiar el estado de un ticket (SuperAdmin)',
          tags: ['Feedback'],
          parameters: [
            { name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } },
          ],
          responses: { 200: { description: 'Estado actualizado' } },
        },
      },

      // ==========================================
      // SEASONS
      // ==========================================
};

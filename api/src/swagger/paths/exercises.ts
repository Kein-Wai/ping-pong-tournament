
export const exercisesPaths = {
      '/api/exercises': {
        get: {
          summary: 'Obtener el catálogo de ejercicios',
          tags: ['Exercises'],
          parameters: [
            { name: 'category', in: 'query', required: false, schema: { type: 'string' } },
          ],
          responses: { 200: { description: 'Catálogo devuelto exitosamente' } },
        },
        post: {
          summary: 'Crear un nuevo ejercicio en el catálogo',
          tags: ['Exercises'],
          responses: { 201: { description: 'Ejercicio creado' } },
        },
      },

      // ==========================================
      // TRAININGS
      // ==========================================
};

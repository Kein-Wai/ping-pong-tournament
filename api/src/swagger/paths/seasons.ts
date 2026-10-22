export const seasonsPaths = {
      '/api/seasons': {
        get: {
          summary: 'Listar todas las temporadas registradas',
          tags: ['Seasons'],
          responses: { 200: { description: 'Temporadas devueltas' } },
        },
      },
};

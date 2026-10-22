export const user_typesPaths = {
      '/api/user-types': {
        get: {
          summary: 'Obtiene la lista de tipos de usuario (SuperAdmin)',
          tags: ['User Types'],
          responses: {
            200: { description: 'Lista de tipos de usuario globales devuelta' },
            403: { description: 'Permisos insuficientes' },
          },
        },
      },

      // ==========================================
      // USERS
      // ==========================================
};

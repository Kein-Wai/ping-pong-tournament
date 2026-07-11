import swaggerJSDoc from 'swagger-jsdoc';
import swaggerUi from 'swagger-ui-express';
import { Express } from 'express';

// Información básica de tu API
const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Ping Pong API',
      version: '1.0.0',
      description: 'Documentación oficial de la API de torneos de tenis de mesa',
    },
    paths: {
      '/api/user-types': {
        get: {
          summary: 'Obtiene la lista de tipos de usuario',
          tags: ['User Types'],
          responses: {
            200: {
              description: 'Lista devuelta exitosamente',
              content: {
                'application/json': {
                  schema: {
                    type: 'array',
                    items: {
                      type: 'object',
                      properties: {
                        id: { type: 'integer', example: 1 },
                        name: { type: 'string', example: 'Admin' },
                      },
                    },
                  },
                },
              },
            },
            500: {
              description: 'Error interno del servidor',
            },
          },
        },
      },
    },
    servers: [
      {
        url: 'http://localhost:3000',
        description: 'Servidor de Desarrollo Local',
      },
    ],
  },
  // Le decimos a Swagger dónde buscar los comentarios (nuestra carpeta de rutas)
  apis: ['./src/routes/*.ts'],
};

const swaggerSpec = swaggerJSDoc(options);

export const setupSwagger = (app: Express) => {
  // Creamos la ruta /api-docs donde vivirá la interfaz gráfica
  app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));
};

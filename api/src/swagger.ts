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
                        id: { type: 'string', example: '123e4567-e89b-12d3-a456-426614174000' },
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
      '/api/users': {
        get: {
          summary: 'Obtiene la lista de todos los usuarios',
          tags: ['Users'],
          responses: {
            200: {
              description: 'Lista de usuarios devuelta exitosamente',
              content: {
                'application/json': {
                  schema: {
                    type: 'array',
                    items: {
                      type: 'object',
                      properties: {
                        id: { type: 'string', example: '123e4567-e89b-12d3-a456-426614174000' },
                        email: { type: 'string', example: 'jugador@pingpong.com' },
                        name: { type: 'string', example: 'Carlos Alcaraz' },
                        userTypeId: { type: 'integer', example: 2 },
                        createdAt: { type: 'string', format: 'date-time' },
                        updatedAt: { type: 'string', format: 'date-time' },
                      },
                    },
                  },
                },
              },
            },
            500: { description: 'Error al obtener los usuarios' },
          },
        },
        post: {
          summary: 'Crea un nuevo usuario',
          tags: ['Users'],
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    email: { type: 'string', example: 'nuevo@pingpong.com' },
                    name: { type: 'string', example: 'Rafa Nadal' },
                    userTypeId: { type: 'integer', example: 2 },
                  },
                },
              },
            },
          },
          responses: {
            201: {
              description: 'Usuario creado exitosamente',
            },
            500: { description: 'Error al crear el usuario' },
          },
        },
      },
      '/api/users/{id}': {
        put: {
          summary: 'Actualiza un usuario existente',
          tags: ['Users'],
          parameters: [
            {
              id: { type: 'string', example: '123e4567-e89b-12d3-a456-426614174000' },
              in: 'path',
              required: true,
              description: 'ID del usuario a actualizar',
              schema: { type: 'string' },
            },
          ],
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    name: { type: 'string', example: 'Rafa Nadal (Actualizado)' },
                    email: { type: 'string', example: 'rafa@pingpong.com' },
                    userTypeId: { type: 'integer', example: 1 },
                  },
                },
              },
            },
          },
          responses: {
            200: { description: 'Usuario actualizado exitosamente' },
            500: { description: 'Error al actualizar el usuario' },
          },
        },
        delete: {
          summary: 'Borra un usuario',
          tags: ['Users'],
          parameters: [
            {
              id: { type: 'string', example: '123e4567-e89b-12d3-a456-426614174000' },
              in: 'path',
              required: true,
              description: 'ID del usuario a borrar',
              schema: { type: 'string' },
            },
          ],
          responses: {
            204: { description: 'Usuario borrado exitosamente (Sin contenido)' },
            500: { description: 'Error al borrar el usuario' },
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

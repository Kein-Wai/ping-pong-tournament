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
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          description: 'Introduce tu token JWT aquí para acceder a las rutas protegidas',
        },
      },
    },
    security: [
      {
        bearerAuth: [], // Esto aplica el candado a nivel global en Swagger
      },
    ],
    paths: {
      '/api/auth/register': {
        post: {
          summary: 'Registra un nuevo jugador (Público)',
          description:
            'Crea un nuevo usuario con el rol de Player automáticamente y devuelve un JWT para iniciar sesión inmediatamente.',
          tags: ['Auth'],
          // Importante: No ponemos "security" aquí porque es una ruta pública
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['email', 'password', 'confirmPassword', 'name', 'surname'],
                  properties: {
                    email: { type: 'string', format: 'email', example: 'nuevo@pingpong.com' },
                    password: { type: 'string', minLength: 6, example: 'password@P123' },
                    confirmPassword: { type: 'string', minLength: 6, example: 'password@P123' },
                    name: { type: 'string', example: 'Ana' },
                    surname: { type: 'string', example: 'Gómez' },
                  },
                },
              },
            },
          },
          responses: {
            201: {
              description: 'Jugador registrado con éxito. Devuelve el JWT y los datos básicos.',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      message: { type: 'string', example: 'Jugador registrado con éxito' },
                      token: { type: 'string', example: 'eyJhbGciOiJIUzI1NiIsInR...' },
                      user: {
                        type: 'object',
                        properties: {
                          id: { type: 'string', format: 'uuid' },
                          email: { type: 'string', format: 'email' },
                          name: { type: 'string' },
                          role: { type: 'string', example: 'Player' },
                        },
                      },
                    },
                  },
                },
              },
            },
            400: {
              description:
                'Datos inválidos (las contraseñas no coinciden, formato incorrecto) o el email ya está en uso',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      error: { type: 'string', example: 'Datos inválidos' },
                      details: {
                        type: 'object',
                        description: 'Árbol de errores generado por Zod',
                      },
                    },
                  },
                },
              },
            },
            500: {
              description:
                'Error interno del servidor (ej. el rol Player no existe en la base de datos)',
            },
          },
        },
      },
      '/api/auth/login': {
        post: {
          summary: 'Inicia sesión con email y contraseña (Local)',
          tags: ['Auth'],
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    email: { type: 'string', format: 'email', example: 'carlos@pingpong.com' },
                    password: { type: 'string', example: 'password123' },
                  },
                },
              },
            },
          },
          responses: {
            200: {
              description: 'Login exitoso, devuelve el JWT',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      message: { type: 'string', example: 'Login local exitoso' },
                      token: { type: 'string', example: 'eyJhbGciOiJIUzI1NiIsInR...' },
                    },
                  },
                },
              },
            },
            400: { description: 'Datos de entrada inválidos' },
            401: { description: 'Credenciales incorrectas' },
          },
        },
      },
      '/api/auth/google': {
        post: {
          summary: 'Inicia sesión o regístrate usando Google (OAuth2)',
          tags: ['Auth'],
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    credential: {
                      type: 'string',
                      description: 'El ID Token JWT proporcionado por Google al frontend',
                      example: 'eyJhbGciOiJSUzI1NiIsImtp...',
                    },
                  },
                },
              },
            },
          },
          responses: {
            200: {
              description: 'Autenticación exitosa, devuelve el JWT propio de la API',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      message: { type: 'string', example: 'Login con Google exitoso' },
                      token: { type: 'string', example: 'eyJhbGciOiJIUzI1NiIsInR...' },
                    },
                  },
                },
              },
            },
            400: { description: 'Falta el token de Google en la petición' },
            401: { description: 'El token de Google es inválido o ha caducado' },
          },
        },
      },
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
        get: {
          summary: 'Obtienes un solo user',
          tags: ['Users'],
          parameters: [
            {
              name: 'id',
              in: 'path',
              required: true,
              description: 'ID del usuario a actualizar',
              schema: { type: 'string' },
              example: '123e4567-e89b-12d3-a456-426614174000',
            },
          ],
          responses: {
            200: {
              description: 'Lista de usuarios devuelta exitosamente',
              content: {
                'application/json': {
                  schema: {
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
            500: { description: 'Error al obtener los usuarios' },
          },
        },
        put: {
          summary: 'Actualiza un usuario existente',
          tags: ['Users'],
          parameters: [
            {
              name: 'id',
              in: 'path',
              required: true,
              description: 'ID del usuario a actualizar',
              schema: { type: 'string' },
              example: '123e4567-e89b-12d3-a456-426614174000',
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
              name: 'id',
              in: 'path',
              required: true,
              description: 'ID del usuario a actualizar',
              schema: { type: 'string' },
              example: '123e4567-e89b-12d3-a456-426614174000',
            },
          ],
          responses: {
            204: { description: 'Usuario borrado exitosamente (Sin contenido)' },
            500: { description: 'Error al borrar el usuario' },
          },
        },
      },
      '/api/matches': {
        get: {
          summary: 'Obtiene todos los partidos',
          description:
            'Devuelve una lista con todos los partidos, incluyendo información de los jugadores y de los torneos/ligas asociados.',
          tags: ['Matches'],
          responses: {
            200: {
              description: 'Lista de partidos devuelta exitosamente',
              content: {
                'application/json': {
                  schema: {
                    type: 'array',
                    items: {
                      type: 'object',
                      properties: {
                        id: { type: 'string', format: 'uuid' },
                        dateStart: { type: 'string', format: 'date-time' },
                        status: { type: 'string', nullable: true },
                        setOnePlayerOne: { type: 'integer', example: 11 },
                        setOnePlayerTwo: { type: 'integer', example: 8 },
                        playerOne: {
                          type: 'object',
                          properties: {
                            id: { type: 'string', format: 'uuid' },
                            name: { type: 'string', example: 'Carlos' },
                            surname: { type: 'string', example: 'Alcaraz' },
                          },
                        },
                        playerTwo: {
                          type: 'object',
                          properties: {
                            id: { type: 'string', format: 'uuid' },
                            name: { type: 'string', example: 'Rafa' },
                            surname: { type: 'string', example: 'Nadal' },
                          },
                        },
                        tournament: { type: 'object', nullable: true },
                        league: { type: 'object', nullable: true },
                      },
                    },
                  },
                },
              },
            },
            500: { description: 'Error interno del servidor' },
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

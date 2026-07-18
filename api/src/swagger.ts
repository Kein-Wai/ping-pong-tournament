import swaggerJSDoc from 'swagger-jsdoc';
import swaggerUi from 'swagger-ui-express';
import { Express } from 'express';

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
        bearerAuth: [],
      },
    ],
    paths: {
      '/api/auth/register': {
        post: {
          summary: 'Registra un nuevo jugador (Público)',
          description:
            'Crea un nuevo usuario con el rol de Player automáticamente y devuelve un JWT para iniciar sesión inmediatamente.',
          tags: ['Auth'],
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
      '/api/users/me': {
        put: {
          summary: 'Actualizar perfil propio',
          description:
            'Permite al usuario autenticado cambiar su nombre, apellidos y contraseña. Si el usuario ya tenía contraseña, se requiere enviar "currentPassword" para validar el cambio.',
          tags: ['Users'],
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    name: { type: 'string', example: 'Carlos' },
                    surname: { type: 'string', example: 'Alcaraz' },
                    currentPassword: { type: 'string', example: 'MiClaveVieja123' },
                    newPassword: { type: 'string', example: 'MiClaveNueva456' },
                  },
                },
              },
            },
          },
          responses: {
            200: {
              description: 'Perfil actualizado exitosamente',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      message: { type: 'string', example: 'Perfil actualizado con éxito' },
                      user: {
                        type: 'object',
                        properties: {
                          id: { type: 'string' },
                          email: { type: 'string' },
                          name: { type: 'string' },
                          surname: { type: 'string' },
                        },
                      },
                    },
                  },
                },
              },
            },
            400: { description: 'Datos inválidos o falta la contraseña actual' },
            401: { description: 'Usuario no autenticado o contraseña actual incorrecta' },
            404: { description: 'Usuario no encontrado' },
            500: { description: 'Error interno' },
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
        post: {
          summary: 'Registrar un nuevo partido',
          description:
            'Crea un nuevo partido. Permite registrar tanto partidos programados (sin puntos) como partidos ya completados (enviando los resultados de los sets). Actualiza automáticamente las estadísticas (Elo) y las clasificaciones si el partido está completado.',
          tags: ['Matches'],
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['playerOneId', 'playerTwoId'],
                  properties: {
                    playerOneId: {
                      type: 'string',
                      format: 'uuid',
                      example: '123e4567-e89b-12d3-a456-426614174001',
                    },
                    playerTwoId: {
                      type: 'string',
                      format: 'uuid',
                      example: '123e4567-e89b-12d3-a456-426614174002',
                    },
                    dateStart: {
                      type: 'string',
                      format: 'date-time',
                      example: '2026-07-20T10:00:00.000Z',
                    },
                    tournamentId: {
                      type: 'string',
                      format: 'uuid',
                      description: 'Opcional. ID del torneo',
                    },
                    groupId: {
                      type: 'string',
                      format: 'uuid',
                      description: 'Opcional. ID del grupo',
                    },
                    knockoutId: {
                      type: 'string',
                      format: 'uuid',
                      description: 'Opcional. ID de la eliminatoria',
                    },
                    leagueId: {
                      type: 'string',
                      format: 'uuid',
                      description: 'Opcional. ID de la liga',
                    },
                    setOnePlayerOne: {
                      type: 'integer',
                      example: 11,
                      description: 'Puntos del Jugador 1 en el Set 1',
                    },
                    setOnePlayerTwo: {
                      type: 'integer',
                      example: 8,
                      description: 'Puntos del Jugador 2 en el Set 1',
                    },
                    setTwoPlayerOne: { type: 'integer', example: 9 },
                    setTwoPlayerTwo: { type: 'integer', example: 11 },
                    setThreePlayerOne: { type: 'integer', example: 12 },
                    setThreePlayerTwo: { type: 'integer', example: 10 },
                  },
                },
              },
            },
          },
          responses: {
            201: {
              description: 'Partido registrado con éxito',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      message: { type: 'string', example: 'Partido registrado con éxito' },
                      match: {
                        type: 'object',
                        properties: {
                          id: { type: 'string', format: 'uuid' },
                          status: { type: 'string', example: 'Completado' },
                          playerOneId: { type: 'string', format: 'uuid' },
                          playerTwoId: { type: 'string', format: 'uuid' },
                        },
                      },
                    },
                  },
                },
              },
            },
            400: {
              description:
                'Datos inválidos. Zod validará reglas de Ping Pong (ej. diferencia de 2 puntos, mínimo 11 puntos) o que los jugadores no sean el mismo.',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      error: { type: 'string', example: 'Datos inválidos' },
                      details: { type: 'object', description: 'Árbol de errores de Zod' },
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
      '/api/tournaments': {
        get: {
          summary: 'Obtener todos los torneos',
          description: 'Devuelve una lista con todos los torneos registrados en la base de datos.',
          tags: ['Tournaments'],
          responses: {
            200: {
              description: 'Lista de torneos devuelta exitosamente',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      success: { type: 'boolean', example: true },
                      data: {
                        type: 'array',
                        items: {
                          type: 'object',
                          properties: {
                            id: { type: 'string', format: 'uuid' },
                            name: { type: 'string', example: 'Open de Verano 2026 - Castellón' },
                            dateStart: { type: 'string', format: 'date-time' },
                            numPlayers: { type: 'integer', example: 16 },
                            status: { type: 'string', example: 'Programado' },
                            groupsCreated: { type: 'boolean', example: false },
                            knockoutCreated: { type: 'boolean', example: false },
                          },
                        },
                      },
                    },
                  },
                },
              },
            },
            500: {
              description: 'Error interno del servidor',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      success: { type: 'boolean', example: false },
                      message: { type: 'string', example: 'Error al obtener torneos' },
                    },
                  },
                },
              },
            },
          },
        },
        post: {
          summary: 'Crear un nuevo torneo',
          description:
            'Crea un torneo en estado "PROGRAMADO" a la espera de que se inscriban los participantes. Campos como el estado y la creación de grupos/fases son controlados estrictamente por el backend.',
          tags: ['Tournaments'],
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['name', 'dateStart', 'numPlayers'],
                  properties: {
                    name: {
                      type: 'string',
                      example: 'Open de Verano 2026 - Castellón',
                      description: 'Nombre del torneo (mínimo 3 caracteres)',
                    },
                    dateStart: {
                      type: 'string',
                      format: 'date-time',
                      example: '2026-07-20T09:00:00.000Z',
                      description: 'Fecha de inicio en formato ISO 8601',
                    },
                    numPlayers: {
                      type: 'integer',
                      example: 16,
                      description: 'Número máximo de jugadores permitidos',
                    },
                    numGroup: {
                      type: 'integer',
                      example: 4,
                      description: 'Cantidad de grupos deseada',
                    },
                    numGroupPlayers: {
                      type: 'integer',
                      example: 4,
                      description: 'Jugadores por grupo',
                    },
                    typeTournament: { type: 'string', example: 'Abierto' },
                    levelTournament: { type: 'string', example: 'Intermedio' },
                    rounds: { type: 'string', example: '3' },
                    typeKnockout: { type: 'string', example: 'Llave A' },
                    playersKnockout: {
                      type: 'string',
                      example: '2',
                      description: 'Clasificados por grupo',
                    },
                    sortKnockout: { type: 'string', example: 'Sorteo Cabezas de Serie' },
                    allPos: {
                      type: 'boolean',
                      example: true,
                      description: 'Si es true, se juegan todas las posiciones de consolación',
                    },
                  },
                },
              },
            },
          },
          responses: {
            201: {
              description: 'Torneo creado con éxito',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      message: { type: 'string', example: 'Torneo creado con éxito' },
                      tournament: {
                        type: 'object',
                        properties: {
                          id: { type: 'string', format: 'uuid' },
                          name: { type: 'string' },
                          status: { type: 'string', example: 'PROGRAMADO' },
                          groupsCreated: { type: 'boolean', example: false },
                          knockoutCreated: { type: 'boolean', example: false },
                        },
                      },
                    },
                  },
                },
              },
            },
            400: {
              description: 'Datos inválidos enviados en el body (Error de validación Zod)',
            },
            500: {
              description: 'Error interno del servidor',
            },
          },
        },
      },
      '/api/tournaments/{id}': {
        get: {
          summary: 'Obtener un torneo específico',
          description: 'Devuelve todos los detalles de un torneo buscando por su ID único.',
          tags: ['Tournaments'],
          parameters: [
            {
              name: 'id',
              in: 'path',
              required: true,
              description: 'ID único del torneo',
              schema: { type: 'string', format: 'uuid' },
            },
          ],
          responses: {
            200: {
              description: 'Torneo encontrado y devuelto exitosamente',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      success: { type: 'boolean', example: true },
                      data: {
                        type: 'object',
                        nullable: true, // Prisma devuelve null si no lo encuentra
                        properties: {
                          id: { type: 'string', format: 'uuid' },
                          name: { type: 'string', example: 'Open de Verano 2026 - Castellón' },
                          dateStart: { type: 'string', format: 'date-time' },
                          numPlayers: { type: 'integer', example: 16 },
                          status: { type: 'string', example: 'Programado' },
                          typeTournament: { type: 'string', example: 'Abierto' },
                          levelTournament: { type: 'string', example: 'Intermedio' },
                          groupsCreated: { type: 'boolean', example: false },
                          knockoutCreated: { type: 'boolean', example: false },
                        },
                      },
                    },
                  },
                },
              },
            },
            500: {
              description: 'Error interno del servidor',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      success: { type: 'boolean', example: false },
                      message: { type: 'string', example: 'Error al obtener torneo' },
                    },
                  },
                },
              },
            },
          },
        },
      },
      '/api/tournaments/{id}/register': {
        post: {
          summary: 'Inscribir un jugador en el torneo',
          description:
            'Apunta a un jugador a un torneo específico. Valida que el torneo exista, que tenga plazas libres, que no se hayan generado los grupos todavía y que el jugador no esté ya inscrito.',
          tags: ['Tournaments'],
          parameters: [
            {
              name: 'id',
              in: 'path',
              required: true,
              description: 'ID único del torneo',
              schema: { type: 'string', format: 'uuid' },
            },
          ],
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['playerId'],
                  properties: {
                    playerId: {
                      type: 'string',
                      format: 'uuid',
                      example: '123e4567-e89b-12d3-a456-426614174001',
                      description: 'ID único del jugador a inscribir',
                    },
                  },
                },
              },
            },
          },
          responses: {
            201: {
              description: 'Jugador inscrito con éxito',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      message: { type: 'string', example: 'Jugador inscrito con éxito' },
                      participant: {
                        type: 'object',
                        properties: {
                          id: { type: 'string', format: 'uuid' },
                          tournamentId: { type: 'string', format: 'uuid' },
                          playerId: { type: 'string', format: 'uuid' },
                          status: { type: 'string', example: 'CONFIRMED' },
                          registeredAt: { type: 'string', format: 'date-time' },
                        },
                      },
                    },
                  },
                },
              },
            },
            400: {
              description:
                'Solicitud denegada (Ej. El torneo está lleno, los grupos ya están creados, el jugador ya está inscrito, o el UUID es inválido).',
            },
            404: {
              description: 'Torneo no encontrado',
            },
            500: {
              description: 'Error interno del servidor',
            },
          },
        },
      },
      '/api/tournaments/{id}/generate-groups': {
        post: {
          summary: 'Generar grupos y partidos (Algoritmo Serpiente)',
          description:
            'Cierra las inscripciones del torneo, ordena a los jugadores confirmados por su ELO y los distribuye en grupos usando el método "Snake Seeding". Además, genera automáticamente todos los partidos de la fase de grupos y cambia el estado del torneo a ABIERTO.',
          tags: ['Tournaments'],
          parameters: [
            {
              name: 'id',
              in: 'path',
              required: true,
              description: 'ID único del torneo',
              schema: { type: 'string', format: 'uuid' },
            },
          ],
          responses: {
            200: {
              description: 'Grupos y partidos generados con éxito',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      success: { type: 'boolean', example: true },
                      message: {
                        type: 'string',
                        example: 'Grupos y partidos generados mediante Serpiente',
                      },
                    },
                  },
                },
              },
            },
            400: {
              description:
                'Error en la solicitud (Ej. El torneo no existe, no hay jugadores suficientes, o los grupos ya fueron generados).',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      error: { type: 'string', example: 'Los grupos ya han sido generados' },
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
      '/api/tournaments/{id}/groups/matches': {
        get: {
          summary: 'Obtener partidos de la fase de grupos',
          description:
            'Devuelve una lista de todos los partidos correspondientes a la fase de grupos de un torneo. Permite filtrar opcionalmente por un grupo específico.',
          tags: ['Tournaments'],
          parameters: [
            {
              name: 'id',
              in: 'path',
              required: true,
              description: 'ID único del torneo',
              schema: { type: 'string', format: 'uuid' },
            },
            {
              name: 'groupId',
              in: 'query',
              required: false,
              description: 'ID único del grupo para filtrar los partidos de un solo grupo',
              schema: { type: 'string', format: 'uuid' },
            },
          ],
          responses: {
            200: {
              description: 'Lista de partidos obtenida con éxito',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      success: { type: 'boolean', example: true },
                      data: {
                        type: 'array',
                        description: 'Lista de partidos',
                        items: {
                          type: 'object',
                          properties: {
                            id: { type: 'string', format: 'uuid' },
                            dateStart: { type: 'string', format: 'date-time' },
                            status: { type: 'string', example: 'Programado' },
                            playerOne: {
                              type: 'object',
                              properties: {
                                id: { type: 'string' },
                                name: { type: 'string' },
                                surname: { type: 'string' },
                              },
                            },
                            playerTwo: {
                              type: 'object',
                              properties: {
                                id: { type: 'string' },
                                name: { type: 'string' },
                                surname: { type: 'string' },
                              },
                            },
                          },
                        },
                      },
                    },
                  },
                },
              },
            },
            500: {
              description: 'Error interno del servidor',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      success: { type: 'boolean', example: false },
                      message: {
                        type: 'string',
                        example: 'Error al obtener los partidos del grupo.',
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },

      '/api/tournaments/{id}/groups/classifications': {
        get: {
          summary: 'Obtener clasificación de la fase de grupos',
          description:
            'Devuelve la tabla de clasificación de la fase de grupos ordenada por número de grupo y posición. Se puede filtrar por un grupo específico.',
          tags: ['Tournaments'],
          parameters: [
            {
              name: 'id',
              in: 'path',
              required: true,
              description: 'ID único del torneo',
              schema: { type: 'string', format: 'uuid' },
            },
            {
              name: 'groupId',
              in: 'query',
              required: false,
              description: 'ID único del grupo para ver solo su clasificación',
              schema: { type: 'string', format: 'uuid' },
            },
          ],
          responses: {
            200: {
              description: 'Clasificación obtenida con éxito',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      success: { type: 'boolean', example: true },
                      data: {
                        type: 'array',
                        description: 'Lista de clasificaciones',
                        items: {
                          type: 'object',
                          properties: {
                            id: { type: 'string', format: 'uuid' },
                            position: { type: 'integer', example: 1 },
                            pointsClas: { type: 'integer', example: 6 },
                            matchesPlayed: { type: 'integer', example: 3 },
                            player: {
                              type: 'object',
                              properties: {
                                id: { type: 'string' },
                                name: { type: 'string' },
                                surname: { type: 'string' },
                              },
                            },
                            tournamentGroup: {
                              type: 'object',
                              properties: {
                                group: { type: 'integer', example: 1 },
                              },
                            },
                          },
                        },
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

      '/api/tournaments/{id}/bracket': {
        get: {
          summary: 'Obtener el cuadro de eliminatorias (Bracket)',
          description:
            'Devuelve el árbol completo de las rondas eliminatorias de un torneo (Ej. Cuartos, Semifinales, Final), incluyendo los partidos programados, completados y los futuros cruces (TBD).',
          tags: ['Tournaments'],
          parameters: [
            {
              name: 'id',
              in: 'path',
              required: true,
              description: 'ID único del torneo',
              schema: { type: 'string', format: 'uuid' },
            },
            {
              name: 'type',
              in: 'query',
              required: false,
              description:
                'Tipo de llave (A para Principal, B para Consolación). Por defecto es A.',
              schema: { type: 'string', enum: ['A', 'B'], default: 'A' },
            },
          ],
          responses: {
            200: {
              description: 'Cuadro de eliminatorias obtenido con éxito',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      success: { type: 'boolean', example: true },
                      data: {
                        type: 'array',
                        description: 'Lista de rondas eliminatorias',
                        items: {
                          type: 'object',
                          properties: {
                            id: { type: 'string', format: 'uuid' },
                            round: { type: 'string', example: 'Octavos' },
                            type: { type: 'string', example: 'A' },
                            matches: {
                              type: 'array',
                              description: 'Partidos correspondientes a esta ronda',
                              items: {
                                type: 'object',
                                properties: {
                                  id: { type: 'string', format: 'uuid' },
                                  order: { type: 'integer', example: 0 },
                                  status: { type: 'string', example: 'Programado' },
                                  playerOne: {
                                    type: 'object',
                                    nullable: true,
                                    properties: {
                                      id: { type: 'string' },
                                      name: { type: 'string' },
                                      surname: { type: 'string' },
                                    },
                                  },
                                  playerTwo: {
                                    type: 'object',
                                    nullable: true,
                                    properties: {
                                      id: { type: 'string' },
                                      name: { type: 'string' },
                                      surname: { type: 'string' },
                                    },
                                  },
                                },
                              },
                            },
                          },
                        },
                      },
                    },
                  },
                },
              },
            },
            404: {
              description: 'Cuadro no encontrado (aún no se han generado las eliminatorias)',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      success: { type: 'boolean', example: false },
                      message: {
                        type: 'string',
                        example: 'No se ha generado el cuadro para este torneo todavía.',
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
      '/api/tournaments/{id}/classifications': {
        get: {
          summary: 'Obtener clasificación final del torneo',
          description:
            'Devuelve la tabla de posiciones finales de todos los jugadores que han terminado su participación en el torneo.',
          tags: ['Tournaments'],
          parameters: [
            {
              name: 'id',
              in: 'path',
              required: true,
              description: 'ID único del torneo',
              schema: { type: 'string', format: 'uuid' },
            },
          ],
          responses: {
            200: {
              description: 'Clasificación final obtenida con éxito',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      success: { type: 'boolean', example: true },
                      data: {
                        type: 'array',
                        description: 'Lista de clasificaciones finales',
                        items: {
                          type: 'object',
                          properties: {
                            id: { type: 'string', format: 'uuid' },
                            tournamentId: { type: 'string', format: 'uuid' },
                            playerId: { type: 'string', format: 'uuid' },
                            lastRound: { type: 'string', example: 'Semifinales', nullable: true },
                            position: { type: 'integer', example: 3, nullable: true },
                          },
                        },
                      },
                    },
                  },
                },
              },
            },
            500: {
              description: 'Error interno del servidor',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      success: { type: 'boolean', example: false },
                      message: { type: 'string', example: 'Error al obtener la clasificación.' },
                    },
                  },
                },
              },
            },
          },
        },
      },
      '/api/tournaments/{id}/participants': {
        get: {
          summary: 'Obtener lista de participantes inscritos',
          description:
            'Devuelve la lista de todos los jugadores inscritos en un torneo, ordenados por fecha de inscripción, incluyendo sus estadísticas básicas (como el ELO).',
          tags: ['Tournaments'],
          parameters: [
            {
              name: 'id',
              in: 'path',
              required: true,
              description: 'ID único del torneo',
              schema: { type: 'string', format: 'uuid' },
            },
          ],
          responses: {
            200: {
              description: 'Participantes obtenidos con éxito',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      success: { type: 'boolean', example: true },
                      data: {
                        type: 'array',
                        description: 'Lista de participantes inscritos',
                        items: {
                          type: 'object',
                          properties: {
                            id: { type: 'string', format: 'uuid' },
                            tournamentId: { type: 'string', format: 'uuid' },
                            playerId: { type: 'string', format: 'uuid' },
                            registeredAt: { type: 'string', format: 'date-time' },
                            status: { type: 'string', example: 'Confirmado' },
                            player: {
                              type: 'object',
                              properties: {
                                id: { type: 'string', format: 'uuid' },
                                name: { type: 'string', example: 'Carlos' },
                                surname: { type: 'string', example: 'Alcaraz' },
                                stats: {
                                  type: 'object',
                                  nullable: true,
                                  properties: {
                                    elo: { type: 'integer', example: 850 },
                                    matchWon: { type: 'integer', example: 10 },
                                    matchLost: { type: 'integer', example: 2 },
                                  },
                                },
                              },
                            },
                          },
                        },
                      },
                    },
                  },
                },
              },
            },
            500: {
              description: 'Error interno del servidor',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      success: { type: 'boolean', example: false },
                      message: {
                        type: 'string',
                        example: 'Error interno del servidor al cargar los participantes.',
                      },
                    },
                  },
                },
              },
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

  apis: ['./src/routes/*.ts'],
};

const swaggerSpec = swaggerJSDoc(options);

export const setupSwagger = (app: Express) => {
  app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));
};

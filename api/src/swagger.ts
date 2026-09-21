import swaggerJSDoc from 'swagger-jsdoc';
import swaggerUi from 'swagger-ui-express';
import { Express } from 'express';

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Ping Pong API',
      version: '1.0.0',
      description:
        'Documentación oficial de la API de torneos de tenis de mesa (Arquitectura SaaS / Multi-tenant)',
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
    tags: [
      { name: 'Auth', description: 'Operaciones de autenticación y registro libre' },
      {
        name: 'Clubs',
        description: 'Gestión de clubes, solicitudes de unión y control de miembros',
      },
      { name: 'Users', description: 'Gestión de perfiles de usuario y asignaciones' },
      { name: 'Tournaments', description: 'Gestión de torneos con aislamiento por clubes' },
      { name: 'Matches', description: 'Gestión y procesamiento de partidos' },
      { name: 'User Types', description: 'Consulta de roles globales del sistema' },
      { name: 'Trainings', description: 'Gestión de planes de entrenamiento y sesiones' },
      { name: 'Teams', description: 'Gestión de equipos, plantillas y calendarios por club' },
      {
        name: 'General Trainings',
        description: 'Gestión de clases grupales y horarios recurrentes',
      },
      { name: 'Manual Matches', description: 'Registro de análisis de partidos externos (Pro)' },
      { name: 'Skills', description: 'Gestión de la experiencia y atributos técnicos (RPG)' },
    ],
    paths: {
      // ==========================================
      // AUTH
      // ==========================================
      '/api/auth/register': {
        post: {
          summary: 'Registra un nuevo jugador (Público)',
          description:
            'Crea un nuevo usuario con el rol de Player automáticamente con estado de club "Registrado" y devuelve un JWT para iniciar sesión inmediatamente.',
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
                    password: { type: 'string', minLength: 8, example: 'password@P123' },
                    confirmPassword: { type: 'string', minLength: 8, example: 'password@P123' },
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
            },
            400: { description: 'Datos inválidos o el email ya está en uso' },
            500: { description: 'Error interno del servidor' },
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
            200: { description: 'Login exitoso, devuelve el JWT con los claims de club incluidos' },
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
                    credential: { type: 'string', example: 'eyJhbGciOiJSUzI1NiIsImtp...' },
                  },
                },
              },
            },
          },
          responses: {
            200: { description: 'Autenticación exitosa, devuelve el JWT propio de la API' },
            401: { description: 'El token de Google es inválido o ha caducado' },
          },
        },
      },

      // ==========================================
      // CLUBS
      // ==========================================
      '/api/clubs': {
        get: {
          summary: 'Listar todos los clubes activos (Público)',
          description:
            'Devuelve una lista con todos los clubes que han sido aprobados por el SuperAdmin para que los jugadores libres puedan buscar y solicitar unirse.',
          tags: ['Clubs'],
          responses: {
            200: { description: 'Lista de clubes aprobados obtenida con éxito' },
            500: { description: 'Error al obtener los clubes' },
          },
        },
        post: {
          summary: 'Solicitar la creación de un nuevo Club (Público)',
          description:
            'Permite a cualquier persona registrar la intención de fundar un club. El club se guardará con estado "Pendiente" y requerirá aprobación manual del SuperAdmin.',
          tags: ['Clubs'],
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['name'],
                  properties: {
                    name: {
                      type: 'string',
                      minLength: 3,
                      example: 'Club de Tenis de Mesa Valencia',
                    },
                  },
                },
              },
            },
          },
          responses: {
            201: { description: 'Club solicitado con éxito, pendiente de aprobación' },
            400: { description: 'Datos inválidos o el nombre del club ya está registrado' },
          },
        },
      },
      '/api/clubs/{id}/join': {
        post: {
          summary: 'Solicitar unirse a un Club',
          description:
            'Asocia al jugador autenticado al club especificado con un estado inicial de "Pendiente" a la espera de la revisión del AdminClub.',
          tags: ['Clubs'],
          parameters: [
            {
              name: 'id',
              in: 'path',
              required: true,
              schema: { type: 'string', format: 'uuid' },
              example: 'a1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6d',
            },
          ],
          responses: {
            200: { description: 'Solicitud enviada al administrador del club con éxito' },
            400: {
              description: 'El usuario ya pertenece o tiene una solicitud activa en otro club',
            },
            404: { description: 'Club no encontrado o no se encuentra activo' },
          },
        },
      },
      '/api/clubs/{id}/members': {
        get: {
          summary: 'Listar todos los miembros del Club (AdminClub / SuperAdmin)',
          description:
            'Devuelve la lista completa de jugadores asociados al club. Los AdminClub solo pueden consultar los miembros de su propio club asignado.',
          tags: ['Clubs'],
          parameters: [
            { name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } },
          ],
          responses: {
            200: { description: 'Miembros obtenidos exitosamente' },
            403: { description: 'Acceso denegado. No eres el administrador de este club.' },
          },
        },
      },
      '/api/clubs/{id}/members/{userId}/status': {
        put: {
          summary: 'Aprobar o Rechazar la membresía de un jugador (AdminClub / SuperAdmin)',
          description:
            'Cambia el estado de club de un jugador. Si se selecciona "Rechazado", el sistema desvincula al jugador del club dándole libertad de buscar otro.',
          tags: ['Clubs'],
          parameters: [
            { name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } },
            {
              name: 'userId',
              in: 'path',
              required: true,
              schema: { type: 'string', format: 'uuid' },
            },
          ],
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['status'],
                  properties: {
                    status: {
                      type: 'string',
                      enum: ['Aprobado', 'Rechazado'],
                      example: 'Aprobado',
                    },
                  },
                },
              },
            },
          },
          responses: {
            200: { description: 'Estado del miembro actualizado con éxito' },
            403: { description: 'Acceso denegado' },
            404: { description: 'El jugador no tiene solicitudes pendientes en este club' },
          },
        },
      },

      // ==========================================
      // USER TYPES
      // ==========================================
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
      '/api/users': {
        get: {
          summary: 'Obtiene la lista de jugadores filtrada por contexto de Club',
          description:
            'Devuelve la lista de jugadores. Si es consultado por un AdminClub o un Player, el sistema filtra de forma automática y transparente devolviendo únicamente los usuarios vinculados a su mismo club.',
          tags: ['Users'],
          responses: {
            200: { description: 'Lista de jugadores devuelta exitosamente' },
            500: { description: 'Error al obtener los usuarios' },
          },
        },
        post: {
          summary: 'Crear un usuario manualmente (AdminClub / SuperAdmin)',
          description:
            'Permite dar de alta a un usuario en el sistema. Si la acción la realiza un AdminClub, el usuario se crea directamente aprobado e integrado en su club de forma obligatoria.',
          tags: ['Users'],
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['email', 'name', 'userTypeId'],
                  properties: {
                    email: { type: 'string', format: 'email', example: 'manual@pingpong.com' },
                    name: { type: 'string', example: 'Rafa Nadal' },
                    surname: { type: 'string', example: 'Parera' },
                    userTypeId: {
                      type: 'string',
                      format: 'uuid',
                      description: 'ID del rol asignado',
                    },
                    elo: { type: 'integer', default: 500, example: 600 },
                    clubId: {
                      type: 'string',
                      format: 'uuid',
                      description: 'Solo configurable por el SuperAdmin',
                    },
                  },
                },
              },
            },
          },
          responses: {
            201: { description: 'Usuario creado y registrado en el club exitosamente' },
            400: { description: 'Datos de entrada inválidos' },
            403: { description: 'Falta club asignado en el administrador' },
          },
        },
      },
      '/api/users/me': {
        put: {
          summary: 'Actualizar perfil del usuario logueado',
          description:
            'Permite al usuario cambiar sus datos personales y actualizar su contraseña autenticando la clave previa.',
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
            200: { description: 'Perfil actualizado exitosamente' },
            400: { description: 'Contraseñas no coinciden o falta la clave actual' },
          },
        },
      },
      '/api/users/{id}': {
        get: {
          summary: 'Obtener el detalle de un usuario específico',
          tags: ['Users'],
          parameters: [
            { name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } },
          ],
          responses: {
            200: { description: 'Datos del usuario devueltos junto con sus estadísticas' },
          },
        },
        put: {
          summary: 'Actualizar un usuario (AdminClub / SuperAdmin)',
          description:
            'Modifica los datos de un usuario. Si es ejecutado por un AdminClub, el sistema verifica primero que pertenezca a su propio club y bloquea cualquier intento de cambiar su clubId o clubStatus.',
          tags: ['Users'],
          parameters: [
            { name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } },
          ],
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    name: { type: 'string', example: 'Carlos Actualizado' },
                    email: { type: 'string', format: 'email', example: 'carlos@nuevo.com' },
                    elo: { type: 'integer', example: 550 },
                  },
                },
              },
            },
          },
          responses: {
            200: { description: 'Usuario actualizado con éxito' },
            403: { description: 'No tienes permiso para editar jugadores de otros clubes' },
            404: { description: 'Usuario no encontrado' },
          },
        },
        delete: {
          summary: 'Eliminar un usuario del sistema (AdminClub / SuperAdmin)',
          description:
            'Elimina al usuario. Los AdminClub tienen la acción restringida exclusivamente a miembros verificados de su propio club.',
          tags: ['Users'],
          parameters: [
            { name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } },
          ],
          responses: {
            204: { description: 'Usuario eliminado correctamente (Sin contenido)' },
            403: { description: 'No tienes permiso para borrar jugadores ajenos a tu club' },
            404: { description: 'Usuario no encontrado' },
          },
        },
      },

      // ==========================================
      // TOURNAMENTS
      // ==========================================
      '/api/tournaments': {
        get: {
          summary: 'Obtener todos los torneos accesibles',
          description:
            'Aplica filtros contextuales multi-tenant. El SuperAdmin ve todo; el AdminClub ve los de su club; los Players ven los torneos privados de su propio club y todos los de tipo "Abierto" de otras entidades.',
          tags: ['Tournaments'],
          responses: { 200: { description: 'Lista filtrada de torneos devuelta exitosamente' } },
        },
        post: {
          summary: 'Crear un nuevo torneo asociado al Club (AdminClub / SuperAdmin)',
          description:
            'Registra un torneo. Si lo ejecuta un AdminClub, el sistema inyecta automáticamente su clubId de sesión en el registro, aislando el torneo del resto de organizaciones.',
          tags: ['Tournaments'],
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['name', 'dateStart', 'numPlayers'],
                  properties: {
                    name: { type: 'string', example: 'Torneo Social Primavera' },
                    dateStart: {
                      type: 'string',
                      format: 'date-time',
                      example: '2026-07-20T09:00:00.000Z',
                    },
                    numPlayers: { type: 'integer', example: 16 },
                    numGroup: { type: 'integer', example: 4 },
                    numGroupPlayers: { type: 'integer', example: 4 },
                    typeTournament: {
                      type: 'string',
                      enum: ['Interno', 'Abierto', 'Oficial'],
                      default: 'Interno',
                    },
                    levelTournament: {
                      type: 'string',
                      enum: ['Principiante', 'Intermedio', 'Avanzado', 'Federado', 'Mixto'],
                    },
                    rounds: {
                      type: 'string',
                      enum: ['TodosvsTodos', 'GruposKnockout', 'Knockout'],
                    },
                    playersKnockout: { type: 'integer', example: 2 },
                  },
                },
              },
            },
          },
          responses: {
            201: { description: 'Torneo estructurado y creado con éxito' },
            400: { description: 'Fallo de validación en configuraciones del sistema (Zod)' },
            403: { description: 'El administrador no cuenta con un club asignado' },
          },
        },
      },
      '/api/tournaments/{id}': {
        get: {
          summary: 'Obtener un torneo específico con sus inscritos',
          tags: ['Tournaments'],
          parameters: [
            { name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } },
          ],
          responses: { 200: { description: 'Estructura e inscripciones devueltas' } },
        },
        put: {
          summary: 'Actualizar configuración/formato de un torneo (AdminClub / SuperAdmin)',
          description:
            'Permite ajustar las matemáticas de un torneo (grupos, sets para ganar, clasificados) antes de iniciarlo.',
          tags: ['Tournaments'],
          parameters: [
            { name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } },
          ],
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    numGroup: { type: 'integer', example: 4 },
                    numGroupPlayers: { type: 'integer', example: 4 },
                    playersKnockout: { type: 'integer', example: 2 },
                    setsToWinGroup: { type: 'integer', example: 2 },
                    setsToWinKnockout: { type: 'integer', example: 3 },
                  },
                },
              },
            },
          },
          responses: {
            200: { description: 'Torneo actualizado con éxito' },
            400: { description: 'La configuración rompe las reglas matemáticas del formato' },
            403: { description: 'Sin permisos sobre este torneo' },
            404: { description: 'Torneo no encontrado' },
          },
        },
        delete: {
          summary: 'Eliminar un torneo programado',
          tags: ['Tournaments'],
          parameters: [
            { name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } },
          ],
          responses: {
            200: { description: 'Torneo eliminado con éxito' },
            400: { description: 'No se puede eliminar un torneo iniciado' },
            403: { description: 'Sin permisos sobre este torneo' },
          },
        },
      },
      '/api/tournaments/{id}/register': {
        post: {
          summary: 'Inscribir un jugador en el torneo',
          tags: ['Tournaments'],
          parameters: [
            { name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } },
          ],
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['playerId'],
                  properties: { playerId: { type: 'string', format: 'uuid' } },
                },
              },
            },
          },
          responses: { 201: { description: 'Inscripción procesada correctamente' } },
        },
      },
      '/api/tournaments/{id}/generate-groups': {
        post: {
          summary: 'Cerrar inscripciones y estructurar Fase de Grupos',
          tags: ['Tournaments'],
          parameters: [
            { name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } },
          ],
          responses: {
            200: { description: 'Grupos y enfrentamientos calculados mediante Serpiente' },
          },
        },
      },
      '/api/tournaments/{id}/groups/matches': {
        get: {
          summary: 'Listar los enfrentamientos de la fase de grupos',
          tags: ['Tournaments'],
          parameters: [
            { name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } },
            {
              name: 'groupId',
              in: 'query',
              required: false,
              schema: { type: 'string', format: 'uuid' },
            },
          ],
          responses: { 200: { description: 'Lista de partidos de grupo' } },
        },
      },
      '/api/tournaments/{id}/groups/classifications': {
        get: {
          summary: 'Ver posiciones y puntuaciones de los grupos',
          tags: ['Tournaments'],
          parameters: [
            { name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } },
            {
              name: 'groupId',
              in: 'query',
              required: false,
              schema: { type: 'string', format: 'uuid' },
            },
          ],
          responses: { 200: { description: 'Tablas de clasificación por grupo' } },
        },
      },
      '/api/tournaments/{id}/bracket': {
        get: {
          summary: 'Obtener el árbol de eliminación directa (Bracket)',
          tags: ['Tournaments'],
          parameters: [
            { name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } },
            {
              name: 'type',
              in: 'query',
              required: false,
              schema: { type: 'string', enum: ['A', 'B'], default: 'A' },
            },
          ],
          responses: { 200: { description: 'Estructura gráfica de llaves y tuberías de avance' } },
        },
      },
      '/api/tournaments/{id}/classifications': {
        get: {
          summary: 'Consultar posiciones finales e histórico del torneo',
          tags: ['Tournaments'],
          parameters: [
            { name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } },
          ],
          responses: { 200: { description: 'Clasificación final del torneo' } },
        },
      },
      '/api/tournaments/{id}/participants': {
        get: {
          summary: 'Listar participantes ordenados por ELO e inscripción',
          tags: ['Tournaments'],
          parameters: [
            { name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } },
          ],
          responses: { 200: { description: 'Lista completa de competidores' } },
        },
      },

      // ==========================================
      // MATCHES
      // ==========================================
      '/api/matches': {
        get: {
          summary: 'Obtener el listado histórico de partidos',
          tags: ['Matches'],
          responses: { 200: { description: 'Partidos devueltos exitosamente' } },
        },
        post: {
          summary: 'Registrar enfrentamientos y procesar cómputos de ELO',
          description:
            'Genera un partido. Si el estado es "Completado", calcula de manera automática los cambios de puntuación ELO global de los jugadores y actualiza clasificaciones en cascada.',
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
                    status: {
                      type: 'string',
                      enum: ['Programado', 'Iniciado', 'Abierto', 'Completado', 'Cancelado'],
                      default: 'Programado',
                    },
                    setOnePlayerOne: { type: 'integer', example: 11 },
                    setOnePlayerTwo: { type: 'integer', example: 9 },
                    setTwoPlayerOne: { type: 'integer', example: 11 },
                    setTwoPlayerTwo: { type: 'integer', example: 7 },
                  },
                },
              },
            },
          },
          responses: {
            201: { description: 'Partido e impactos en estadísticas procesados con éxito' },
            400: {
              description: 'Inconsistencias en el marcador bajo normativa oficial de tenis de mesa',
            },
          },
        },
      },
      '/api/matches/{id}': {
        put: {
          summary: 'Actualizar el resultado de un partido',
          description:
            'Permite a los administradores actualizar el marcador. Valida reglas oficiales ITTF y recalcula automáticamente el ELO y las clasificaciones en cascada.',
          tags: ['Matches'],
          parameters: [
            { name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } },
          ],
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    status: {
                      type: 'string',
                      enum: ['Programado', 'Iniciado', 'Completado', 'Cancelado'],
                      example: 'Completado',
                    },
                    setOnePlayerOne: { type: 'integer', example: 11 },
                    setOnePlayerTwo: { type: 'integer', example: 8 },
                    setTwoPlayerOne: { type: 'integer', example: 12 },
                    setTwoPlayerTwo: { type: 'integer', example: 10 },
                  },
                },
              },
            },
          },
          responses: {
            200: { description: 'Partido actualizado y estadísticas recalculadas' },
            400: {
              description: 'Marcador inválido (ej. 15-1) o faltan sets para darlo por Completado',
            },
            404: { description: 'Partido no encontrado' },
          },
        },
      },
      // ==========================================
      // EXERCISES
      // ==========================================
      '/api/exercises': {
        get: {
          summary: 'Obtener el catálogo de ejercicios',
          description:
            'Devuelve todos los ejercicios globales y los específicos del club del usuario.',
          tags: ['Exercises'],
          parameters: [
            { name: 'category', in: 'query', required: false, schema: { type: 'string' } },
          ],
          responses: { 200: { description: 'Catálogo devuelto exitosamente' } },
        },
        post: {
          summary: 'Crear un nuevo ejercicio en el catálogo (AdminClub)',
          tags: ['Exercises'],
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['name', 'description', 'category'],
                  properties: {
                    name: { type: 'string', example: 'Saque lateral corto' },
                    description: { type: 'string', example: 'Saque con efecto...' },
                    category: { type: 'string', example: 'Saques_Largos' },
                    code: { type: 'integer', example: 12 },
                  },
                },
              },
            },
          },
          responses: { 201: { description: 'Ejercicio creado con éxito' } },
        },
      },

      // ==========================================
      // TRAININGS
      // ==========================================
      '/api/trainings': {
        post: {
          summary: 'Crear un macrociclo de entrenamiento (AdminClub)',
          description:
            'Genera automáticamente un plan con N sesiones vacías distribuidas lógicamente por semanas.',
          tags: ['Trainings'],
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    playerId: { type: 'string', format: 'uuid' },
                    strengths: { type: 'string' },
                    weaknesses: { type: 'string' },
                    objectives: { type: 'string' },
                    sessionsPerWeek: { type: 'integer', example: 3 },
                    weeks: { type: 'integer', example: 4 },
                    startDate: { type: 'string', format: 'date-time' },
                  },
                },
              },
            },
          },
          responses: {
            201: { description: 'Plan y sesiones creados con éxito' },
            400: { description: 'Error de validación (Zod)' },
            403: { description: 'El jugador no pertenece a tu club' },
          },
        },
      },
      '/api/trainings/{planId}': {
        get: {
          summary: 'Obtener un macrociclo completo con sus sesiones (Dueño o Admin)',
          tags: ['Trainings'],
          parameters: [
            {
              name: 'planId',
              in: 'path',
              required: true,
              schema: { type: 'string', format: 'uuid' },
            },
          ],
          responses: {
            200: { description: 'Plan devuelto exitosamente' },
            403: { description: 'Sin permisos para ver el plan' },
            404: { description: 'Plan no encontrado' },
          },
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
          summary: 'Añadir un ejercicio a una sesión (AdminClub)',
          description:
            'Añade un ejercicio. Límite máximo de 6 ejercicios por sesión. No se pueden duplicar ejercicios.',
          tags: ['Trainings'],
          parameters: [
            {
              name: 'sessionId',
              in: 'path',
              required: true,
              schema: { type: 'string', format: 'uuid' },
            },
          ],
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    exerciseId: { type: 'string', format: 'uuid' },
                    sets: { type: 'integer', example: 3 },
                    reps: { type: 'integer', example: 10 },
                    durationMinutes: { type: 'integer', example: 15 },
                  },
                },
              },
            },
          },
          responses: {
            201: { description: 'Ejercicio añadido exitosamente' },
            400: { description: 'Límite alcanzado o ejercicio duplicado' },
          },
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
          summary: 'Actualizar estado de un ejercicio (Player / Admin)',
          description: 'Permite marcar o desmarcar un ejercicio como completado o añadir notas.',
          tags: ['Trainings'],
          parameters: [
            {
              name: 'sessionExerciseId',
              in: 'path',
              required: true,
              schema: { type: 'string', format: 'uuid' },
            },
          ],
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    completed: { type: 'boolean' },
                    notes: { type: 'string' },
                  },
                },
              },
            },
          },
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
      '/api/teams/club/{clubId}': {
        get: {
          summary: 'Listar equipos de un club',
          tags: ['Teams'],
          parameters: [{ name: 'clubId', in: 'path', required: true, schema: { type: 'string' } }],
          responses: { 200: { description: 'Equipos obtenidos con éxito' } },
        },
      },
      '/api/teams': {
        post: {
          summary: 'Crear un equipo (AdminClub)',
          tags: ['Teams'],
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    name: { type: 'string', example: 'Equipo Absoluto' },
                    category: { type: 'string', example: 'Superdivisión' },
                  },
                },
              },
            },
          },
          responses: { 201: { description: 'Equipo creado exitosamente' } },
        },
      },
      '/api/teams/{id}/players': {
        put: {
          summary: 'Actualizar plantilla del equipo',
          description:
            'Sincroniza los jugadores de un equipo y recalcula automáticamente el nivel base del mismo.',
          tags: ['Teams'],
          parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    playerIds: {
                      type: 'array',
                      items: { type: 'string', format: 'uuid' },
                    },
                  },
                },
              },
            },
          },
          responses: { 200: { description: 'Plantilla y nivel actualizados' } },
        },
      },
      '/api/teams/{id}/matches': {
        post: {
          summary: 'Añadir partido al calendario del equipo',
          tags: ['Teams'],
          parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    rivalName: { type: 'string', example: 'Club Tenis de Mesa Madrid' },
                    date: { type: 'string', format: 'date-time' },
                    isHome: { type: 'boolean', example: true },
                    location: { type: 'string', example: 'Pabellón Municipal' },
                  },
                },
              },
            },
          },
          responses: { 201: { description: 'Partido del equipo programado' } },
        },
      },
      '/api/teams/{id}': {
        delete: {
          summary: 'Eliminar un equipo y su calendario (AdminClub)',
          tags: ['Teams'],
          parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
          responses: { 200: { description: 'Equipo eliminado con éxito' } },
        },
      },

      // ==========================================
      // GENERAL TRAININGS (Clases Grupales)
      // ==========================================
      '/api/general-trainings/schedules': {
        get: {
          summary: 'Listar horarios base del club',
          tags: ['General Trainings'],
          responses: { 200: { description: 'Horarios obtenidos' } },
        },
        post: {
          summary: 'Crear un horario base (AdminClub)',
          tags: ['General Trainings'],
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    name: { type: 'string', example: 'Clase Avanzada L-X-V' },
                    startTime: { type: 'string', example: '17:00' },
                    endTime: { type: 'string', example: '19:00' },
                    daysOfWeek: { type: 'array', items: { type: 'integer' }, example: [1, 3, 5] },
                  },
                },
              },
            },
          },
          responses: { 201: { description: 'Horario creado' } },
        },
      },
      '/api/general-trainings/schedules/{id}': {
        put: {
          summary: 'Actualizar horario base',
          tags: ['General Trainings'],
          parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
          responses: { 200: { description: 'Horario actualizado' } },
        },
        delete: {
          summary: 'Eliminar horario base',
          tags: ['General Trainings'],
          parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
          responses: { 200: { description: 'Horario eliminado' } },
        },
      },
      '/api/general-trainings': {
        get: {
          summary: 'Listar calendario de clases programadas',
          tags: ['General Trainings'],
          responses: { 200: { description: 'Calendario obtenido' } },
        },
        post: {
          summary: 'Programar clases en bloque',
          description:
            'Crea múltiples sesiones automáticamente basándose en el rango de fechas y los días del horario base seleccionado.',
          tags: ['General Trainings'],
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    description: { type: 'string', example: 'Semana de saques' },
                    startDate: { type: 'string', format: 'date-time' },
                    endDate: { type: 'string', format: 'date-time' },
                    scheduleId: { type: 'string', format: 'uuid' },
                    skillsToTrain: {
                      type: 'object',
                      properties: {
                        topspinDerecha: { type: 'boolean', default: true },
                        movilidad: { type: 'boolean', default: true },
                      },
                    },
                  },
                },
              },
            },
          },
          responses: { 201: { description: 'Clases programadas exitosamente' } },
        },
      },
      '/api/general-trainings/{id}': {
        put: {
          summary: 'Actualizar detalle de clase grupal',
          tags: ['General Trainings'],
          parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
          responses: { 200: { description: 'Clase actualizada' } },
        },
        delete: {
          summary: 'Eliminar una clase grupal',
          tags: ['General Trainings'],
          parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
          responses: { 200: { description: 'Clase eliminada' } },
        },
      },
      '/api/general-trainings/{id}/attendance/bulk': {
        put: {
          summary: 'Sincronizar asistencia de una clase',
          description:
            'Actualiza quién ha venido y reparte la experiencia (skills) a los asistentes de forma automática basándose en su nivel actual.',
          tags: ['General Trainings'],
          parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    playerIds: { type: 'array', items: { type: 'string', format: 'uuid' } },
                  },
                },
              },
            },
          },
          responses: { 200: { description: 'Asistencia y experiencia sincronizadas' } },
        },
      },

      // ==========================================
      // MANUAL MATCHES (Análisis Pro)
      // ==========================================
      '/api/manual-matches': {
        get: {
          summary: 'Listar partidos de análisis del usuario',
          tags: ['Manual Matches'],
          responses: { 200: { description: 'Partidos obtenidos' } },
        },
        post: {
          summary: 'Crear un partido de análisis',
          tags: ['Manual Matches'],
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    date: { type: 'string', format: 'date-time' },
                    location: { type: 'string', enum: ['Casa', 'Fuera'] },
                    matchType: { type: 'string', enum: ['Amistoso', 'Liga', 'Competicion'] },
                    format: { type: 'string', enum: ['Individual', 'Equipos'] },
                    opponentName: { type: 'string' },
                    opponentHand: { type: 'string', enum: ['Diestro', 'Zurdo'] },
                    opponentStyle: { type: 'string', enum: ['Ofensivo', 'Defensivo'] },
                    opponentLevel: { type: 'string', enum: ['Peor', 'Igual', 'Mejor'] },
                    setsToWin: { type: 'integer', default: 3 },
                  },
                },
              },
            },
          },
          responses: { 201: { description: 'Partido creado' } },
        },
      },
      '/api/manual-matches/{id}': {
        get: {
          summary: 'Obtener reporte completo de un partido (puntos incluidos)',
          tags: ['Manual Matches'],
          parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
          responses: { 200: { description: 'Reporte del partido devuelto' } },
        },
        put: {
          summary: 'Actualizar configuración del rival en el partido',
          tags: ['Manual Matches'],
          parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
          responses: { 200: { description: 'Datos del rival actualizados' } },
        },
      },
      '/api/manual-matches/{id}/points': {
        post: {
          summary: 'Registrar un punto individual (Tracker)',
          tags: ['Manual Matches'],
          parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    setNumber: { type: 'integer', example: 1 },
                    pointOrder: { type: 'integer', example: 1 },
                    isWon: { type: 'boolean', example: true },
                    phase: { type: 'string', example: 'Servicio' },
                    technique: { type: 'string', example: 'Corto' },
                    placement: { type: 'string', example: 'Medio' },
                    errorModifier: { type: 'string', example: 'Red' },
                  },
                },
              },
            },
          },
          responses: { 201: { description: 'Punto guardado exitosamente' } },
        },
      },
      '/api/manual-matches/{id}/points/{pointId}': {
        delete: {
          summary: 'Deshacer (Borrar) el último punto registrado',
          tags: ['Manual Matches'],
          parameters: [
            { name: 'id', in: 'path', required: true, schema: { type: 'string' } },
            { name: 'pointId', in: 'path', required: true, schema: { type: 'string' } },
          ],
          responses: { 200: { description: 'Punto eliminado' } },
        },
      },
      '/api/manual-matches/{id}/complete': {
        put: {
          summary: 'Finalizar partido de análisis',
          description:
            'Cierra el partido y otorga experiencia (Fortaleza Mental / Experiencia) al jugador.',
          tags: ['Manual Matches'],
          parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: { mySets: { type: 'integer' }, opponentSets: { type: 'integer' } },
                },
              },
            },
          },
          responses: { 200: { description: 'Partido completado con éxito' } },
        },
      },

      // ==========================================
      // SKILLS (RPG)
      // ==========================================
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
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    derechaPlano: { type: 'integer', minimum: 0, maximum: 100 },
                    revesPlano: { type: 'integer', minimum: 0, maximum: 100 },
                  },
                },
              },
            },
          },
          responses: { 200: { description: 'Atributos actualizados' } },
        },
      },
      '/api/skills/{playerId}/consolidate': {
        put: {
          summary: 'Consolidar progreso (AdminClub)',
          description:
            'Aplica toda la experiencia acumulada (EXPECTED) a las estadísticas base del jugador de forma definitiva.',
          tags: ['Skills'],
          parameters: [
            {
              name: 'playerId',
              in: 'path',
              required: true,
              schema: { type: 'string', format: 'uuid' },
            },
          ],
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    derechaPlano: { type: 'number', example: 55.5 },
                    revesPlano: { type: 'number', example: 60.0 },
                  },
                },
              },
            },
          },
          responses: { 200: { description: 'Progreso consolidado de manera permanente' } },
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

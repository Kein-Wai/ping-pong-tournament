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
      { name: 'Auth', description: 'Operaciones de autenticación y contraseñas' },
      {
        name: 'Clubs',
        description: 'Gestión de clubes, solicitudes de unión y control de miembros',
      },
      { name: 'User Types', description: 'Consulta de roles globales del sistema' },
      { name: 'Users', description: 'Gestión de perfiles de usuario, invitados y asignaciones' },
      { name: 'Tournaments', description: 'Gestión de torneos con aislamiento por clubes' },
      { name: 'Matches', description: 'Gestión y procesamiento de partidos' },
      { name: 'Exercises', description: 'Gestión del catálogo de ejercicios' },
      {
        name: 'Trainings',
        description: 'Gestión de planes de entrenamiento y sesiones individuales',
      },
      { name: 'Teams', description: 'Gestión de equipos, plantillas y calendarios por club' },
      {
        name: 'General Trainings',
        description: 'Gestión de clases grupales y horarios recurrentes',
      },
      { name: 'Manual Matches', description: 'Registro de análisis de partidos externos (Pro)' },
      { name: 'Skills', description: 'Gestión de la experiencia y atributos técnicos (RPG)' },
      { name: 'Events', description: 'Gestión del calendario de eventos y recordatorios' },
      { name: 'Feedback', description: 'Sistema de reporte de bugs y sugerencias' },
      { name: 'Seasons', description: 'Consulta de temporadas' },
    ],
    paths: {
      // ==========================================
      // AUTH
      // ==========================================
      '/api/auth/register': {
        post: {
          summary: 'Registra un nuevo jugador (Público)',
          description:
            'Crea un nuevo usuario con el rol de Player automáticamente con estado de club "Registrado" y devuelve un JWT.',
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
            201: { description: 'Jugador registrado con éxito.' },
            400: { description: 'Datos inválidos o el email ya está en uso' },
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
          },
        },
      },
      '/api/auth/verify/{token}': {
        get: {
          summary: 'Verificar correo electrónico de cuenta nueva',
          tags: ['Auth'],
          parameters: [{ name: 'token', in: 'path', required: true, schema: { type: 'string' } }],
          responses: {
            200: { description: 'Redirección al frontend (Login)' },
            401: { description: 'Token incorrecto o caducado' },
          },
        },
      },
      '/api/auth/forgot-password': {
        post: {
          summary: 'Solicitar recuperación de contraseña',
          tags: ['Auth'],
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['email'],
                  properties: { email: { type: 'string', format: 'email' } },
                },
              },
            },
          },
          responses: {
            200: { description: 'Instrucciones enviadas (si el email existe)' },
          },
        },
      },
      '/api/auth/reset-password': {
        post: {
          summary: 'Establecer nueva contraseña usando un token de recuperación',
          tags: ['Auth'],
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['token', 'newPassword', 'confirmPassword'],
                  properties: {
                    token: { type: 'string' },
                    newPassword: { type: 'string' },
                    confirmPassword: { type: 'string' },
                  },
                },
              },
            },
          },
          responses: {
            200: { description: 'Contraseña actualizada con éxito' },
            400: { description: 'Token inválido o caducado' },
          },
        },
      },

      // ==========================================
      // CLUBS
      // ==========================================
      '/api/clubs': {
        get: {
          summary: 'Listar todos los clubes activos (Público)',
          tags: ['Clubs'],
          responses: { 200: { description: 'Lista de clubes aprobados obtenida con éxito' } },
        },
        post: {
          summary: 'Solicitar la creación de un nuevo Club (Público)',
          tags: ['Clubs'],
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['name', 'city'],
                  properties: {
                    name: { type: 'string', example: 'Club Valencia' },
                    city: { type: 'string', example: 'Valencia' },
                  },
                },
              },
            },
          },
          responses: { 201: { description: 'Club solicitado con éxito' } },
        },
      },
      '/api/clubs/{id}/join': {
        post: {
          summary: 'Solicitar unirse a un Club',
          tags: ['Clubs'],
          parameters: [
            { name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } },
          ],
          responses: { 200: { description: 'Solicitud enviada al administrador del club' } },
        },
      },
      '/api/clubs/{id}/members': {
        get: {
          summary: 'Listar todos los miembros del Club (AdminClub / SuperAdmin)',
          tags: ['Clubs'],
          parameters: [
            { name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } },
          ],
          responses: { 200: { description: 'Miembros obtenidos exitosamente' } },
        },
      },
      '/api/clubs/{id}/members/{userId}/status': {
        put: {
          summary: 'Aprobar o Rechazar la membresía de un jugador',
          description:
            'Acepta al jugador e inyecta su nivel y estadísticas iniciales de ELO y Skills RPG.',
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
                  properties: {
                    status: { type: 'string', enum: ['Aprobado', 'Rechazado'] },
                    level: { type: 'string' },
                    elo: { type: 'integer' },
                  },
                },
              },
            },
          },
          responses: { 200: { description: 'Estado actualizado' } },
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
          tags: ['Users'],
          responses: { 200: { description: 'Lista de jugadores devuelta exitosamente' } },
        },
        post: {
          summary: 'Crear un usuario manualmente (AdminClub / SuperAdmin)',
          tags: ['Users'],
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['email', 'name', 'userTypeId'],
                  properties: {
                    email: { type: 'string', format: 'email' },
                    name: { type: 'string' },
                    userTypeId: { type: 'string', format: 'uuid' },
                    elo: { type: 'integer', default: 500 },
                  },
                },
              },
            },
          },
          responses: { 201: { description: 'Usuario creado exitosamente' } },
        },
      },
      '/api/users/guest': {
        post: {
          summary: 'Crear cuenta de Invitado o Híbrida (AdminClub)',
          description:
            'Si se envía el email, crea un usuario real. Si se omite, crea un invitado "fantasma".',
          tags: ['Users'],
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['name'],
                  properties: {
                    email: { type: 'string', format: 'email', description: 'Opcional' },
                    name: { type: 'string' },
                    surname: { type: 'string' },
                    level: {
                      type: 'string',
                      enum: ['Iniciacion', 'Principiante', 'Intermedio', 'Avanzado', 'Profesional'],
                    },
                    dominantHand: { type: 'string', enum: ['Diestro', 'Zurdo'] },
                    playstyle: { type: 'string', enum: ['Ofensivo', 'Defensivo'] },
                    elo: { type: 'integer', default: 500 },
                  },
                },
              },
            },
          },
          responses: { 201: { description: 'Invitado o Usuario creado con éxito' } },
        },
      },
      '/api/users/me': {
        put: {
          summary: 'Actualizar perfil del usuario logueado',
          tags: ['Users'],
          responses: { 200: { description: 'Perfil actualizado' } },
        },
      },
      '/api/users/{id}': {
        get: {
          summary: 'Obtener el detalle de un usuario específico',
          tags: ['Users'],
          parameters: [
            { name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } },
          ],
          responses: { 200: { description: 'Datos del usuario devueltos' } },
        },
        put: {
          summary: 'Actualizar un usuario (AdminClub)',
          tags: ['Users'],
          parameters: [
            { name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } },
          ],
          responses: { 200: { description: 'Usuario actualizado' } },
        },
        delete: {
          summary: 'Eliminar un usuario del sistema (AdminClub)',
          tags: ['Users'],
          parameters: [
            { name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } },
          ],
          responses: { 204: { description: 'Usuario eliminado' } },
        },
      },

      // ==========================================
      // TOURNAMENTS
      // ==========================================
      '/api/tournaments': {
        get: {
          summary: 'Obtener todos los torneos accesibles',
          tags: ['Tournaments'],
          responses: { 200: { description: 'Lista filtrada devuelta exitosamente' } },
        },
        post: {
          summary: 'Crear un nuevo torneo asociado al Club (AdminClub)',
          tags: ['Tournaments'],
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['name', 'dateStart', 'numPlayers'],
                  properties: {
                    name: { type: 'string', example: 'Torneo Social' },
                    dateStart: { type: 'string', format: 'date-time' },
                    numPlayers: { type: 'integer', example: 16 },
                  },
                },
              },
            },
          },
          responses: { 201: { description: 'Torneo creado con éxito' } },
        },
      },
      '/api/tournaments/{id}': {
        get: {
          summary: 'Obtener un torneo específico',
          tags: ['Tournaments'],
          parameters: [
            { name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } },
          ],
          responses: { 200: { description: 'Estructura e inscripciones' } },
        },
        put: {
          summary: 'Actualizar configuración/formato',
          tags: ['Tournaments'],
          parameters: [
            { name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } },
          ],
          responses: { 200: { description: 'Torneo actualizado' } },
        },
        delete: {
          summary: 'Eliminar un torneo programado',
          tags: ['Tournaments'],
          parameters: [
            { name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } },
          ],
          responses: { 200: { description: 'Torneo eliminado' } },
        },
      },
      '/api/tournaments/{id}/register': {
        post: {
          summary: 'Inscribir un jugador en el torneo',
          tags: ['Tournaments'],
          parameters: [
            { name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } },
          ],
          responses: { 201: { description: 'Inscripción procesada' } },
        },
      },
      '/api/tournaments/{id}/register-bulk': {
        post: {
          summary: 'Inscribir múltiples jugadores de golpe (AdminClub)',
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
                    playerIds: { type: 'array', items: { type: 'string', format: 'uuid' } },
                  },
                },
              },
            },
          },
          responses: { 201: { description: 'Jugadores inscritos' } },
        },
      },
      '/api/tournaments/{id}/generate-groups': {
        post: {
          summary: 'Cerrar inscripciones y estructurar Fase de Grupos',
          tags: ['Tournaments'],
          parameters: [
            { name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } },
          ],
          responses: { 200: { description: 'Grupos generados' } },
        },
      },
      '/api/tournaments/{id}/swap-players': {
        put: {
          summary: 'Intercambiar la posición de dos jugadores en el cuadro (AdminClub)',
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
                    playerAId: { type: 'string', format: 'uuid' },
                    playerBId: { type: 'string', format: 'uuid' },
                  },
                },
              },
            },
          },
          responses: {
            200: { description: 'Jugadores intercambiados con éxito' },
            400: { description: 'La fase ya ha comenzado' },
          },
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
          tags: ['Matches'],
          responses: { 201: { description: 'Partido creado' } },
        },
      },
      '/api/matches/{id}': {
        put: {
          summary: 'Actualizar el resultado de un partido',
          tags: ['Matches'],
          parameters: [
            { name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } },
          ],
          responses: { 200: { description: 'Partido actualizado y estadísticas recalculadas' } },
        },
      },

      // ==========================================
      // EXERCISES
      // ==========================================
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
      '/api/trainings': {
        post: {
          summary: 'Crear un macrociclo de entrenamiento (AdminClub)',
          tags: ['Trainings'],
          responses: { 201: { description: 'Plan creado con éxito' } },
        },
      },
      '/api/trainings/{planId}': {
        get: {
          summary: 'Obtener un macrociclo completo con sus sesiones',
          tags: ['Trainings'],
          parameters: [
            {
              name: 'planId',
              in: 'path',
              required: true,
              schema: { type: 'string', format: 'uuid' },
            },
          ],
          responses: { 200: { description: 'Plan devuelto exitosamente' } },
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
      '/api/trainings/player/{playerId}/upcoming': {
        get: {
          summary: 'Obtener próximas sesiones inminentes del jugador',
          tags: ['Trainings'],
          parameters: [
            {
              name: 'playerId',
              in: 'path',
              required: true,
              schema: { type: 'string', format: 'uuid' },
            },
          ],
          responses: { 200: { description: 'Lista de sesiones inminentes devuelta' } },
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
          tags: ['Trainings'],
          parameters: [
            {
              name: 'sessionId',
              in: 'path',
              required: true,
              schema: { type: 'string', format: 'uuid' },
            },
          ],
          responses: { 201: { description: 'Ejercicio añadido exitosamente' } },
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
          summary: 'Actualizar estado de un ejercicio',
          tags: ['Trainings'],
          parameters: [
            {
              name: 'sessionExerciseId',
              in: 'path',
              required: true,
              schema: { type: 'string', format: 'uuid' },
            },
          ],
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
      '/api/teams': {
        post: {
          summary: 'Crear un equipo (AdminClub)',
          tags: ['Teams'],
          responses: { 201: { description: 'Equipo creado exitosamente' } },
        },
      },
      '/api/teams/club/{clubId}': {
        get: {
          summary: 'Listar equipos de un club',
          tags: ['Teams'],
          parameters: [
            {
              name: 'clubId',
              in: 'path',
              required: true,
              schema: { type: 'string', format: 'uuid' },
            },
          ],
          responses: { 200: { description: 'Equipos obtenidos con éxito' } },
        },
      },
      '/api/teams/{id}': {
        delete: {
          summary: 'Eliminar un equipo y su calendario (AdminClub)',
          tags: ['Teams'],
          parameters: [
            { name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } },
          ],
          responses: { 200: { description: 'Equipo eliminado con éxito' } },
        },
      },
      '/api/teams/{id}/players': {
        put: {
          summary: 'Actualizar plantilla del equipo',
          tags: ['Teams'],
          parameters: [
            { name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } },
          ],
          responses: { 200: { description: 'Plantilla y nivel actualizados' } },
        },
      },
      '/api/teams/{id}/matches': {
        post: {
          summary: 'Añadir partido al calendario del equipo',
          tags: ['Teams'],
          parameters: [
            { name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } },
          ],
          responses: { 201: { description: 'Partido del equipo programado' } },
        },
      },

      // ==========================================
      // GENERAL TRAININGS (Clases Grupales)
      // ==========================================
      '/api/general-trainings': {
        get: {
          summary: 'Listar calendario de clases programadas',
          tags: ['General Trainings'],
          responses: { 200: { description: 'Calendario obtenido' } },
        },
        post: {
          summary: 'Programar clases en bloque',
          tags: ['General Trainings'],
          responses: { 201: { description: 'Clases programadas exitosamente' } },
        },
      },
      '/api/general-trainings/{id}': {
        put: {
          summary: 'Actualizar detalle de clase grupal',
          tags: ['General Trainings'],
          parameters: [
            { name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } },
          ],
          responses: { 200: { description: 'Clase actualizada' } },
        },
        delete: {
          summary: 'Eliminar una clase grupal',
          tags: ['General Trainings'],
          parameters: [
            { name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } },
          ],
          responses: { 200: { description: 'Clase eliminada' } },
        },
      },
      '/api/general-trainings/schedules': {
        get: {
          summary: 'Listar horarios base del club',
          tags: ['General Trainings'],
          responses: { 200: { description: 'Horarios obtenidos' } },
        },
        post: {
          summary: 'Crear un horario base (AdminClub)',
          tags: ['General Trainings'],
          responses: { 201: { description: 'Horario creado' } },
        },
      },
      '/api/general-trainings/schedules/{id}': {
        put: {
          summary: 'Actualizar horario base',
          tags: ['General Trainings'],
          parameters: [
            { name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } },
          ],
          responses: { 200: { description: 'Horario actualizado' } },
        },
        delete: {
          summary: 'Eliminar horario base',
          tags: ['General Trainings'],
          parameters: [
            { name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } },
          ],
          responses: { 200: { description: 'Horario eliminado' } },
        },
      },
      '/api/general-trainings/{id}/attendance/bulk': {
        put: {
          summary: 'Sincronizar asistencia de una clase',
          tags: ['General Trainings'],
          parameters: [
            { name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } },
          ],
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
          responses: { 201: { description: 'Partido creado' } },
        },
      },
      '/api/manual-matches/{id}': {
        get: {
          summary: 'Obtener reporte completo de un partido (puntos incluidos)',
          tags: ['Manual Matches'],
          parameters: [
            { name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } },
          ],
          responses: { 200: { description: 'Reporte del partido devuelto' } },
        },
        put: {
          summary: 'Actualizar configuración del rival en el partido',
          tags: ['Manual Matches'],
          parameters: [
            { name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } },
          ],
          responses: { 200: { description: 'Datos del rival actualizados' } },
        },
      },
      '/api/manual-matches/{id}/points': {
        post: {
          summary: 'Registrar un punto individual (Tracker)',
          tags: ['Manual Matches'],
          parameters: [
            { name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } },
          ],
          responses: { 201: { description: 'Punto guardado exitosamente' } },
        },
      },
      '/api/manual-matches/{id}/points/{pointId}': {
        delete: {
          summary: 'Deshacer (Borrar) el último punto registrado',
          tags: ['Manual Matches'],
          parameters: [
            { name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } },
            {
              name: 'pointId',
              in: 'path',
              required: true,
              schema: { type: 'string', format: 'uuid' },
            },
          ],
          responses: { 200: { description: 'Punto eliminado' } },
        },
      },
      '/api/manual-matches/{id}/complete': {
        put: {
          summary: 'Finalizar partido de análisis',
          tags: ['Manual Matches'],
          parameters: [
            { name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } },
          ],
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
      '/api/events': {
        post: {
          summary: 'Crear un evento de calendario (AdminClub)',
          tags: ['Events'],
          responses: { 201: { description: 'Evento creado' } },
        },
      },
      '/api/events/club/{clubId}': {
        get: {
          summary: 'Obtener eventos de un club',
          tags: ['Events'],
          parameters: [
            {
              name: 'clubId',
              in: 'path',
              required: true,
              schema: { type: 'string', format: 'uuid' },
            },
          ],
          responses: { 200: { description: 'Lista de eventos con sus recordatorios adjuntos' } },
        },
      },
      '/api/events/{id}': {
        put: {
          summary: 'Editar un evento',
          tags: ['Events'],
          parameters: [
            { name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } },
          ],
          responses: { 200: { description: 'Evento actualizado' } },
        },
        delete: {
          summary: 'Borrar un evento',
          tags: ['Events'],
          parameters: [
            { name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } },
          ],
          responses: { 200: { description: 'Evento eliminado' } },
        },
      },
      '/api/events/{id}/reminders': {
        post: {
          summary: 'Activar avisos por email para un evento',
          tags: ['Events'],
          parameters: [
            { name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } },
          ],
          responses: { 201: { description: 'Recordatorios activados' } },
        },
        delete: {
          summary: 'Cancelar los avisos de este evento',
          tags: ['Events'],
          parameters: [
            { name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } },
          ],
          responses: { 200: { description: 'Recordatorios eliminados' } },
        },
      },

      // ==========================================
      // FEEDBACK (Bugs y Sugerencias)
      // ==========================================
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
      '/api/seasons': {
        get: {
          summary: 'Listar todas las temporadas registradas',
          tags: ['Seasons'],
          responses: { 200: { description: 'Temporadas devueltas' } },
        },
      },
    },
    servers: [
      {
        url: 'http://localhost:3000',
        description: 'Servidor de Desarrollo Local',
      },
      {
        url: 'https://tt-app-5mdc.onrender.com',
        description: 'Servidor de Producción',
      },
    ],
  },
  apis: ['./src/routes/*.ts'],
};

const swaggerSpec = swaggerJSDoc(options);

export const setupSwagger = (app: Express) => {
  app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));
};

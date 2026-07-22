"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.setupSwagger = void 0;
const swagger_jsdoc_1 = __importDefault(require("swagger-jsdoc"));
const swagger_ui_express_1 = __importDefault(require("swagger-ui-express"));
const options = {
    definition: {
        openapi: '3.0.0',
        info: {
            title: 'Ping Pong API',
            version: '1.0.0',
            description: 'Documentación oficial de la API de torneos de tenis de mesa (Arquitectura SaaS / Multi-tenant)',
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
        ],
        paths: {
            // ==========================================
            // AUTH
            // ==========================================
            '/api/auth/register': {
                post: {
                    summary: 'Registra un nuevo jugador (Público)',
                    description: 'Crea un nuevo usuario con el rol de Player automáticamente con estado de club "Registrado" y devuelve un JWT para iniciar sesión inmediatamente.',
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
                                                    clubId: { type: 'string', format: 'uuid', nullable: true, example: null },
                                                    clubStatus: { type: 'string', example: 'Registrado' },
                                                },
                                            },
                                        },
                                    },
                                },
                            },
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
                        200: {
                            description: 'Login exitoso, devuelve el JWT con los claims de club incluidos',
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
                    description: 'Devuelve una lista con todos los clubes que han sido aprobados por el SuperAdmin para que los jugadores libres puedan buscar y solicitar unirse.',
                    tags: ['Clubs'],
                    responses: {
                        200: {
                            description: 'Lista de clubes aprobados obtenida con éxito',
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
                                                        id: {
                                                            type: 'string',
                                                            format: 'uuid',
                                                            example: 'a1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6d',
                                                        },
                                                        name: { type: 'string', example: 'Club PingPong Castellón' },
                                                        createdAt: { type: 'string', format: 'date-time' },
                                                    },
                                                },
                                            },
                                        },
                                    },
                                },
                            },
                        },
                        500: { description: 'Error al obtener los clubes' },
                    },
                },
                post: {
                    summary: 'Solicitar la creación de un nuevo Club (Público)',
                    description: 'Permite a cualquier persona registrar la intención de fundar un club. El club se guardará con estado "Pendiente" y requerirá aprobación manual del SuperAdmin.',
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
                    description: 'Asocia al jugador autenticado al club especificado con un estado inicial de "Pendiente" a la espera de la revisión del AdminClub.',
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
                    description: 'Devuelve la lista completa de jugadores asociados al club. Los AdminClub solo pueden consultar los miembros de su propio club asignado.',
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
                    description: 'Cambia el estado de club de un jugador. Si se selecciona "Rechazado", el sistema desvincula al jugador del club dándole libertad de buscar otro.',
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
                    description: 'Devuelve la lista de jugadores. Si es consultado por un AdminClub o un Player, el sistema filtra de forma automática y transparente devolviendo únicamente los usuarios vinculados a su mismo club.',
                    tags: ['Users'],
                    responses: {
                        200: {
                            description: 'Lista de jugadores devuelta exitosamente',
                            content: {
                                'application/json': {
                                    schema: {
                                        type: 'array',
                                        items: {
                                            type: 'object',
                                            properties: {
                                                id: { type: 'string', format: 'uuid' },
                                                email: { type: 'string', format: 'email' },
                                                name: { type: 'string' },
                                                surname: { type: 'string', nullable: true },
                                                clubId: { type: 'string', format: 'uuid', nullable: true },
                                                clubStatus: { type: 'string', example: 'Aprobado' },
                                                userTypeId: { type: 'string', format: 'uuid' },
                                                stats: {
                                                    type: 'object',
                                                    description: 'Métricas de rendimiento e histórico',
                                                },
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
                    summary: 'Crear un usuario manualmente (AdminClub / SuperAdmin)',
                    description: 'Permite dar de alta a un usuario en el sistema. Si la acción la realiza un AdminClub, el usuario se crea directamente aprobado e integrado en su club de forma obligatoria.',
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
                    description: 'Permite al usuario cambiar sus datos personales y actualizar su contraseña autenticando la clave previa.',
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
                    description: 'Modifica los datos de un usuario. Si es ejecutado por un AdminClub, el sistema verifica primero que pertenezca a su propio club y bloquea cualquier intento de cambiar su clubId o clubStatus.',
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
                    description: 'Elimina al usuario. Los AdminClub tienen la acción restringida exclusivamente a miembros verificados de su propio club.',
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
                    description: 'Aplica filtros contextuales multi-tenant. El SuperAdmin ve todo; el AdminClub ve los de su club; los Players ven los torneos privados de su propio club y todos los de tipo "Abierto" de otras entidades.',
                    tags: ['Tournaments'],
                    responses: {
                        200: {
                            description: 'Lista filtrada de torneos devuelta exitosamente',
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
                                                        name: { type: 'string', example: 'Open de Verano 2026' },
                                                        clubId: { type: 'string', format: 'uuid', nullable: true },
                                                        typeTournament: { type: 'string', example: 'Abierto' },
                                                        status: { type: 'string', example: 'Programado' },
                                                        club: {
                                                            type: 'object',
                                                            properties: { name: { type: 'string', example: 'Club Castellón' } },
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
                post: {
                    summary: 'Crear un nuevo torneo asociado al Club (AdminClub / SuperAdmin)',
                    description: 'Registra un torneo. Si lo ejecuta un AdminClub, el sistema inyecta automáticamente su clubId de sesión en el registro, aislando el torneo del resto de organizaciones.',
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
                    description: 'Permite ajustar las matemáticas de un torneo (grupos, sets para ganar, clasificados) antes de iniciarlo.',
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
                    description: 'Genera un partido. Si el estado es "Completado", calcula de manera automática los cambios de puntuación ELO global de los jugadores y actualiza clasificaciones en cascada.',
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
                    description: 'Permite a los administradores actualizar el marcador. Valida reglas oficiales ITTF y recalcula automáticamente el ELO y las clasificaciones en cascada.',
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
const swaggerSpec = (0, swagger_jsdoc_1.default)(options);
const setupSwagger = (app) => {
    app.use('/api-docs', swagger_ui_express_1.default.serve, swagger_ui_express_1.default.setup(swaggerSpec));
};
exports.setupSwagger = setupSwagger;

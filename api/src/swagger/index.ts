import swaggerJSDoc from 'swagger-jsdoc';
import swaggerUi from 'swagger-ui-express';
import { Express } from 'express';
import { authPaths } from './paths/auth';
import { clubsPaths } from './paths/clubs';
import { user_typesPaths } from './paths/user-types';
import { usersPaths } from './paths/users';
import { tournamentsPaths } from './paths/tournaments';
import { matchesPaths } from './paths/matches';
import { exercisesPaths } from './paths/exercises';
import { trainingsPaths } from './paths/trainings';
import { teamsPaths } from './paths/teams';
import { general_trainingsPaths } from './paths/general-trainings';
import { manual_matchesPaths } from './paths/manual-matches';
import { skillsPaths } from './paths/skills';
import { eventsPaths } from './paths/events';
import { feedbackPaths } from './paths/feedback';
import { seasonsPaths } from './paths/seasons';

/**
 * Definicion de la API. Los cuerpos de las peticiones se DERIVAN de los
 * esquemas de Zod, de modo que la documentacion no puede desviarse de lo que
 * la API valida de verdad.
 */
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
  ...authPaths,
  ...clubsPaths,
  ...user_typesPaths,
  ...usersPaths,
  ...tournamentsPaths,
  ...matchesPaths,
  ...exercisesPaths,
  ...trainingsPaths,
  ...teamsPaths,
  ...general_trainingsPaths,
  ...manual_matchesPaths,
  ...skillsPaths,
  ...eventsPaths,
  ...feedbackPaths,
  ...seasonsPaths,
    },
  },
  apis: [],
};

export const setupSwagger = (app: Express): void => {
  // La documentación lista todas las rutas y su forma: no hace falta exponerla en producción.
  if (process.env.NODE_ENV === 'production') return;

  const swaggerDocument = swaggerJSDoc(options);
  app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument));
};

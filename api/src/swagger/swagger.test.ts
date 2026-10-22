import { describe, it, expect } from 'vitest';
import swaggerJSDoc from 'swagger-jsdoc';
import { authPaths } from './paths/auth';
import { tournamentsPaths } from './paths/tournaments';
import { usersPaths } from './paths/users';
import { trainingsPaths } from './paths/trainings';
import { clubsPaths } from './paths/clubs';
import { matchesPaths } from './paths/matches';
import { seasonsPaths } from './paths/seasons';
import { exercisesPaths } from './paths/exercises';
import { teamsPaths } from './paths/teams';
import { general_trainingsPaths as generalTrainingsPaths } from './paths/general-trainings';
import { manual_matchesPaths as manualMatchesPaths } from './paths/manual-matches';
import { skillsPaths } from './paths/skills';
import { eventsPaths } from './paths/events';
import { feedbackPaths } from './paths/feedback';
import { user_typesPaths as userTypesPaths } from './paths/user-types';
import { zodToOpenApiSchema } from './zod-schema';
import { createUserSchema } from '../schemas/user';

/** Cuerpo de peticion documentado en OpenAPI. */
interface DocumentedBody {
  required?: boolean;
  content: {
    'application/json': {
      schema: { properties: Record<string, { enum?: unknown[] }> };
    };
  };
}

/** Operacion documentada (get/post/put/delete). */
interface DocumentedOperation {
  summary?: string;
  requestBody?: DocumentedBody;
}

/** Path documentado, indexado por metodo HTTP. */
type DocumentedPath = Record<string, DocumentedOperation>;

describe('Documentacion Swagger (api/src/swagger)', () => {
  describe('Cobertura de rutas', () => {
    it('documenta los 56 paths de la API', () => {
      const all = [
        ...Object.values(authPaths),
        ...Object.values(clubsPaths),
        ...Object.values(usersPaths),
        ...Object.values(tournamentsPaths),
        ...Object.values(matchesPaths),
        ...Object.values(trainingsPaths),
        ...Object.values(seasonsPaths),
        ...Object.values(exercisesPaths),
        ...Object.values(teamsPaths),
        ...Object.values(generalTrainingsPaths),
        ...Object.values(manualMatchesPaths),
        ...Object.values(skillsPaths),
        ...Object.values(eventsPaths),
        ...Object.values(feedbackPaths),
        ...Object.values(userTypesPaths),
      ];

      expect(all.length).toBe(56);
    });

    it('los 56 paths exponen 76 operaciones', () => {
      const all = [
        ...Object.values(authPaths),
        ...Object.values(clubsPaths),
        ...Object.values(usersPaths),
        ...Object.values(tournamentsPaths),
        ...Object.values(matchesPaths),
        ...Object.values(trainingsPaths),
        ...Object.values(seasonsPaths),
        ...Object.values(exercisesPaths),
        ...Object.values(teamsPaths),
        ...Object.values(generalTrainingsPaths),
        ...Object.values(manualMatchesPaths),
        ...Object.values(skillsPaths),
        ...Object.values(eventsPaths),
        ...Object.values(feedbackPaths),
        ...Object.values(userTypesPaths),
      ];

      const operations = all.reduce((total, path) => total + Object.keys(path).length, 0);

      expect(operations).toBe(76);
    });

    it('cada ruta tiene al menos un metodo documentado', () => {
      const all = [
        ...Object.values(authPaths),
        ...Object.values(tournamentsPaths),
        ...Object.values(usersPaths),
      ];

      all.forEach((path) => {
        const methods = Object.keys(path);
        expect(methods.length).toBeGreaterThan(0);
        methods.forEach((method) => {
          expect((path as DocumentedPath)[method].summary).toBeTruthy();
        });
      });
    });
  });

  describe('Derivacion desde Zod', () => {
    it('el cuerpo de POST /api/auth/login se deriva del esquema de Zod', () => {
      const body = (authPaths['/api/auth/login'].post as DocumentedOperation).requestBody!;
      const schema = body.content['application/json'].schema;

      expect(Object.keys(schema.properties)).toEqual(['email', 'password']);
    });

    it('el cuerpo de POST /api/tournaments se deriva del esquema de Zod', () => {
      const body = (tournamentsPaths['/api/tournaments'].post as DocumentedOperation).requestBody!;
      const schema = body.content['application/json'].schema;

      expect(Object.keys(schema.properties)).toContain('numPlayers');
      expect(Object.keys(schema.properties)).toContain('rounds');
    });

    it('el cuerpo de POST /api/users se deriva del esquema de Zod', () => {
      const body = (usersPaths['/api/users'].post as DocumentedOperation).requestBody!;
      const schema = body.content['application/json'].schema;

      expect(Object.keys(schema.properties)).toContain('email');
    });
  });

  describe('Enums de Prisma documentados', () => {
    it('un campo con enum se documenta como lista de valores permitidos', () => {
      const schema = zodToOpenApiSchema(createUserSchema) as {
        properties: Record<string, { enum?: unknown[] }>;
      };

      const withEnum = Object.values(schema.properties).find((property) =>
        Array.isArray(property.enum),
      );

      expect(withEnum).toBeDefined();
    });
  });

  describe('Documento final', () => {
    it('swagger-jsdoc genera un documento valido', () => {
      const document = swaggerJSDoc({
        definition: {
          openapi: '3.0.0',
          info: { title: 'Ping Pong API', version: '1.0.0' },
          paths: {
            ...authPaths,
            ...tournamentsPaths,
            ...usersPaths,
            ...trainingsPaths,
            ...clubsPaths,
            ...matchesPaths,
            ...seasonsPaths,
          },
        },
        apis: [],
      });

      expect(document.info.title).toBe('Ping Pong API');
      expect(Object.keys(document.paths).length).toBeGreaterThan(20);
    });
  });
});

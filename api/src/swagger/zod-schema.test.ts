import { describe, it, expect } from 'vitest';
import { zodToOpenApiSchema, requestBodyFromSchema } from './zod-schema';
import { createTournamentSchema } from '../schemas/tournament';
import { loginLocalSchema } from '../schemas/user';

describe('Derivacion de OpenAPI desde Zod (api/src/swagger/zod-schema.ts)', () => {
  describe('zodToOpenApiSchema', () => {
    it('deriva las propiedades del esquema', () => {
      const schema = zodToOpenApiSchema(loginLocalSchema) as {
        properties: Record<string, unknown>;
      };

      expect(Object.keys(schema.properties)).toEqual(['email', 'password']);
    });

    it('conserva el formato de los campos declarados', () => {
      const schema = zodToOpenApiSchema(loginLocalSchema) as {
        properties: { email: { format?: string } };
      };

      expect(schema.properties.email.format).toBe('email');
    });

    it('deriva los campos requeridos', () => {
      const schema = zodToOpenApiSchema(loginLocalSchema) as { required?: string[] };

      expect(schema.required).toEqual(['email', 'password']);
    });

    it('funciona con esquemas que llevan superRefine', () => {
      const schema = zodToOpenApiSchema(createTournamentSchema) as {
        properties: Record<string, unknown>;
      };

      expect(Object.keys(schema.properties)).toContain('numPlayers');
    });

    it('representa los opcionales como no requeridos', () => {
      const schema = zodToOpenApiSchema(loginLocalSchema) as { required?: string[] };

      expect(schema.required).not.toContain('rol');
    });
  });

  describe('requestBodyFromSchema', () => {
    it('devuelve undefined si no hay esquema', () => {
      expect(requestBodyFromSchema(undefined)).toBeUndefined();
    });

    it('envuelve el esquema en un cuerpo application/json', () => {
      const body = requestBodyFromSchema(loginLocalSchema) as {
        required: boolean;
        content: Record<string, { schema: { properties: Record<string, unknown> } }>;
      };

      expect(body.required).toBe(true);
      expect(body.content['application/json'].schema.properties).toHaveProperty('email');
    });

    it('permite marcar el cuerpo como opcional', () => {
      const body = requestBodyFromSchema(loginLocalSchema, false) as { required: boolean };

      expect(body.required).toBe(false);
    });
  });
});

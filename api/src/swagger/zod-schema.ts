import { z } from 'zod';

/**
 * Convierte un esquema de Zod en un esquema OpenAPI 3.0.
 *
 * Modulo PURO: la derivacion depende solo del esquema, no de la ruta. asi el
 * cuerpo documentado SIEMPRE coincide con el que valida la API: si cambia el
 * schema de Zod, cambia la documentacion.
 */
export const zodToOpenApiSchema = (
  schema: z.ZodType,
  options: { io?: 'input' | 'output' } = {},
): Record<string, unknown> => {
  const jsonSchema = z.toJSONSchema(schema, {
    target: 'openapi-3.0',
    io: options.io ?? 'input',
    unrepresentable: 'any',
  }) as Record<string, unknown>;

  // OpenAPI 3.0 no admite el type: 'null': se expresa como enum con null.
  if (jsonSchema.type === 'null') {
    return { nullable: true, enum: [null] };
  }

  if (Array.isArray(jsonSchema.type) && jsonSchema.type.includes('null')) {
    const types = jsonSchema.type.filter((type) => type !== 'null');
    return {
      ...jsonSchema,
      type: types.length === 1 ? types[0] : types,
      nullable: true,
    };
  }

  return jsonSchema;
};

/**
 * Construye el cuerpo de una peticion a partir del esquema de Zod.
 *
 * Devuelve undefined si el esquema no se puede derivar: el llamador тогда
 * documenta el cuerpo a mano.
 */
export const requestBodyFromSchema = (
  schema: z.ZodType | undefined,
  required = true,
): Record<string, unknown> | undefined => {
  if (!schema) return undefined;

  try {
    return {
      required,
      content: {
        'application/json': {
          schema: zodToOpenApiSchema(schema),
        },
      },
    };
  } catch {
    return undefined;
  }
};

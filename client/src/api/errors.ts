/**
 * Extraccion del mensaje de error de una respuesta de la API.
 *
 * La API responde con el sobre { success, error, details }. `details` puede
 * traer los errores de validacion de Zod en dos formatos distintos:
 *
 * - `error.flatten()`  -> { formErrors: string[], fieldErrors: { campo: string[] } }
 * - `z.treeifyError()` -> { errors: string[], properties: { campo: { errors: string[] } } }
 *
 * La API usa el primero, pero el interceptor leia el segundo, de modo que
 * `Object.keys(undefined)` reventaba y el toast de error nunca llegaba a
 * mostrarse. Esta funcion concentrates el caso y tolera ambos formatos.
 */

/** Detalles de validacion de Zod en formato plano. */
interface FlattenedDetails {
  formErrors?: string[];
  fieldErrors?: Record<string, string[] | undefined>;
}

/** Detalles de validacion de Zod en formato de arbol. */
interface TreeifiedDetails {
  errors?: string[];
  properties?: Record<string, { errors?: string[] } | undefined>;
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null;

const asStringArray = (value: unknown): string[] =>
  Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string') : [];

/** Texto de los errores de validacion por campo, en ambos formatos de Zod. */
const validationDetails = (details: unknown): string[] => {
  if (!isRecord(details)) return [];

  const flattened = details as FlattenedDetails;
  const treeified = details as TreeifiedDetails;

  const messages: string[] = [];

  for (const message of asStringArray(flattened.formErrors)) {
    messages.push(message);
  }

  for (const [field, errors] of Object.entries(flattened.fieldErrors ?? {})) {
    for (const message of asStringArray(errors)) {
      messages.push(`${field}: ${message}`);
    }
  }

  for (const message of asStringArray(treeified.errors)) {
    messages.push(message);
  }

  for (const [field, node] of Object.entries(treeified.properties ?? {})) {
    for (const message of asStringArray(node?.errors)) {
      messages.push(`${field}: ${message}`);
    }
  }

  return messages;
};

/**
 * Devuelve el mensaje que debe ver el usuario a partir del cuerpo de una
 * respuesta de error de la API.
 *
 * @param body Cuerpo de la respuesta ({ success, error, details }).
 * @param fallback Texto a mostrar cuando la API no aporta ninguno.
 */
export const extractErrorMessage = (body: unknown, fallback: string): string => {
  if (!isRecord(body)) return fallback;

  const details = validationDetails(body.details);
  if (details.length > 0) return details.join(' | ');

  if (typeof body.error === 'string' && body.error.trim() !== '') {
    return body.error;
  }

  if (typeof body.message === 'string' && body.message.trim() !== '') {
    return body.message;
  }

  if (isRecord(body.error)) {
    return JSON.stringify(body.error);
  }

  return fallback;
};

/** Texto a mostrar cuando la peticion falla sin respuesta del servidor. */
export const NETWORK_ERROR_MESSAGE = 'No se pudo conectar con el servidor.';

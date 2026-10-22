/**
 * Configuración de la aplicación: variables de entorno obligatorias.
 *
 * La política es fail-fast: preferimos que la aplicación NO arranque a que
 * arranque con un secreto ausente o con un valor por defecto.
 */

/**
 * Devuelve el valor de una variable de entorno obligatoria.
 * Lanza un error crítico si no está definida o está vacía.
 */
export const getRequiredEnv = (name: string): string => {
  const value = process.env[name]?.trim();

  if (!value) {
    throw new Error(
      `Falta la variable de entorno ${name}. La aplicación no puede funcionar sin ella.`,
    );
  }

  return value;
};

/**
 * Verifica que todas las variables indicadas estén definidas y no vacías.
 * Lanza un error crítico si falta alguna. Se usa al arrancar la aplicación.
 */
export const assertRequiredEnv = (env: NodeJS.ProcessEnv, names: string[]): void => {
  const missing = names.filter((name) => !env[name]?.trim());

  if (missing.length > 0) {
    throw new Error(
      `Faltan variables de entorno obligatorias: ${missing.join(', ')}. ` +
        'La aplicación no puede arrancar sin ellas.',
    );
  }
};

/**
 * Secretos que la aplicación necesita para funcionar con seguridad.
 */
export const REQUIRED_ENV_VARS = ['JWT_SECRET', 'CRON_SECRET'] as const;
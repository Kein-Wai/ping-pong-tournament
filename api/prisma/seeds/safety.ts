/**
 * Protecciones comunes de los seeds. Viven aparte para poder probarlas sin base de datos.
 */

type Env = Record<string, string | undefined>;

/** Host, puerto y nombre de la base a la que apunta la URL, sin usuario ni contraseña. */
export const describeDatabase = (url: string | undefined): string => {
  if (!url) return 'DATABASE_URL no definida';
  try {
    const parsed = new URL(url);
    if (!['postgresql:', 'postgres:'].includes(parsed.protocol) || !parsed.hostname) {
      throw new Error('no es una URL de PostgreSQL');
    }
    return `${parsed.hostname}:${parsed.port || '5432'}/${parsed.pathname.slice(1)}`;
  } catch {
    // No se reproduce la URL: puede llevar la contraseña.
    return 'DATABASE_URL no válida';
  }
};

/** El seed base vacía la base entera: solo corre si se pide de forma explícita. */
export const assertWipeConfirmed = (env: Env): void => {
  if (env.SEED_CONFIRM_WIPE !== 'yes') {
    throw new Error(
      'El seed base BORRA TODA la base de datos. Para ejecutarlo de verdad lanza el comando con SEED_CONFIRM_WIPE=yes.',
    );
  }
};

export const requireEnv = (env: Env, name: string): string => {
  const value = env[name]?.trim();
  if (!value) throw new Error(`Falta la variable de entorno ${name}.`);
  return value;
};

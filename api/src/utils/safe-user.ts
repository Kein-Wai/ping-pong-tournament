/**
 * Campos del modelo User que nunca deben salir de la API: credenciales y
 * tokens de un solo uso. Con `include`, Prisma devuelve TODOS los escalares
 * del modelo, asi que hay que quitarlos de forma explicita antes de responder.
 */
const SENSITIVE_USER_FIELDS = [
  'password',
  'googleId',
  'verificationToken',
  'resetPasswordToken',
  'resetPasswordExpires',
] as const;

type SensitiveUserField = (typeof SENSITIVE_USER_FIELDS)[number];

/**
 * Devuelve una copia del usuario sin credenciales ni tokens. Conserva el resto
 * de campos y las relaciones cargadas (stats, skills, teams...). No muta el
 * objeto original.
 */
export const toSafeUser = <T extends object>(user: T): Omit<T, SensitiveUserField> =>
  Object.fromEntries(
    Object.entries(user).filter(
      ([key]) => !(SENSITIVE_USER_FIELDS as readonly string[]).includes(key),
    ),
  ) as Omit<T, SensitiveUserField>;

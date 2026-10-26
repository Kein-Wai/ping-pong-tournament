import { getCurrentSeasonPeriod } from '../utils/season';

/** Temporada vigente tal como la resuelve resolveCurrentSeason (nombre según la fecha actual). */
export const currentSeasonFixture = () => ({
  id: 'season-1',
  name: getCurrentSeasonPeriod().name,
  isCurrent: true,
});

/** Campos del modelo User que nunca deben salir de la API. */
export const SECRET_FIELDS = {
  password: '$2a$10$hash-de-contraseña',
  googleId: 'google-sub-123',
  verificationToken: 'token-de-verificacion',
  resetPasswordToken: 'token-de-reset',
} as const;

/** Un usuario tal como lo devuelve Prisma con `include`: todos los escalares, secretos incluidos. */
export const userRowWithSecrets = (overrides: Record<string, unknown> = {}) => ({
  id: 'u1',
  name: 'Ana',
  surname: 'Gil',
  email: 'ana@test.com',
  clubId: 'club-1',
  ...SECRET_FIELDS,
  resetPasswordExpires: new Date('2030-01-01T00:00:00Z'),
  ...overrides,
});

/** Falla si la respuesta contiene alguno de los secretos de SECRET_FIELDS. */
export const findLeakedSecrets = (body: unknown): string[] => {
  const text = JSON.stringify(body);
  return [...Object.values(SECRET_FIELDS), 'resetPasswordExpires'].filter((secret) =>
    text.includes(secret),
  );
};

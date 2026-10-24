type DateInput = Date | string | number;

const LOCALE = 'es-ES';

/** Fecha en es-ES. Sin `options` devuelve el formato corto (`5/3/2026`). */
export const formatDate = (date: DateInput, options?: Intl.DateTimeFormatOptions) =>
  new Date(date).toLocaleDateString(LOCALE, options);

/** Fecha y hora en es-ES. Sin `options` usa fecha y hora cortas (`5/3/26, 14:30`). */
export const formatDateTime = (
  date: DateInput,
  options: Intl.DateTimeFormatOptions = { dateStyle: 'short', timeStyle: 'short' },
) => new Date(date).toLocaleString(LOCALE, options);

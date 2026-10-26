/**
 * Fechas por día de calendario en la zona horaria de la app. El servidor corre en UTC, así
 * que «mañana» calculado con la hora local del servidor se desfasa 1-2 horas respecto a lo
 * que ve el club: un torneo a las 00:30 de Madrid no entraba en el recordatorio del día anterior.
 */

/** Zona horaria de los clubes; configurable por si la app sirve a otra región. */
export const getAppTimeZone = (): string => process.env.APP_TIMEZONE?.trim() || 'Europe/Madrid';

/** Diferencia (zona - UTC) en milisegundos en el instante dado. */
const offsetMs = (timeZone: string, instant: number): number => {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone,
    hourCycle: 'h23',
    year: 'numeric',
    month: 'numeric',
    day: 'numeric',
    hour: 'numeric',
    minute: 'numeric',
    second: 'numeric',
  }).formatToParts(new Date(instant));
  const get = (type: string) => Number(parts.find((part) => part.type === type)?.value);
  const asUtc = Date.UTC(get('year'), get('month') - 1, get('day'), get('hour'), get('minute'), get('second'));
  return asUtc - Math.floor(instant / 1000) * 1000;
};

/** Instante UTC en que empieza el día (año, mes, día) del calendario de la zona. */
const startOfZonedDay = (timeZone: string, year: number, month: number, day: number): number => {
  const guess = Date.UTC(year, month, day);
  // Dos pasadas: el desfase al mediodía UTC puede no ser el de la medianoche local si hay cambio de hora.
  const first = guess - offsetMs(timeZone, guess);
  return guess - offsetMs(timeZone, first);
};

/**
 * Inicio y fin (inclusive) del día del calendario de `timeZone` que está `dayOffset` días
 * después del día en que cae `now`.
 */
export const zonedDayBounds = (
  now: Date,
  dayOffset: number,
  timeZone: string = getAppTimeZone(),
): { start: Date; end: Date } => {
  const local = new Date(now.getTime() + offsetMs(timeZone, now.getTime()));
  const year = local.getUTCFullYear();
  const month = local.getUTCMonth();
  const day = local.getUTCDate() + dayOffset;

  const start = startOfZonedDay(timeZone, year, month, day);
  const nextStart = startOfZonedDay(timeZone, year, month, day + 1);
  return { start: new Date(start), end: new Date(nextStart - 1) };
};

import { describe, it, expect } from 'vitest';
import { zonedDayBounds } from './timezone';

describe('zonedDayBounds', () => {
  it('devuelve el día siguiente de Madrid en horario de invierno (UTC+1)', () => {
    // 2026-11-10 23:30 UTC ya es 2026-11-11 00:30 en Madrid: «mañana» allí es el 12.
    const now = new Date('2026-11-10T23:30:00Z');

    const { start, end } = zonedDayBounds(now, 1, 'Europe/Madrid');

    expect(start.toISOString()).toBe('2026-11-11T23:00:00.000Z');
    expect(end.toISOString()).toBe('2026-11-12T22:59:59.999Z');
  });

  it('en horario de verano (UTC+2) el día de Madrid empieza a las 22:00 UTC del día anterior', () => {
    const now = new Date('2026-07-10T10:00:00Z');

    const { start, end } = zonedDayBounds(now, 0, 'Europe/Madrid');

    expect(start.toISOString()).toBe('2026-07-09T22:00:00.000Z');
    expect(end.toISOString()).toBe('2026-07-10T21:59:59.999Z');
  });

  it('un día con cambio de hora dura 25 horas (25 oct 2026, fin del horario de verano)', () => {
    const now = new Date('2026-10-25T10:00:00Z');

    const { start, end } = zonedDayBounds(now, 0, 'Europe/Madrid');

    expect(start.toISOString()).toBe('2026-10-24T22:00:00.000Z');
    expect(end.toISOString()).toBe('2026-10-25T22:59:59.999Z');
  });

  it('la misma hora UTC cae en días distintos según la zona', () => {
    const now = new Date('2026-11-10T23:30:00Z');

    const utc = zonedDayBounds(now, 0, 'UTC');
    const madrid = zonedDayBounds(now, 0, 'Europe/Madrid');

    expect(utc.start.toISOString()).toBe('2026-11-10T00:00:00.000Z');
    expect(madrid.start.toISOString()).toBe('2026-11-10T23:00:00.000Z');
  });
});

import { describe, it, expect } from 'vitest';
import { formatDate, formatDateTime } from './dates';

// vitest.config.ts fija TZ=UTC: los literales esperados dependen de ello.
const ISO = '2026-03-05T14:30:00Z';

describe('formatDate', () => {
  it('formatea una fecha ISO en es-ES sin ceros a la izquierda', () => {
    expect(formatDate(ISO)).toBe('5/3/2026');
  });

  it('acepta un objeto Date', () => {
    expect(formatDate(new Date(ISO))).toBe('5/3/2026');
  });

  it('acepta un timestamp numérico', () => {
    expect(formatDate(Date.parse(ISO))).toBe('5/3/2026');
  });

  it('aplica las opciones recibidas (mes abreviado)', () => {
    expect(formatDate(ISO, { year: 'numeric', month: 'short', day: 'numeric' })).toBe('5 mar 2026');
  });

  it('aplica las opciones recibidas (mes largo y año)', () => {
    expect(formatDate(ISO, { month: 'long', year: 'numeric' })).toBe('marzo de 2026');
  });

  it('devuelve "Invalid Date" ante una fecha inválida', () => {
    expect(formatDate('no-es-una-fecha')).toBe('Invalid Date');
  });
});

describe('formatDateTime', () => {
  it('por defecto usa fecha y hora cortas en es-ES', () => {
    expect(formatDateTime(ISO)).toBe('5/3/26, 14:30');
  });

  it('acepta un objeto Date', () => {
    expect(formatDateTime(new Date(ISO))).toBe('5/3/26, 14:30');
  });

  it('las opciones recibidas sustituyen a las de por defecto', () => {
    expect(formatDateTime(ISO, { dateStyle: 'full', timeStyle: 'short' })).toBe(
      'jueves, 5 de marzo de 2026, 14:30',
    );
  });

  it('devuelve "Invalid Date" ante una fecha inválida', () => {
    expect(formatDateTime('no-es-una-fecha')).toBe('Invalid Date');
  });
});

import { describe, it, expect } from 'vitest';
import { formatClock, formatDuration } from './warmupFormat';

describe('formatClock', () => {
  it.each([
    [0, '00:00'],
    [5, '00:05'],
    [42, '00:42'],
    [60, '01:00'],
    [75, '01:15'],
    [600, '10:00'],
  ])('Debería formatear %i s como %s', (segundos, esperado) => {
    expect(formatClock(segundos)).toBe(esperado);
  });
});

describe('formatDuration', () => {
  it.each([
    [0, '0 s'],
    [45, '45 s'],
    [60, '1 min'],
    [75, '1 min 15 s'],
    [275, '4 min 35 s'],
    [600, '10 min'],
  ])('Debería escribir %i s como «%s»', (segundos, esperado) => {
    expect(formatDuration(segundos)).toBe(esperado);
  });
});

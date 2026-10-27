import { describe, expect, it } from 'vitest';
import { remainingSecOf } from './clock';

describe('remainingSecOf', () => {
  it('muestra la duración entera al empezar y baja un segundo cada vez', () => {
    expect(remainingSecOf(1000, 30_000, 1000)).toBe(30);
    expect(remainingSecOf(1000, 30_000, 11_000)).toBe(20);
  });

  it('redondea hacia arriba: con 100 ms de más aún queda ese segundo', () => {
    expect(remainingSecOf(0, 30_000, 100)).toBe(30);
    expect(remainingSecOf(0, 30_000, 29_900)).toBe(1);
  });

  it('nunca baja de 0 aunque el reloj se pase del final', () => {
    expect(remainingSecOf(0, 30_000, 30_000)).toBe(0);
    expect(remainingSecOf(0, 30_000, 45_000)).toBe(0);
  });
});

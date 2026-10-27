import { describe, expect, it } from 'vitest';
import { fitWidth } from './fitWidth';

describe('fitWidth', () => {
  it('limita el ancho por el contenedor, por la altura de la ventana y por un máximo', () => {
    expect(fitWidth(1, 560)).toBe(
      'min(100%, max(120px, calc((100dvh - 190px - env(safe-area-inset-top) - env(safe-area-inset-bottom)) * 1)), 560px)'
    );
  });

  it('con una proporción ancho/alto menor que 1 el campo es más estrecho que alto', () => {
    expect(fitWidth(0.75, 420)).toBe(
      'min(100%, max(120px, calc((100dvh - 190px - env(safe-area-inset-top) - env(safe-area-inset-bottom)) * 0.75)), 420px)'
    );
  });
});

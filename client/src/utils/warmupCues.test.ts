import { describe, it, expect } from 'vitest';
import type { WarmupView } from './warmupEngine';
import { getCues } from './warmupCues';

const view = (overrides: Partial<WarmupView> = {}): WarmupView => ({
  phase: 'exercise',
  index: 0,
  remainingSec: 30,
  totalRemainingSec: 100,
  paused: false,
  waiting: false,
  ...overrides,
});

describe('getCues', () => {
  it('Debería no avisar de nada en la primera vista de la sesión', () => {
    expect(getCues(null, view({ phase: 'countdown', remainingSec: 5 }))).toEqual([]);
  });

  it.each([
    [4, 3],
    [3, 2],
    [2, 1],
  ])('Debería hacer tic al pasar de %i a %i s', (before, after) => {
    expect(getCues(view({ remainingSec: before }), view({ remainingSec: after }))).toEqual(['tick']);
  });

  it('Debería hacer tic también en la cuenta atrás y en el descanso', () => {
    expect(getCues(view({ phase: 'countdown', remainingSec: 4 }), view({ phase: 'countdown', remainingSec: 3 }))).toEqual(['tick']);
    expect(getCues(view({ phase: 'rest', remainingSec: 2 }), view({ phase: 'rest', remainingSec: 1 }))).toEqual(['tick']);
  });

  it('Debería no repetir el tic mientras el segundo no cambia', () => {
    expect(getCues(view({ remainingSec: 3 }), view({ remainingSec: 3 }))).toEqual([]);
  });

  it('Debería avisar del inicio del ejercicio, del descanso y del final', () => {
    expect(getCues(view({ phase: 'rest' }), view({ phase: 'exercise' }))).toEqual(['exercise-start']);
    expect(getCues(view({ phase: 'countdown' }), view({ phase: 'rest' }))).toEqual(['rest-start']);
    expect(getCues(view({ phase: 'exercise' }), view({ phase: 'finished', remainingSec: 0 }))).toEqual(['finish']);
  });

  it('Debería avisar del descanso al pasar al ejercicio siguiente', () => {
    const antes = view({ phase: 'rest', index: 0 });

    expect(getCues(antes, view({ phase: 'rest', index: 1 }))).toEqual(['rest-start']);
  });

  it('Debería dar solo el aviso de la fase en la que aterriza tras un salto de reloj', () => {
    const antes = view({ phase: 'exercise', index: 0, remainingSec: 55 });

    expect(getCues(antes, view({ phase: 'rest', index: 1, remainingSec: 25 }))).toEqual(['rest-start']);
  });

  it('Debería dar el aviso de fase y no el tic cuando coinciden', () => {
    expect(getCues(view({ phase: 'rest', remainingSec: 1 }), view({ phase: 'exercise', remainingSec: 3 }))).toEqual([
      'exercise-start',
    ]);
  });

  it('Debería callar mientras la sesión está en pausa, aunque el jugador salte de ejercicio', () => {
    const pausada = view({ phase: 'rest', index: 1, paused: true });

    expect(getCues(view({ phase: 'exercise', index: 0 }), pausada)).toEqual([]);
    expect(getCues(view({ remainingSec: 4 }), view({ remainingSec: 3, paused: true }))).toEqual([]);
  });

  it('Debería callar mientras el jugador espera en el descanso', () => {
    const esperando = view({ phase: 'rest', remainingSec: 2, waiting: true });

    expect(getCues(view({ phase: 'rest', remainingSec: 3 }), esperando)).toEqual([]);
  });

  it('Debería no hacer tic fuera de los tres últimos segundos', () => {
    expect(getCues(view({ remainingSec: 6 }), view({ remainingSec: 5 }))).toEqual([]);
    expect(getCues(view({ remainingSec: 31 }), view({ remainingSec: 30 }))).toEqual([]);
  });
});

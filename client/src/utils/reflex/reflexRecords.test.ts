import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { getRecord, saveIfBetter } from './reflexRecords';

describe('reflexRecords', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('devuelve null si el jugador aún no ha jugado ese juego', () => {
    expect(getRecord('user-1', 'tejas')).toBeNull();
  });

  it('el primer resultado siempre es récord y queda guardado', () => {
    const result = saveIfBetter('user-1', 'tejas', 12, 'higher');

    expect(result).toEqual({ isNewRecord: true, record: 12 });
    expect(getRecord('user-1', 'tejas')).toBe(12);
  });

  it('un resultado peor no pisa el récord cuando mejor es mayor', () => {
    saveIfBetter('user-1', 'tejas', 12, 'higher');

    const result = saveIfBetter('user-1', 'tejas', 9, 'higher');

    expect(result).toEqual({ isNewRecord: false, record: 12 });
    expect(getRecord('user-1', 'tejas')).toBe(12);
  });

  it('un resultado mayor supera el récord cuando mejor es mayor', () => {
    saveIfBetter('user-1', 'tejas', 12, 'higher');

    const result = saveIfBetter('user-1', 'tejas', 15, 'higher');

    expect(result).toEqual({ isNewRecord: true, record: 15 });
  });

  it('cuando mejor es menor, un tiempo menor supera el récord y uno mayor no', () => {
    saveIfBetter('user-1', 'reaccion-simple', 300, 'lower');

    expect(saveIfBetter('user-1', 'reaccion-simple', 250, 'lower')).toEqual({
      isNewRecord: true,
      record: 250,
    });
    expect(saveIfBetter('user-1', 'reaccion-simple', 400, 'lower')).toEqual({
      isNewRecord: false,
      record: 250,
    });
  });

  it('guarda récords separados por jugador y por juego', () => {
    saveIfBetter('user-1', 'tejas', 12, 'higher');
    saveIfBetter('user-2', 'tejas', 20, 'higher');
    saveIfBetter('user-1', 'go-no-go', 7, 'higher');

    expect(getRecord('user-1', 'tejas')).toBe(12);
    expect(getRecord('user-2', 'tejas')).toBe(20);
    expect(getRecord('user-1', 'go-no-go')).toBe(7);
  });

  it('ignora un valor corrupto en el almacenamiento y lo trata como sin récord', () => {
    localStorage.setItem('reflejo:user-1:tejas', 'no-es-un-numero');

    expect(getRecord('user-1', 'tejas')).toBeNull();
    expect(saveIfBetter('user-1', 'tejas', 5, 'higher')).toEqual({ isNewRecord: true, record: 5 });
  });

  it.each(['', '   '])('trata un valor vacío (%j) como sin récord, no como un 0', (stored) => {
    localStorage.setItem('reflejo:user-1:tejas', stored);

    expect(getRecord('user-1', 'tejas')).toBeNull();
  });

  it('no rompe si el almacenamiento está bloqueado: no hay récord y el resultado no se guarda', () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('SecurityError');
    });
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('SecurityError');
    });

    expect(getRecord('user-1', 'tejas')).toBeNull();
    expect(saveIfBetter('user-1', 'tejas', 5, 'higher')).toEqual({ isNewRecord: true, record: 5 });
  });

  it('un resultado igual al récord no cuenta como nuevo récord', () => {
    saveIfBetter('user-1', 'tejas', 12, 'higher');

    expect(saveIfBetter('user-1', 'tejas', 12, 'higher').isNewRecord).toBe(false);
  });
});

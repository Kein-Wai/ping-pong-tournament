import { describe, it, expect } from 'vitest';
import type { TrackedMatch, TrackedPoint } from '../types/manualMatch';
import {
  buildQuickNotes,
  findInvalidQuickSet,
  formatPlanningText,
  getActiveSet,
  getPointLabel,
  getReportSetScores,
  getSetSummary,
  getSortedCategories,
  isReadyToComplete,
  parsePlanningNotes,
  resizeSetScores,
  toSetScorePayload,
} from './manual-match';

const point = (
  setNumber: number,
  pointOrder: number,
  isWon: boolean,
  extra: Partial<TrackedPoint> = {},
): TrackedPoint => ({ id: `p${setNumber}-${pointOrder}`, setNumber, pointOrder, isWon, ...extra });

/** Puntos de un set con el marcador indicado. */
const setPoints = (setNumber: number, mine: number, theirs: number): TrackedPoint[] => [
  ...Array.from({ length: mine }, (_, i) => point(setNumber, i + 1, true)),
  ...Array.from({ length: theirs }, (_, i) => point(setNumber, mine + i + 1, false)),
];

describe('getPointLabel', () => {
  it('un punto sin categoría se rotula como rápido', () => {
    expect(getPointLabel(point(1, 1, true))).toBe('Rápido / Sin detalle');
  });

  it('solo categoría', () => {
    expect(getPointLabel(point(1, 1, true, { category: 'Ataque' }))).toBe('Ataque');
  });

  it('con subcategoría', () => {
    expect(getPointLabel(point(1, 1, true, { category: 'Ataque', subcategory: 'Derecha' }))).toBe(
      'Ataque > Derecha',
    );
  });

  it('con subcategoría y colocación', () => {
    expect(
      getPointLabel(
        point(1, 1, false, { category: 'Resto', subcategory: 'Topeado', placement: 'Reves' }),
      ),
    ).toBe('Resto > Topeado (Reves)');
  });

  it('con categoría y colocación pero sin subcategoría', () => {
    expect(getPointLabel(point(1, 1, true, { category: 'Servicio', placement: 'Centro' }))).toBe(
      'Servicio (Centro)',
    );
  });
});

describe('getSetSummary', () => {
  const points = [
    point(1, 1, true, { category: 'Ataque' }),
    point(1, 2, true, { category: 'Ataque' }),
    point(1, 3, true, { category: 'Servicio', subcategory: 'Cortado', placement: 'Derecha' }),
    point(1, 4, false, { category: 'FalloSaque' }),
    point(2, 1, false, { category: 'Movilidad' }),
  ];

  it('agrupa por rótulo los puntos ganados y los perdidos del set pedido', () => {
    expect(getSetSummary(points, 1)).toEqual({
      wonCategories: { Ataque: 2, 'Servicio > Cortado (Derecha)': 1 },
      lostCategories: { FalloSaque: 1 },
      myScore: 3,
      oppScore: 1,
    });
  });

  it('ignora los puntos de otros sets', () => {
    expect(getSetSummary(points, 2)).toEqual({
      wonCategories: {},
      lostCategories: { Movilidad: 1 },
      myScore: 0,
      oppScore: 1,
    });
  });

  it('un set sin puntos está vacío', () => {
    expect(getSetSummary(points, 9)).toEqual({
      wonCategories: {},
      lostCategories: {},
      myScore: 0,
      oppScore: 0,
    });
  });
});

describe('getSortedCategories', () => {
  it('ordena de más a menos frecuente', () => {
    expect(getSortedCategories({ a: 1, b: 3, c: 2 })).toEqual([
      ['b', 3],
      ['c', 2],
      ['a', 1],
    ]);
  });

  it('un objeto vacío da una lista vacía', () => {
    expect(getSortedCategories({})).toEqual([]);
  });
});

describe('getActiveSet', () => {
  it('sin puntos se empieza en el set 1', () => {
    expect(getActiveSet([])).toBe(1);
  });

  it('si el último set está a medias se retoma', () => {
    expect(getActiveSet(setPoints(1, 7, 3))).toBe(1);
  });

  it('si el último set ya terminó se pasa al siguiente', () => {
    expect(getActiveSet(setPoints(1, 11, 3))).toBe(2);
  });

  it('mira solo el último set jugado', () => {
    expect(getActiveSet([...setPoints(1, 11, 3), ...setPoints(2, 4, 4)])).toBe(2);
  });

  it('un set a once puntos con el rival en diez no ha terminado, a 12-10 sí', () => {
    expect(getActiveSet(setPoints(1, 11, 10))).toBe(1);
    expect(getActiveSet(setPoints(1, 12, 10))).toBe(2);
  });
});

describe('getReportSetScores', () => {
  const base = {
    id: 'm',
    opponentName: 'Rival',
    status: 'Completado',
    setsToWin: 3,
  } as TrackedMatch;

  it('en modo rápido usa los tanteos guardados', () => {
    const match = {
      ...base,
      analysisType: 'Rapido',
      setScores: [{ myScore: 11, oppScore: 7 }],
    } as TrackedMatch;

    expect(getReportSetScores(match, [])).toEqual([{ myScore: 11, oppScore: 7 }]);
  });

  it('en modo rápido sin tanteos no hay nada que mostrar', () => {
    expect(getReportSetScores({ ...base, analysisType: 'Rapido', setScores: null }, [])).toEqual(
      [],
    );
  });

  it('en modo profundo los deduce de los puntos, set a set', () => {
    const points = [...setPoints(1, 11, 4), ...setPoints(2, 6, 11)];

    expect(getReportSetScores({ ...base, analysisType: 'Extenso' }, points)).toEqual([
      { myScore: 11, oppScore: 4 },
      { myScore: 6, oppScore: 11 },
    ]);
  });

  it('en modo profundo se salta los sets sin puntos', () => {
    const points = [...setPoints(1, 11, 4), ...setPoints(3, 2, 11)];

    expect(getReportSetScores({ ...base, analysisType: 'Extenso' }, points)).toEqual([
      { myScore: 11, oppScore: 4 },
      { myScore: 2, oppScore: 11 },
    ]);
  });

  it('en modo profundo sin puntos no hay nada que mostrar', () => {
    expect(getReportSetScores({ ...base, analysisType: 'Extenso' }, [])).toEqual([]);
  });
});

describe('parsePlanningNotes', () => {
  it('lee las tres notas de un JSON', () => {
    expect(parsePlanningNotes('{"myServe":"a","theirServe":"b","strategy":"c"}')).toEqual({
      myServe: 'a',
      theirServe: 'b',
      strategy: 'c',
    });
  });

  it('un texto que no es JSON devuelve null', () => {
    expect(parsePlanningNotes('Notas antiguas en texto')).toBeNull();
  });

  it('el JSON null también devuelve null', () => {
    expect(parsePlanningNotes('null')).toBeNull();
  });

  it('las notas ausentes quedan sin definir', () => {
    expect(parsePlanningNotes('{"strategy":"c"}')).toEqual({
      myServe: undefined,
      theirServe: undefined,
      strategy: 'c',
    });
  });
});

describe('formatPlanningText', () => {
  it('rotula cada nota', () => {
    expect(formatPlanningText({ myServe: 'a', theirServe: 'b', strategy: 'c' })).toBe(
      '🎯 MI SAQUE:\na\n\n🛡️ SU SAQUE:\nb\n\n🧠 ESTRATEGIA:\nc',
    );
  });

  it('una nota vacía o ausente se muestra como un guion', () => {
    expect(formatPlanningText({ myServe: '', strategy: 'c' })).toBe(
      '🎯 MI SAQUE:\n-\n\n🛡️ SU SAQUE:\n-\n\n🧠 ESTRATEGIA:\nc',
    );
  });
});

describe('buildQuickNotes', () => {
  it('sin nada marcado dice «Ninguna» y «Sin detalles»', () => {
    expect(
      buildQuickNotes({ strengths: [], strDetails: '', weaknesses: [], weakDetails: '' }),
    ).toBe(
      'Fortalezas durante el partido:\nNinguna\nDetalles:\nSin detalles\n\nCosas a mejorar:\nNinguna\nDetalles:\nSin detalles',
    );
  });

  it('lista cada habilidad marcada con un guion y añade los detalles', () => {
    expect(
      buildQuickNotes({
        strengths: ['Servicio', 'Corte'],
        strDetails: 'Muy sólido',
        weaknesses: ['Recepción'],
        weakDetails: 'Lenta',
      }),
    ).toBe(
      'Fortalezas durante el partido:\n- Servicio\n- Corte\nDetalles:\nMuy sólido\n\nCosas a mejorar:\n- Recepción\nDetalles:\nLenta',
    );
  });
});

describe('findInvalidQuickSet', () => {
  const s = (myScore: number | '', oppScore: number | '') => ({ myScore, oppScore });

  it('todos los tanteos posibles o vacíos son válidos', () => {
    expect(findInvalidQuickSet([s(11, 7), s('', ''), s(0, 0), s(15, 13), s(7, 11)])).toBeNull();
  });

  it('devuelve el primer tanteo imposible con su posición', () => {
    expect(findInvalidQuickSet([s(11, 7), s(5, 3), s(10, 12)])).toEqual({
      index: 1,
      myScore: 5,
      oppScore: 3,
    });
  });

  it.each([
    [11, 10],
    [12, 9],
    [13, 10],
    [14, 11],
  ])('%i-%i es imposible', (a, b) => {
    expect(findInvalidQuickSet([s(a, b)])).toEqual({ index: 0, myScore: a, oppScore: b });
  });

  it.each([
    [11, 9],
    [11, 0],
    [12, 10],
    [13, 11],
  ])('%i-%i es posible', (a, b) => {
    expect(findInvalidQuickSet([s(a, b)])).toBeNull();
  });
});

describe('toSetScorePayload', () => {
  it('convierte a número y deja en cero lo vacío', () => {
    expect(
      toSetScorePayload([
        { myScore: 11, oppScore: 7 },
        { myScore: '', oppScore: '' },
        { myScore: 5, oppScore: '' },
      ]),
    ).toEqual([
      { myScore: 11, oppScore: 7 },
      { myScore: 0, oppScore: 0 },
      { myScore: 5, oppScore: 0 },
    ]);
  });
});

describe('resizeSetScores', () => {
  const filled = [{ myScore: 11, oppScore: 7 }];

  it('con la misma cantidad devuelve la misma lista', () => {
    expect(resizeSetScores(filled, 1)).toBe(filled);
  });

  it('añade tanteos vacíos si faltan', () => {
    expect(resizeSetScores(filled, 3)).toEqual([
      { myScore: 11, oppScore: 7 },
      { myScore: '', oppScore: '' },
      { myScore: '', oppScore: '' },
    ]);
  });

  it('recorta por el final si sobran', () => {
    expect(resizeSetScores([...filled, { myScore: 1, oppScore: 2 }], 1)).toEqual(filled);
  });

  it('no modifica la lista original', () => {
    resizeSetScores(filled, 3);

    expect(filled).toHaveLength(1);
  });
});

describe('isReadyToComplete', () => {
  it('uno de los dos llega exactamente a los sets necesarios y el otro no', () => {
    expect(isReadyToComplete(3, 1, 3)).toBe(true);
    expect(isReadyToComplete(0, 3, 3)).toBe(true);
  });

  it('nadie ha llegado todavía', () => {
    expect(isReadyToComplete(2, 1, 3)).toBe(false);
  });

  it('los dos en los sets necesarios no es válido', () => {
    expect(isReadyToComplete(3, 3, 3)).toBe(false);
  });
});

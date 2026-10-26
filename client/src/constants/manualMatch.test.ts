import { describe, it, expect } from 'vitest';
import { PointCategory, PointPlacement, PointSubcategory } from '../types/enums';
import {
  LOST_TREE,
  PLACEMENTS,
  RESTO_PLACEMENTS,
  SKILLS_LIST,
  WON_TREE,
  type PointNode,
} from './manualMatch';

const CATEGORIES = Object.values(PointCategory) as string[];
const SUBCATEGORIES = Object.values(PointSubcategory) as string[];
const PLACEMENT_VALUES = Object.values(PointPlacement) as string[];

/** Todos los nodos del árbol, con sus descendientes. */
const flatten = (nodes: PointNode[]): PointNode[] =>
  nodes.flatMap((node) => [node, ...flatten(node.next ?? [])]);

describe('SKILLS_LIST', () => {
  it('lista las diez habilidades del análisis rápido', () => {
    expect(SKILLS_LIST).toEqual([
      'Derecha plano',
      'Revés plano',
      'TopSpin Derecha',
      'TopSpin Revés',
      'Corte',
      'Bloqueo de Derecha',
      'Bloqueo de Revés',
      'Servicio',
      'Recepción',
      'Movilidad',
    ]);
  });
});

describe('colocaciones', () => {
  it('al atacar se elige entre derecha, revés y centro del rival', () => {
    expect(PLACEMENTS).toEqual([
      { label: 'Derecha', placement: 'Derecha' },
      { label: 'Revés', placement: 'Reves' },
      { label: 'Centro/Codo', placement: 'Centro' },
    ]);
  });

  it('al restar se elige entre mi derecha y mi revés', () => {
    expect(RESTO_PLACEMENTS).toEqual([
      { label: 'A Mi Derecha', placement: 'Derecha' },
      { label: 'A Mi Revés', placement: 'Reves' },
    ]);
  });
});

describe('WON_TREE (puntos ganados)', () => {
  it('ofrece las cinco razones de un punto ganado, en orden', () => {
    expect(WON_TREE.map((n) => n.label)).toEqual([
      'Servicio',
      'Ataque',
      'Defensa',
      'Error No Forzado (del Rival)',
      'Punto Sin Razón',
    ]);
  });

  it('servicio, ataque y defensa piden subcategoría y colocación', () => {
    const subcategories = (category: string) =>
      WON_TREE.find((n) => n.category === category)?.next?.map((n) => n.subcategory);

    expect(subcategories('Servicio')).toEqual(['Cortado', 'Topeado', 'SinEfecto']);
    expect(subcategories('Ataque')).toEqual(['Derecha', 'Reves']);
    expect(subcategories('Defensa')).toEqual(['Cortado', 'SinEfecto']);
    flatten(WON_TREE)
      .filter((n) => n.subcategory)
      .forEach((n) => expect(n.next).toBe(PLACEMENTS));
  });

  it('el error no forzado del rival y el punto sin razón registran el punto al instante', () => {
    const leaves = WON_TREE.filter((n) => !n.next).map((n) => n.category);

    expect(leaves).toEqual(['ErrorNoForzado', 'SinRazon']);
  });
});

describe('LOST_TREE (puntos perdidos)', () => {
  it('ofrece las seis razones de un punto perdido, en orden', () => {
    expect(LOST_TREE.map((n) => n.label)).toEqual([
      'Fallo Saque',
      'Fallo Resto',
      'Error No Forzado',
      'Error Forzado (Buen tiro rival)',
      'Mala Movilidad',
      'Punto Sin Razón',
    ]);
  });

  it('el fallo de resto pide el tipo de saque y mi lado', () => {
    const resto = LOST_TREE.find((n) => n.category === 'Resto');

    expect(resto?.next?.map((n) => n.subcategory)).toEqual(['Cortado', 'Topeado', 'SinEfecto']);
    resto?.next?.forEach((n) => expect(n.next).toBe(RESTO_PLACEMENTS));
  });

  it('el resto de razones registran el punto al instante', () => {
    const leaves = LOST_TREE.filter((n) => !n.next).map((n) => n.category);

    expect(leaves).toEqual([
      'FalloSaque',
      'ErrorNoForzado',
      'ErrorForzado',
      'Movilidad',
      'SinRazon',
    ]);
  });
});

describe('valores contra los enums del modelo', () => {
  const nodes = [...flatten(WON_TREE), ...flatten(LOST_TREE)];

  it('toda categoría del árbol existe en PointCategory', () => {
    nodes.filter((n) => n.category).forEach((n) => expect(CATEGORIES).toContain(n.category));
  });

  it('toda subcategoría del árbol existe en PointSubcategory', () => {
    nodes
      .filter((n) => n.subcategory)
      .forEach((n) => expect(SUBCATEGORIES).toContain(n.subcategory));
  });

  it('toda colocación del árbol existe en PointPlacement', () => {
    nodes
      .filter((n) => n.placement)
      .forEach((n) => expect(PLACEMENT_VALUES).toContain(n.placement));
  });
});

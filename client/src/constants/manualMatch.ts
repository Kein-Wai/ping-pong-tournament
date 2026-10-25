import type { PointCategory, PointPlacement, PointSubcategory } from '../types/enums';

/**
 * Nodo del árbol de preguntas con el que se registra un punto en el análisis profundo.
 * Cada nivel aporta una pieza del punto (categoría, subcategoría, colocación); un nodo
 * sin `next` cierra el punto y lo registra.
 */
export interface PointNode {
  label: string;
  category?: PointCategory;
  subcategory?: PointSubcategory;
  placement?: PointPlacement;
  next?: PointNode[];
}

/** Habilidades que se marcan como fortaleza o fallo en el análisis rápido. */
export const SKILLS_LIST = [
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
];

/** Hacia dónde fue el punto en el campo del rival. */
export const PLACEMENTS: PointNode[] = [
  { label: 'Derecha', placement: 'Derecha' },
  { label: 'Revés', placement: 'Reves' },
  { label: 'Centro/Codo', placement: 'Centro' },
];

/** Hacia dónde fue el resto fallado, visto desde mi lado. */
export const RESTO_PLACEMENTS: PointNode[] = [
  { label: 'A Mi Derecha', placement: 'Derecha' },
  { label: 'A Mi Revés', placement: 'Reves' },
];

/** Razones por las que gané un punto. */
export const WON_TREE: PointNode[] = [
  {
    label: 'Servicio',
    category: 'Servicio',
    next: [
      { label: 'Cortado', subcategory: 'Cortado', next: PLACEMENTS },
      { label: 'Topeado', subcategory: 'Topeado', next: PLACEMENTS },
      { label: 'Sin Efecto', subcategory: 'SinEfecto', next: PLACEMENTS },
    ],
  },
  {
    label: 'Ataque',
    category: 'Ataque',
    next: [
      { label: 'Con Derecha', subcategory: 'Derecha', next: PLACEMENTS },
      { label: 'Con Revés', subcategory: 'Reves', next: PLACEMENTS },
    ],
  },
  {
    label: 'Defensa',
    category: 'Defensa',
    next: [
      { label: 'Corte', subcategory: 'Cortado', next: PLACEMENTS },
      { label: 'Bloqueo', subcategory: 'SinEfecto', next: PLACEMENTS },
    ],
  },
  { label: 'Error No Forzado (del Rival)', category: 'ErrorNoForzado' },
  { label: 'Punto Sin Razón', category: 'SinRazon' },
];

/** Razones por las que perdí un punto. */
export const LOST_TREE: PointNode[] = [
  { label: 'Fallo Saque', category: 'FalloSaque' },
  {
    label: 'Fallo Resto',
    category: 'Resto',
    next: [
      { label: 'Saque Cortado', subcategory: 'Cortado', next: RESTO_PLACEMENTS },
      { label: 'Saque Topeado', subcategory: 'Topeado', next: RESTO_PLACEMENTS },
      { label: 'Saque Sin Efecto', subcategory: 'SinEfecto', next: RESTO_PLACEMENTS },
    ],
  },
  { label: 'Error No Forzado', category: 'ErrorNoForzado' },
  { label: 'Error Forzado (Buen tiro rival)', category: 'ErrorForzado' },
  { label: 'Mala Movilidad', category: 'Movilidad' },
  { label: 'Punto Sin Razón', category: 'SinRazon' },
];

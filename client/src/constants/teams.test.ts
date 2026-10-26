import { describe, it, expect } from 'vitest';
import { TEAM_CATEGORIES, TEAM_LEVELS } from './teams';

describe('TEAM_CATEGORIES', () => {
  it('lista las divisiones de liga de la más alta a la más baja', () => {
    expect(TEAM_CATEGORIES).toEqual([
      'Superdivisión',
      'División de Honor',
      '1ª Nacional',
      '2ª Nacional',
      '3ª Nacional (Superautonomica)',
      '1ª Autonómica',
      '2ª Autonómica',
      'Liga Local',
    ]);
  });
});

describe('TEAM_LEVELS', () => {
  it('lista los niveles de menor a mayor', () => {
    expect(TEAM_LEVELS).toEqual(['Iniciacion', 'Principiante', 'Intermedio', 'Avanzado', 'Profesional']);
  });
});

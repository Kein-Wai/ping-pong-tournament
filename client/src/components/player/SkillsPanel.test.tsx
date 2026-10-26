import { describe, it, expect, vi } from 'vitest';
import { screen } from '@testing-library/react';
import { renderWithProviders } from '../../test/utils';
import type { SkillChartRow } from '../../utils/player-profile';
import { SkillsPanel } from './SkillsPanel';

// jsdom no tiene layout: el stub expone los datos que recibe el radar.
vi.mock('@mantine/charts', async () => {
  const { createElement } = await import('react');
  return {
    RadarChart: ({ data }: { data: unknown }) =>
      createElement('div', { 'data-testid': 'radar-chart' }, JSON.stringify(data)),
  };
});

const DATA: SkillChartRow[] = [
  { attribute: 'Plano Der.', value: 70.9, pending: 1.5, potential: 72.4 },
  { attribute: 'Servicio', value: 25, pending: 0, potential: 25 },
];

describe('SkillsPanel', () => {
  it('lista cada habilidad con su valor entero y la mejora pendiente', () => {
    renderWithProviders(<SkillsPanel skillsData={DATA} />);

    expect(screen.getByText('Plano Der.')).toBeInTheDocument();
    expect(screen.getByText('(+1.50)')).toBeInTheDocument();
    expect(screen.getByText('Servicio')).toBeInTheDocument();
    // Sin mejora pendiente no se muestra el paréntesis.
    expect(screen.getAllByText(/^\(\+/)).toHaveLength(1);
    expect(screen.getAllByText('/ 100')).toHaveLength(2);
  });

  it('el valor se muestra truncado a entero', () => {
    renderWithProviders(<SkillsPanel skillsData={DATA} />);

    expect(screen.getByText('70')).toBeInTheDocument();
  });

  it('alimenta el radar con los mismos datos', () => {
    renderWithProviders(<SkillsPanel skillsData={DATA} />);

    expect(JSON.parse(screen.getByTestId('radar-chart').textContent ?? '[]')).toEqual(DATA);
  });

  it('muestra los títulos de ambas tarjetas', () => {
    renderWithProviders(<SkillsPanel skillsData={DATA} />);

    expect(screen.getByText('Desglose de Habilidades')).toBeInTheDocument();
    expect(screen.getByText('Radar de Juego')).toBeInTheDocument();
  });

  it('sin habilidades lo avisa en las dos tarjetas', () => {
    renderWithProviders(<SkillsPanel skillsData={[]} />);

    expect(screen.getAllByText('Sin habilidades registradas.')).toHaveLength(2);
    expect(screen.queryByTestId('radar-chart')).not.toBeInTheDocument();
  });
});

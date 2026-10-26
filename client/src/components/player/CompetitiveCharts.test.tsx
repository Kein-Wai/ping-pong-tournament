import { describe, it, expect, vi } from 'vitest';
import { screen } from '@testing-library/react';
import { renderWithProviders } from '../../test/utils';
import { BalanceCard } from './BalanceCard';
import { RivalsCard } from './RivalsCard';

// jsdom no tiene layout: el stub expone los datos que recibe cada gráfico.
vi.mock('@mantine/charts', async () => {
  const { createElement } = await import('react');
  return {
    BarChart: ({ data }: { data: unknown }) =>
      createElement('div', { 'data-testid': 'bar-chart' }, JSON.stringify(data)),
  };
});

const chartData = () =>
  screen.getAllByTestId('bar-chart').map((el) => JSON.parse(el.textContent ?? '[]'));

describe('BalanceCard', () => {
  const data = [
    { metric: 'Partidos', Victorias: 75, Derrotas: 25 },
    { metric: 'Sets', Victorias: 69, Derrotas: 31 },
  ];

  it('con partidos pinta el gráfico de balance con sus datos', () => {
    renderWithProviders(<BalanceCard hasMatches efficiencyData={data} />);

    expect(screen.getByText('Balance General (Win Rate %)')).toBeInTheDocument();
    expect(chartData()).toEqual([data]);
  });

  it('sin partidos invita a jugar el primero', () => {
    renderWithProviders(<BalanceCard hasMatches={false} efficiencyData={[]} />);

    expect(screen.getByText(/Juega tu primer partido para/)).toBeInTheDocument();
    expect(screen.getByText(/desbloquear tus estadísticas/)).toBeInTheDocument();
    expect(screen.queryByTestId('bar-chart')).not.toBeInTheDocument();
  });
});

describe('RivalsCard', () => {
  const mano = [
    { Rasgo: 'vs Diestros', Victorias: 1, Derrotas: 0 },
    { Rasgo: 'vs Zurdos', Victorias: 2, Derrotas: 1 },
  ];
  const estilo = [
    { Rasgo: 'vs Ofensivos', Victorias: 0, Derrotas: 1 },
    { Rasgo: 'vs Defensivos', Victorias: 3, Derrotas: 0 },
  ];

  it('con partidos pinta un gráfico por mano dominante y otro por estilo de juego', () => {
    renderWithProviders(<RivalsCard hasMatches mano={mano} estilo={estilo} />);

    expect(screen.getByText('Desempeño vs Rivales')).toBeInTheDocument();
    expect(screen.getByText('Según Mano Dominante')).toBeInTheDocument();
    expect(screen.getByText('Según Estilo de Juego')).toBeInTheDocument();
    expect(chartData()).toEqual([mano, estilo]);
  });

  it('sin partidos avisa de que no hay enfrentamientos', () => {
    renderWithProviders(<RivalsCard hasMatches={false} mano={[]} estilo={[]} />);

    expect(screen.getByText('Sin datos de enfrentamientos.')).toBeInTheDocument();
    expect(screen.queryByTestId('bar-chart')).not.toBeInTheDocument();
  });
});

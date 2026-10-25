import { describe, it, expect, vi } from 'vitest';
import { screen, fireEvent } from '@testing-library/react';
import { renderWithProviders } from '../../test/utils';
import type { TrackedMatch, TrackedPoint } from '../../types/manualMatch';
import { MatchReport } from './MatchReport';

const MATCH = {
  id: 'm1',
  opponentName: 'Carlos',
  status: 'Completado',
  analysisType: 'Rapido',
  setsToWin: 3,
  mySets: 3,
  opponentSets: 1,
  lightNotes: null,
} as TrackedMatch;

const POINTS: TrackedPoint[] = [
  {
    id: 'a',
    setNumber: 1,
    pointOrder: 1,
    isWon: true,
    category: 'Ataque',
    subcategory: 'Derecha',
    placement: 'Centro',
  },
  { id: 'b', setNumber: 1, pointOrder: 2, isWon: false },
];

const renderReport = (props: Partial<React.ComponentProps<typeof MatchReport>> = {}) => {
  const onBack = vi.fn();
  const view = renderWithProviders(
    <MatchReport
      match={MATCH}
      mySets={3}
      oppSets={1}
      setScores={[]}
      points={[]}
      onBack={onBack}
      {...props}
    />,
  );
  return { ...view, onBack };
};

describe('MatchReport', () => {
  it('titula el reporte y muestra el marcador de sets con el rival en mayúsculas', () => {
    renderReport();

    expect(screen.getByText('Reporte del Partido')).toBeInTheDocument();
    expect(screen.getByText('TÚ')).toBeInTheDocument();
    expect(screen.getByText('SETS')).toBeInTheDocument();
    expect(screen.getByText('CARLOS')).toBeInTheDocument();
    expect(screen.getByText('3')).toBeInTheDocument();
    expect(screen.getByText('1')).toBeInTheDocument();
  });

  it('resalta en verde mi marcador si gané y en rojo el del rival si perdí', () => {
    const { unmount } = renderReport({ mySets: 3, oppSets: 1 });
    expect(screen.getByText('3').style.color).toBe('var(--mantine-color-green-4)');
    expect(screen.getByText('1').style.color).toBe('var(--mantine-color-gray-5)');
    unmount();

    renderReport({ mySets: 1, oppSets: 3 });
    expect(screen.getByText('3').style.color).toBe('var(--mantine-color-red-4)');
    expect(screen.getByText('1').style.color).toBe('var(--mantine-color-gray-5)');
  });

  it('muestra el tanteo de cada set cuando lo hay', () => {
    renderReport({
      setScores: [
        { myScore: 11, oppScore: 7 },
        { myScore: 8, oppScore: 11 },
      ],
    });

    expect(screen.getByText('SET 1')).toBeInTheDocument();
    expect(screen.getByText('11 - 7')).toBeInTheDocument();
    expect(screen.getByText('SET 2')).toBeInTheDocument();
    expect(screen.getByText('8 - 11')).toBeInTheDocument();
  });

  it('sin tanteos no muestra la sección', () => {
    renderReport();

    expect(screen.queryByText('SET 1')).not.toBeInTheDocument();
  });

  it('muestra las conclusiones cuando las hay', () => {
    renderReport({ match: { ...MATCH, lightNotes: 'Muy buen partido' } });

    expect(screen.getByText('Conclusiones del Partido:')).toBeInTheDocument();
    expect(screen.getByText('Muy buen partido')).toBeInTheDocument();
  });

  it('sin conclusiones no muestra el recuadro', () => {
    renderReport();

    expect(screen.queryByText('Conclusiones del Partido:')).not.toBeInTheDocument();
  });

  it('en modo profundo con puntos lista el desglose punto a punto', () => {
    renderReport({ match: { ...MATCH, analysisType: 'Extenso' }, points: POINTS });

    expect(screen.getByText('Desglose Punto a Punto')).toBeInTheDocument();
    expect(screen.getAllByText('Set 1')).toHaveLength(2);
    expect(screen.getByText('Mío')).toBeInTheDocument();
    expect(screen.getByText('Rival')).toBeInTheDocument();
    expect(screen.getByText('Ataque')).toBeInTheDocument();
    expect(screen.getByText('-')).toBeInTheDocument();
    expect(screen.getByText('Derecha (Centro)')).toBeInTheDocument();
  });

  it('en modo rápido no muestra el desglose aunque haya puntos', () => {
    renderReport({ points: POINTS });

    expect(screen.queryByText('Desglose Punto a Punto')).not.toBeInTheDocument();
  });

  it('en modo profundo sin puntos no muestra el desglose', () => {
    renderReport({ match: { ...MATCH, analysisType: 'Extenso' } });

    expect(screen.queryByText('Desglose Punto a Punto')).not.toBeInTheDocument();
  });

  it('«Volver a Análisis» avisa para volver', () => {
    const { onBack } = renderReport();

    fireEvent.click(screen.getByRole('button', { name: 'Volver a Análisis' }));

    expect(onBack).toHaveBeenCalledTimes(1);
  });
});

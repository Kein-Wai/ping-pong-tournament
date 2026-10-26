import { describe, it, expect, vi } from 'vitest';
import { screen, fireEvent } from '@testing-library/react';
import { renderWithProviders } from '../../test/utils';
import type { TrackedMatch } from '../../types/manualMatch';
import { QuickMatchView } from './QuickMatchView';

const MATCH = {
  id: 'm1',
  opponentName: 'Carlos',
  status: 'Iniciado',
  analysisType: 'Rapido',
  setsToWin: 3,
  planningNotes: null,
} as TrackedMatch;

const renderView = (props: Partial<React.ComponentProps<typeof QuickMatchView>> = {}) => {
  const handlers = {
    onMySetsChange: vi.fn(),
    onOppSetsChange: vi.fn(),
    onScoreChange: vi.fn(),
    onToggleStrength: vi.fn(),
    onStrDetailsChange: vi.fn(),
    onToggleWeakness: vi.fn(),
    onWeakDetailsChange: vi.fn(),
    onComplete: vi.fn(),
    onEditRival: vi.fn(),
    onBack: vi.fn(),
  };
  const view = renderWithProviders(
    <QuickMatchView
      match={MATCH}
      mySets={2}
      oppSets={1}
      totalSetsPlayed={3}
      setScores={[
        { myScore: 11, oppScore: 7 },
        { myScore: '', oppScore: '' },
        { myScore: '', oppScore: '' },
      ]}
      strChecked={['Servicio']}
      strDetails="Sólido"
      weakChecked={['Recepción']}
      weakDetails="Lenta"
      {...handlers}
      {...props}
    />,
  );
  return { ...view, ...handlers };
};

describe('QuickMatchView', () => {
  it('muestra el rival, el formato y los sets de cada lado', () => {
    renderView();

    expect(screen.getByText('vs Carlos')).toBeInTheDocument();
    expect(screen.getByText('Al mejor de 3 Sets')).toBeInTheDocument();
    expect(screen.getByLabelText('Tus Sets Ganados')).toHaveValue('2');
    expect(screen.getByLabelText('Sets de Carlos')).toHaveValue('1');
  });

  it('cambiar los sets avisa con el número', () => {
    const { onMySetsChange, onOppSetsChange } = renderView();

    fireEvent.change(screen.getByLabelText('Tus Sets Ganados'), { target: { value: '3' } });
    fireEvent.change(screen.getByLabelText('Sets de Carlos'), { target: { value: '0' } });

    expect(onMySetsChange).toHaveBeenCalledWith(3);
    expect(onOppSetsChange).toHaveBeenCalledWith(0);
  });

  it('pide un tanteo por cada set jugado y avisa al cambiarlo', () => {
    const { onScoreChange } = renderView();
    expect(screen.getByLabelText('Set 1 (Tú)')).toHaveValue('11');
    expect(screen.getByLabelText('Set 3 (Carlos)')).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText('Set 2 (Carlos)'), { target: { value: '9' } });

    expect(onScoreChange).toHaveBeenCalledWith(1, 'oppScore', 9);
  });

  it('sin sets jugados no pide tanteos', () => {
    renderView({ mySets: 0, oppSets: 0, totalSetsPlayed: 0, setScores: [] });

    expect(screen.queryByText('Tanteo por Set (Opcional)')).not.toBeInTheDocument();
  });

  it('ofrece las diez habilidades como fortaleza y como fallo, con las marcadas', () => {
    renderView();

    const [strServe, weakServe] = screen.getAllByRole('checkbox', { name: 'Servicio' });
    const [, weakReception] = screen.getAllByRole('checkbox', { name: 'Recepción' });
    expect(screen.getAllByRole('checkbox')).toHaveLength(20);
    expect(strServe).toBeChecked();
    expect(weakServe).not.toBeChecked();
    expect(weakReception).toBeChecked();
  });

  it('marcar una habilidad avisa con su nombre y si queda marcada', () => {
    const { onToggleStrength, onToggleWeakness } = renderView();
    const [, weakCut] = screen.getAllByRole('checkbox', { name: 'Corte' });
    const [strServe] = screen.getAllByRole('checkbox', { name: 'Servicio' });

    fireEvent.click(weakCut);
    fireEvent.click(strServe);

    expect(onToggleWeakness).toHaveBeenCalledWith('Corte', true);
    expect(onToggleStrength).toHaveBeenCalledWith('Servicio', false);
  });

  it('los detalles de fortalezas y fallos avisan con el texto', () => {
    const { onStrDetailsChange, onWeakDetailsChange } = renderView();
    const [strDetails, weakDetails] = screen.getAllByLabelText('Más Detalles');
    expect(strDetails).toHaveValue('Sólido');
    expect(weakDetails).toHaveValue('Lenta');

    fireEvent.change(strDetails, { target: { value: 'A' } });
    fireEvent.change(weakDetails, { target: { value: 'B' } });

    expect(onStrDetailsChange).toHaveBeenCalledWith('A');
    expect(onWeakDetailsChange).toHaveBeenCalledWith('B');
  });

  it('solo se puede finalizar cuando uno llega exactamente a los sets necesarios', () => {
    const { unmount } = renderView();
    expect(screen.getByRole('button', { name: 'Guardar y Finalizar Partido' })).toBeDisabled();
    expect(screen.getByText(/debe ganar exactamente 3 sets para finalizar/)).toBeInTheDocument();
    unmount();

    renderView({ mySets: 3, oppSets: 1 });
    expect(screen.getByRole('button', { name: 'Guardar y Finalizar Partido' })).toBeEnabled();
    expect(screen.queryByText(/debe ganar exactamente/)).not.toBeInTheDocument();
  });

  it('«Guardar y Finalizar Partido» avisa para cerrar el partido', () => {
    const { onComplete } = renderView({ mySets: 3, oppSets: 0 });

    fireEvent.click(screen.getByRole('button', { name: 'Guardar y Finalizar Partido' }));

    expect(onComplete).toHaveBeenCalledTimes(1);
  });

  it('con planificación guardada ofrece verla', () => {
    renderView({ match: { ...MATCH, planningNotes: 'Notas' } });

    expect(screen.getByText('Ver Planificación del Partido')).toBeInTheDocument();
  });

  it('sin planificación no la ofrece', () => {
    renderView();

    expect(screen.queryByText('Ver Planificación del Partido')).not.toBeInTheDocument();
  });

  it('el lápiz avisa para editar el rival y el botón de volver avisa', () => {
    const { onEditRival, onBack, container } = renderView();

    fireEvent.click(container.querySelector('.tabler-icon-edit')?.closest('button') as HTMLElement);
    fireEvent.click(screen.getByRole('button', { name: 'Volver a Análisis' }));

    expect(onEditRival).toHaveBeenCalledTimes(1);
    expect(onBack).toHaveBeenCalledTimes(1);
  });
});

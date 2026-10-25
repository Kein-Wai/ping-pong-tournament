import { describe, it, expect, vi } from 'vitest';
import { screen, fireEvent } from '@testing-library/react';
import { chooseOption, renderWithProviders } from '../../test/utils';
import { PlanningView } from './PlanningView';

const renderView = (props: Partial<React.ComponentProps<typeof PlanningView>> = {}) => {
  const handlers = {
    onMyServeChange: vi.fn(),
    onTheirServeChange: vi.fn(),
    onStrategyChange: vi.fn(),
    onAnalysisTypeChange: vi.fn(),
    onSave: vi.fn(),
    onStart: vi.fn(),
    onEditRival: vi.fn(),
    onBack: vi.fn(),
  };
  const view = renderWithProviders(
    <PlanningView
      opponentName="Carlos"
      myServe="Saque corto"
      theirServe="Bloquear"
      strategy="Ritmo alto"
      analysisType="Rapido"
      saving={false}
      {...handlers}
      {...props}
    />,
  );
  return { ...view, ...handlers };
};

describe('PlanningView', () => {
  it('titula el plan con el nombre del rival y muestra las tres notas', () => {
    renderView();

    expect(screen.getByText('Plan vs Carlos')).toBeInTheDocument();
    expect(screen.getByLabelText('¿Qué voy a hacer cuando saque yo?')).toHaveValue('Saque corto');
    expect(screen.getByLabelText('¿Qué voy a hacer cuando saque él?')).toHaveValue('Bloquear');
    expect(screen.getByLabelText('¿Cuál será mi estrategia de partido?')).toHaveValue('Ritmo alto');
  });

  it('escribir en cada nota avisa con el texto nuevo', () => {
    const { onMyServeChange, onTheirServeChange, onStrategyChange } = renderView();

    fireEvent.change(screen.getByLabelText('¿Qué voy a hacer cuando saque yo?'), {
      target: { value: 'A' },
    });
    fireEvent.change(screen.getByLabelText('¿Qué voy a hacer cuando saque él?'), {
      target: { value: 'B' },
    });
    fireEvent.change(screen.getByLabelText('¿Cuál será mi estrategia de partido?'), {
      target: { value: 'C' },
    });

    expect(onMyServeChange).toHaveBeenCalledWith('A');
    expect(onTheirServeChange).toHaveBeenCalledWith('B');
    expect(onStrategyChange).toHaveBeenCalledWith('C');
  });

  it('el tipo de análisis muestra el elegido y avisa al cambiarlo', () => {
    const { onAnalysisTypeChange } = renderView();
    expect(screen.getByRole('combobox', { name: 'Tipo de Análisis' })).toHaveValue(
      'Rápido (Rapido)',
    );

    chooseOption(/Tipo de Análisis/, 'Profundo (Extenso)');

    expect(onAnalysisTypeChange).toHaveBeenCalledWith('Extenso');
  });

  it('«Guardar Notas» y «Empezar Partido» avisan', () => {
    const { onSave, onStart } = renderView();

    fireEvent.click(screen.getByRole('button', { name: 'Guardar Notas' }));
    fireEvent.click(screen.getByRole('button', { name: 'Empezar Partido' }));

    expect(onSave).toHaveBeenCalledTimes(1);
    expect(onStart).toHaveBeenCalledTimes(1);
  });

  it('mientras guarda, «Guardar Notas» no se puede pulsar', () => {
    renderView({ saving: true });

    expect(screen.getByRole('button', { name: 'Guardar Notas' })).toBeDisabled();
  });

  it('el lápiz avisa para editar el rival', () => {
    const { onEditRival, container } = renderView();

    fireEvent.click(container.querySelector('.tabler-icon-edit')?.closest('button') as HTMLElement);

    expect(onEditRival).toHaveBeenCalledTimes(1);
  });

  it('«Volver a Análisis» avisa para volver', () => {
    const { onBack } = renderView();

    fireEvent.click(screen.getByRole('button', { name: 'Volver a Análisis' }));

    expect(onBack).toHaveBeenCalledTimes(1);
  });
});

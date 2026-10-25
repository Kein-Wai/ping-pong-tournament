import { describe, it, expect, vi } from 'vitest';
import { screen, fireEvent } from '@testing-library/react';
import { renderWithProviders } from '../../test/utils';
import type { PlayerTraining } from '../../types/api';
import { TrainingPlansCard } from './TrainingPlansCard';
import { TechnicalAnalysisCard } from './TechnicalAnalysisCard';

const PLAN = {
  id: 'plan1',
  weeks: 8,
  startDate: '2026-09-15T12:00:00.000Z',
  strengths: 'Pegada de top consistente',
  weaknesses: 'Mejorar el saque',
  _count: { sessions: 12 },
} as PlayerTraining;

const renderPlans = (props: Partial<React.ComponentProps<typeof TrainingPlansCard>> = {}) => {
  const handlers = { onCreatePlan: vi.fn(), onOpenPlan: vi.fn(), onDeletePlan: vi.fn() };
  const view = renderWithProviders(
    <TrainingPlansCard plans={[PLAN]} isAdmin {...handlers} {...props} />,
  );
  return { ...view, ...handlers };
};

describe('TrainingPlansCard', () => {
  it('lista cada plan con sus semanas, sesiones e inicio', () => {
    renderPlans();

    expect(screen.getByText('Historial de Macrociclos')).toBeInTheDocument();
    expect(screen.getByText('Plan de 8 Semanas')).toBeInTheDocument();
    expect(screen.getByText('12 Sesiones')).toBeInTheDocument();
    expect(screen.getByText(/Inicio: .*2026/)).toBeInTheDocument();
  });

  it('un plan sin sesiones cuenta cero', () => {
    renderPlans({ plans: [{ ...PLAN, _count: undefined } as PlayerTraining] });

    expect(screen.getByText('0 Sesiones')).toBeInTheDocument();
  });

  it('«Ver Macrociclo» avisa con el id del plan', () => {
    const { onOpenPlan } = renderPlans();

    fireEvent.click(screen.getByRole('button', { name: 'Ver Macrociclo' }));

    expect(onOpenPlan).toHaveBeenCalledWith('plan1');
  });

  it('un administrador puede crear y borrar planes', () => {
    const { onCreatePlan, onDeletePlan, container } = renderPlans();

    fireEvent.click(screen.getByRole('button', { name: '+ Crear Plan' }));
    fireEvent.click(container.querySelector('.tabler-icon-trash')?.closest('button') as HTMLElement);

    expect(onCreatePlan).toHaveBeenCalledTimes(1);
    expect(onDeletePlan).toHaveBeenCalledWith('plan1');
  });

  it('quien no es administrador no puede crear ni borrar', () => {
    const { container } = renderPlans({ isAdmin: false });

    expect(screen.queryByRole('button', { name: '+ Crear Plan' })).not.toBeInTheDocument();
    expect(container.querySelector('.tabler-icon-trash')).toBeNull();
  });

  it('sin planes avisa de que no hay ninguno asignado', () => {
    renderPlans({ plans: [] });

    expect(screen.getByText('No hay planes de entrenamiento asignados.')).toBeInTheDocument();
  });
});

describe('TechnicalAnalysisCard', () => {
  it('muestra las fortalezas y lo que hay que mejorar del último plan', () => {
    renderWithProviders(<TechnicalAnalysisCard latestPlan={PLAN} />);

    expect(screen.getByText('Último Análisis Técnico')).toBeInTheDocument();
    expect(screen.getByText('Fortalezas')).toBeInTheDocument();
    expect(screen.getByText('Pegada de top consistente')).toBeInTheDocument();
    expect(screen.getByText('A Mejorar')).toBeInTheDocument();
    expect(screen.getByText('Mejorar el saque')).toBeInTheDocument();
  });

  it('sin plan avisa de que el entrenador aún no ha creado un macrociclo', () => {
    renderWithProviders(<TechnicalAnalysisCard latestPlan={null} />);

    expect(
      screen.getByText('El entrenador aún no ha creado un macrociclo para ti.'),
    ).toBeInTheDocument();
    expect(screen.queryByText('Fortalezas')).not.toBeInTheDocument();
  });
});

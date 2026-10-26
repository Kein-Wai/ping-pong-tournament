import { describe, it, expect, vi } from 'vitest';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithProviders } from '../../test/utils';
import { PlanList } from './PlanList';
import type { PlayerTraining } from '../../types/api';

const buildPlan = (id: string, weeks = 4, sessions = 3): PlayerTraining =>
  ({
    id,
    weeks,
    status: 'Activo',
    startDate: '2026-01-01T00:00:00.000Z',
    _count: { sessions },
  }) as unknown as PlayerTraining;

describe('PlanList (client/src/components/training/PlanList.tsx)', () => {
  it('muestra el mensaje de lista vacia cuando no hay planes', () => {
    renderWithProviders(<PlanList plans={[]} isAdmin={false} />);

    expect(screen.getByText('No hay planes de entrenamiento asignados.')).toBeInTheDocument();
  });

  it('muestra las semanas y el numero de sesiones de cada plan', () => {
    renderWithProviders(
      <PlanList plans={[buildPlan('plan-1', 6, 12)]} isAdmin={false} />,
    );

    expect(screen.getByText('Plan de 6 Semanas')).toBeInTheDocument();
    expect(screen.getByText('12 Sesiones')).toBeInTheDocument();
  });

  it('oculta el botón de borrar a quien no es admin', () => {
    renderWithProviders(<PlanList plans={[buildPlan('plan-1')]} isAdmin={false} />);

    expect(screen.queryByRole('button', { name: '' })).not.toBeInTheDocument();
  });

  it('permite borrar el plan a un admin', async () => {
    const onDeletePlan = vi.fn();

    renderWithProviders(
      <PlanList plans={[buildPlan('plan-1')]} isAdmin onDeletePlan={onDeletePlan} />,
    );

    const deleteButton = document.querySelector('button[class*="ActionIcon"]');
    expect(deleteButton).toBeTruthy();

    await userEvent.click(deleteButton as Element);

    expect(onDeletePlan).toHaveBeenCalledWith('plan-1');
  });

  it('muestra el acceso al macrociclo de cada plan', () => {
    renderWithProviders(<PlanList plans={[buildPlan('plan-1')]} isAdmin={false} />);

    expect(screen.getByRole('button', { name: 'Ver Macrociclo' })).toBeInTheDocument();
  });
});

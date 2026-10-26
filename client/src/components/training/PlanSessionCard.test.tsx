import { describe, it, expect, vi } from 'vitest';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithProviders } from '../../test/utils';
import { PlanSessionCard } from './PlanSessionCard';
import type { PlanSession } from '../../hooks/useTrainingPlan';

const buildSession = (exercises: unknown[] = []): PlanSession =>
  ({
    id: 'sesion-1',
    date: '2026-01-05',
    exercises,
  }) as unknown as PlanSession;

describe('PlanSessionCard (client/src/components/training/PlanSessionCard.tsx)', () => {
  it('muestra el numero de sesion y el estado vacio', () => {
    renderWithProviders(
      <PlanSessionCard
        session={buildSession()}
        index={0}
        isAdmin={false}
        canClone={false}
        onAddExercise={vi.fn()}
        onCloneSession={vi.fn()}
        onRemoveExercise={vi.fn()}
      />,
    );

    expect(screen.getByText('Sesión 1')).toBeInTheDocument();
    expect(screen.getByText('Vacía')).toBeInTheDocument();
    expect(screen.getByText('Sin ejercicios asignados')).toBeInTheDocument();
  });

  it('muestra el progreso de una sesion a medias', () => {
    renderWithProviders(
      <PlanSessionCard
        session={buildSession([
          { id: 'e1', completed: true, sets: 3, reps: 10 },
          { id: 'e2', completed: false, sets: 3, reps: 10 },
        ])}
        index={0}
        isAdmin={false}
        canClone={false}
        onAddExercise={vi.fn()}
        onCloneSession={vi.fn()}
        onRemoveExercise={vi.fn()}
      />,
    );

    expect(screen.getByText('Progreso: 1 / 2')).toBeInTheDocument();
  });

  it('marca como completada cuando todos los ejercicios lo estan', () => {
    renderWithProviders(
      <PlanSessionCard
        session={buildSession([{ id: 'e1', completed: true }])}
        index={0}
        isAdmin={false}
        canClone={false}
        onAddExercise={vi.fn()}
        onCloneSession={vi.fn()}
        onRemoveExercise={vi.fn()}
      />,
    );

    expect(screen.getByText('Completada')).toBeInTheDocument();
  });

  it('oculta los botones de gestion a quien no es admin', () => {
    renderWithProviders(
      <PlanSessionCard
        session={buildSession()}
        index={0}
        isAdmin={false}
        canClone={false}
        onAddExercise={vi.fn()}
        onCloneSession={vi.fn()}
        onRemoveExercise={vi.fn()}
      />,
    );

    expect(screen.queryByRole('button', { name: /Añadir/ })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Clonar/ })).not.toBeInTheDocument();
  });

  it('muestra los botones de gestion al administrador', () => {
    renderWithProviders(
      <PlanSessionCard
        session={buildSession()}
        index={0}
        isAdmin
        canClone
        onAddExercise={vi.fn()}
        onCloneSession={vi.fn()}
        onRemoveExercise={vi.fn()}
      />,
    );

    expect(screen.getByRole('button', { name: /Añadir/ })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Clonar/ })).toBeInTheDocument();
  });

  it('bloquea el boton de anadir al llegar al limite de ejercicios', () => {
    renderWithProviders(
      <PlanSessionCard
        session={buildSession(
          Array.from({ length: 6 }, (_, index) => ({ id: `e${index}`, completed: false })),
        )}
        index={0}
        isAdmin
        canClone
        onAddExercise={vi.fn()}
        onCloneSession={vi.fn()}
        onRemoveExercise={vi.fn()}
      />,
    );

    expect(screen.getByRole('button', { name: 'Límite (6)' })).toBeDisabled();
  });

  it('avisa al pulsar anadir con el id de la sesion', async () => {
    const onAddExercise = vi.fn();

    renderWithProviders(
      <PlanSessionCard
        session={buildSession()}
        index={0}
        isAdmin
        canClone
        onAddExercise={onAddExercise}
        onCloneSession={vi.fn()}
        onRemoveExercise={vi.fn()}
      />,
    );

    await userEvent.click(screen.getByRole('button', { name: /Añadir/ }));

    expect(onAddExercise).toHaveBeenCalledWith('sesion-1');
  });

  it('avisa al pulsar clonar con el id y el numero de la sesion', async () => {
    const onCloneSession = vi.fn();

    renderWithProviders(
      <PlanSessionCard
        session={buildSession()}
        index={2}
        isAdmin
        canClone
        onAddExercise={vi.fn()}
        onCloneSession={onCloneSession}
        onRemoveExercise={vi.fn()}
      />,
    );

    await userEvent.click(screen.getByRole('button', { name: /Clonar/ }));

    expect(onCloneSession).toHaveBeenCalledWith('sesion-1', 3);
  });

  it('deshabilita clonar cuando no hay sesiones con ejercicios', () => {
    renderWithProviders(
      <PlanSessionCard
        session={buildSession()}
        index={0}
        isAdmin
        canClone={false}
        onAddExercise={vi.fn()}
        onCloneSession={vi.fn()}
        onRemoveExercise={vi.fn()}
      />,
    );

    expect(screen.getByRole('button', { name: /Clonar/ })).toBeDisabled();
  });
});

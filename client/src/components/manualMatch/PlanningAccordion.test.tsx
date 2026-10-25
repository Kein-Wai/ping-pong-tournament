import { describe, it, expect } from 'vitest';
import { screen, fireEvent } from '@testing-library/react';
import { renderWithProviders } from '../../test/utils';
import { PlanningAccordion } from './PlanningAccordion';

const PLAN_JSON = JSON.stringify({
  myServe: 'Saque corto al revés',
  theirServe: 'Abrir cruzado',
  strategy: 'Jugar al revés',
});

describe('PlanningAccordion', () => {
  it('ofrece ver la planificación', () => {
    renderWithProviders(<PlanningAccordion planningNotes={PLAN_JSON} />);

    expect(screen.getByText('Ver Planificación del Partido')).toBeInTheDocument();
  });

  it('al abrirlo muestra las tres notas de un plan guardado en JSON', async () => {
    renderWithProviders(<PlanningAccordion planningNotes={PLAN_JSON} />);

    fireEvent.click(screen.getByText('Ver Planificación del Partido'));

    const plan = await screen.findByText(/MI SAQUE/);
    expect(plan.textContent).toBe(
      '🎯 MI SAQUE:\nSaque corto al revés\n\n🛡️ SU SAQUE:\nAbrir cruzado\n\n🧠 ESTRATEGIA:\nJugar al revés',
    );
  });

  it('un plan en texto libre se muestra tal cual', async () => {
    renderWithProviders(<PlanningAccordion planningNotes="Notas antiguas en texto" />);

    fireEvent.click(screen.getByText('Ver Planificación del Partido'));

    expect(await screen.findByText('Notas antiguas en texto')).toBeInTheDocument();
  });

  it('una nota vacía del plan se muestra como un guion', async () => {
    renderWithProviders(
      <PlanningAccordion planningNotes={JSON.stringify({ myServe: '', strategy: 'Algo' })} />,
    );

    fireEvent.click(screen.getByText('Ver Planificación del Partido'));

    const plan = await screen.findByText(/MI SAQUE/);
    expect(plan.textContent).toBe('🎯 MI SAQUE:\n-\n\n🛡️ SU SAQUE:\n-\n\n🧠 ESTRATEGIA:\nAlgo');
  });
});

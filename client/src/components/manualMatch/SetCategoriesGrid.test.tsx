import { describe, it, expect } from 'vitest';
import { screen, within } from '@testing-library/react';
import { renderWithProviders } from '../../test/utils';
import type { SetSummary } from '../../types/manualMatch';
import { SetCategoriesGrid } from './SetCategoriesGrid';

const SUMMARY: SetSummary = {
  wonCategories: { Ataque: 2, 'Servicio > Cortado (Derecha)': 5 },
  lostCategories: { FalloSaque: 1 },
  myScore: 7,
  oppScore: 1,
};

const renderGrid = (summary: SetSummary = SUMMARY) =>
  renderWithProviders(
    <SetCategoriesGrid summary={summary} wonTitle="Tus Fortalezas" lostTitle="A Mejorar" />,
  );

/** Columna de la que cuelga un título. */
const columnOf = (title: string) =>
  screen.getByText(title).closest('[class*="mantine-Paper-root"]') as HTMLElement;

describe('SetCategoriesGrid', () => {
  it('muestra los dos títulos que le pasan', () => {
    renderGrid();

    expect(screen.getByText('Tus Fortalezas')).toBeInTheDocument();
    expect(screen.getByText('A Mejorar')).toBeInTheDocument();
  });

  it('lista los puntos ganados con su cuenta, de más a menos frecuente', () => {
    renderGrid();

    const won = within(columnOf('Tus Fortalezas'));
    const labels = won.getAllByText(/Servicio|Ataque/).map((el) => el.textContent);
    expect(labels).toEqual(['Servicio > Cortado (Derecha)', 'Ataque']);
    expect(won.getByText('5')).toBeInTheDocument();
    expect(won.getByText('2')).toBeInTheDocument();
  });

  it('lista los puntos perdidos en su propia columna', () => {
    renderGrid();

    const lost = within(columnOf('A Mejorar'));
    expect(lost.getByText('FalloSaque')).toBeInTheDocument();
    expect(lost.getByText('1')).toBeInTheDocument();
    expect(lost.queryByText('Ataque')).not.toBeInTheDocument();
  });

  it('una columna sin puntos dice «Ninguno»', () => {
    renderGrid({ ...SUMMARY, lostCategories: {} });

    expect(within(columnOf('A Mejorar')).getByText('Ninguno')).toBeInTheDocument();
    expect(within(columnOf('Tus Fortalezas')).queryByText('Ninguno')).not.toBeInTheDocument();
  });
});

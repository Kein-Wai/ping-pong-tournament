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

  it('lista los puntos ganados de más a menos frecuente', () => {
    renderGrid();

    const won = within(columnOf('Tus Fortalezas'));
    const labels = won.getAllByText(/Servicio|Ataque/).map((el) => el.textContent);
    expect(labels).toEqual(['Servicio > Cortado (Derecha)', 'Ataque']);
  });

  it('cada habilidad ganada muestra su % entre los ganados y su % entre todos los puntos', () => {
    renderGrid();

    const won = within(columnOf('Tus Fortalezas'));
    // 5 de 7 ganados = 71 %, 5 de 8 puntos = 63 %; 2 de 7 = 29 %, 2 de 8 = 25 %.
    expect(won.getByText('71% · 63%')).toBeInTheDocument();
    expect(won.getByText('29% · 25%')).toBeInTheDocument();
  });

  it('lista los puntos perdidos en su propia columna, con sus porcentajes', () => {
    renderGrid();

    const lost = within(columnOf('A Mejorar'));
    expect(lost.getByText('FalloSaque')).toBeInTheDocument();
    // 1 de 1 perdido = 100 %, 1 de 8 puntos = 13 %.
    expect(lost.getByText('100% · 13%')).toBeInTheDocument();
    expect(lost.queryByText('Ataque')).not.toBeInTheDocument();
  });

  it('ya no enseña los puntos en absoluto', () => {
    renderGrid();

    expect(screen.queryByText('5')).not.toBeInTheDocument();
    expect(screen.queryByText('2')).not.toBeInTheDocument();
  });

  it('cada columna explica qué es cada porcentaje', () => {
    renderGrid();

    expect(within(columnOf('Tus Fortalezas')).getByText('% de ganados · % del total')).toBeInTheDocument();
    expect(within(columnOf('A Mejorar')).getByText('% de perdidos · % del total')).toBeInTheDocument();
  });

  it('una columna sin puntos dice «Ninguno»', () => {
    renderGrid({ ...SUMMARY, lostCategories: {} });

    expect(within(columnOf('A Mejorar')).getByText('Ninguno')).toBeInTheDocument();
    expect(within(columnOf('Tus Fortalezas')).queryByText('Ninguno')).not.toBeInTheDocument();
  });
});

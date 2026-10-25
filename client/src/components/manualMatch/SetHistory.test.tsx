import { describe, it, expect } from 'vitest';
import { screen } from '@testing-library/react';
import { renderWithProviders } from '../../test/utils';
import type { TrackedPoint } from '../../types/manualMatch';
import { SetHistory } from './SetHistory';

const POINTS: TrackedPoint[] = [
  {
    id: 'a',
    setNumber: 2,
    pointOrder: 1,
    isWon: true,
    category: 'Ataque',
    subcategory: 'Derecha',
    placement: 'Centro',
  },
  { id: 'b', setNumber: 2, pointOrder: 2, isWon: false },
  { id: 'c', setNumber: 2, pointOrder: 3, isWon: true, category: 'Servicio' },
];

describe('SetHistory', () => {
  it('titula con el set en curso', () => {
    renderWithProviders(<SetHistory currentSet={2} points={POINTS} />);

    expect(screen.getByText('Historial del Set 2')).toBeInTheDocument();
  });

  it('lista los puntos del último al primero', () => {
    renderWithProviders(<SetHistory currentSet={2} points={POINTS} />);

    const order = screen.getAllByText(/^#\d$/).map((el) => el.textContent);
    expect(order).toEqual(['#3', '#2', '#1']);
  });

  it('cada punto muestra su categoría, o «Rapido» si no tiene, y su detalle', () => {
    renderWithProviders(<SetHistory currentSet={2} points={POINTS} />);

    expect(screen.getByText('Ataque')).toBeInTheDocument();
    expect(screen.getByText('Servicio')).toBeInTheDocument();
    expect(screen.getByText('Rapido')).toBeInTheDocument();
    expect(screen.getByText('Derecha (Centro)')).toBeInTheDocument();
  });

  it('un set sin puntos avisa de que acaba de empezar', () => {
    renderWithProviders(<SetHistory currentSet={1} points={[]} />);

    expect(screen.getByText('El set acaba de empezar.')).toBeInTheDocument();
  });

  it('con puntos no muestra el aviso de set recién empezado', () => {
    renderWithProviders(<SetHistory currentSet={2} points={POINTS} />);

    expect(screen.queryByText('El set acaba de empezar.')).not.toBeInTheDocument();
  });
});

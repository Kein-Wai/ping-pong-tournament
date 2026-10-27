import { describe, expect, it } from 'vitest';
import { screen } from '@testing-library/react';
import { renderWithProviders } from '../../test/utils';
import { SquareBoard } from './SquareBoard';

describe('SquareBoard', () => {
  it('Debería pintar sus casillas dentro de un tablero con el número de columnas indicado', () => {
    renderWithProviders(
      <SquareBoard columns={3} label="Tablero de prueba">
        <button>A</button>
        <button>B</button>
      </SquareBoard>
    );

    const board = screen.getByRole('group', { name: 'Tablero de prueba' });
    expect(board).toHaveAttribute('data-columns', '3');
    expect(board).toContainElement(screen.getByRole('button', { name: 'A' }));
    expect(board).toContainElement(screen.getByRole('button', { name: 'B' }));
  });
});

import { describe, it, expect, vi } from 'vitest';
import { screen, fireEvent } from '@testing-library/react';
import { WON_TREE } from '../../constants/manualMatch';
import { renderWithProviders } from '../../test/utils';
import { PointSelector } from './PointSelector';

const renderSelector = (props: Partial<React.ComponentProps<typeof PointSelector>> = {}) => {
  const handlers = { onStartPoint: vi.fn(), onNodeClick: vi.fn(), onCancel: vi.fn() };
  const view = renderWithProviders(
    <PointSelector isWon={null} nodes={null} {...handlers} {...props} />,
  );
  return { ...view, ...handlers };
};

describe('PointSelector', () => {
  it('sin punto en curso ofrece «Punto mío» y «Punto rival»', () => {
    const { onStartPoint } = renderSelector();

    fireEvent.click(screen.getByRole('button', { name: 'PUNTO MÍO' }));
    fireEvent.click(screen.getByRole('button', { name: 'PUNTO RIVAL' }));

    expect(onStartPoint).toHaveBeenNthCalledWith(1, true);
    expect(onStartPoint).toHaveBeenNthCalledWith(2, false);
    expect(screen.queryByText('Selecciona Categoría')).not.toBeInTheDocument();
  });

  it('con un punto en curso lista las categorías del nivel actual', () => {
    renderSelector({ isWon: true, nodes: WON_TREE });

    expect(screen.getByText('Selecciona Categoría')).toBeInTheDocument();
    WON_TREE.forEach((node) =>
      expect(screen.getByRole('button', { name: node.label })).toBeInTheDocument(),
    );
    expect(screen.queryByRole('button', { name: 'PUNTO MÍO' })).not.toBeInTheDocument();
  });

  it('elegir una categoría avisa con el nodo', () => {
    const { onNodeClick } = renderSelector({ isWon: true, nodes: WON_TREE });

    fireEvent.click(screen.getByRole('button', { name: 'Ataque' }));

    expect(onNodeClick).toHaveBeenCalledWith(WON_TREE[1]);
  });

  it('un punto ganado pinta el título y los botones en verde; uno perdido, en rojo', () => {
    const { unmount } = renderSelector({ isWon: true, nodes: WON_TREE });
    expect(screen.getByText('Selecciona Categoría').style.color).toBe(
      'var(--mantine-color-green-text)',
    );
    expect(screen.getByRole('button', { name: 'Ataque' })).toHaveAttribute(
      'data-variant',
      'outline',
    );
    unmount();

    renderSelector({ isWon: false, nodes: WON_TREE });
    expect(screen.getByText('Selecciona Categoría').style.color).toBe(
      'var(--mantine-color-red-text)',
    );
  });

  it('«Cancelar» avisa', () => {
    const { onCancel } = renderSelector({ isWon: false, nodes: WON_TREE });

    fireEvent.click(screen.getByRole('button', { name: 'Cancelar (Volver a Punto Mío/Rival)' }));

    expect(onCancel).toHaveBeenCalledTimes(1);
  });
});

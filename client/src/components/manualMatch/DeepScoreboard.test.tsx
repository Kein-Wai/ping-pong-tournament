import { describe, it, expect, vi } from 'vitest';
import { screen, fireEvent } from '@testing-library/react';
import { renderWithProviders } from '../../test/utils';
import { DeepScoreboard } from './DeepScoreboard';

const renderBoard = (props: Partial<React.ComponentProps<typeof DeepScoreboard>> = {}) => {
  const handlers = { onSelectSet: vi.fn(), onUndo: vi.fn(), onEditRival: vi.fn() };
  const view = renderWithProviders(
    <DeepScoreboard
      opponentName="Maximiliano Pérez"
      currentSet={3}
      mySets={1}
      oppSets={1}
      myScore={7}
      oppScore={9}
      {...handlers}
      {...props}
    />,
  );
  return { ...view, ...handlers };
};

describe('DeepScoreboard', () => {
  it('muestra el marcador del set en curso', () => {
    renderBoard();

    expect(screen.getByText('TÚ')).toBeInTheDocument();
    expect(screen.getByText('7')).toBeInTheDocument();
    expect(screen.getByText('9')).toBeInTheDocument();
  });

  it('recorta a diez letras el nombre del rival y lo pone en mayúsculas', () => {
    renderBoard();

    expect(screen.getByText('MAXIMILIAN')).toBeInTheDocument();
  });

  it('muestra los sets ganados por cada lado', () => {
    renderBoard({ mySets: 2, oppSets: 0 });

    expect(screen.getByText('2 Sets a 0')).toBeInTheDocument();
  });

  it('tiene un botón por cada set hasta el actual, con el actual relleno', () => {
    renderBoard();

    expect(screen.getByRole('button', { name: 'Set 1' })).toHaveAttribute('data-variant', 'light');
    expect(screen.getByRole('button', { name: 'Set 2' })).toHaveAttribute('data-variant', 'light');
    expect(screen.getByRole('button', { name: 'Set 3' })).toHaveAttribute('data-variant', 'filled');
    expect(screen.queryByRole('button', { name: 'Set 4' })).not.toBeInTheDocument();
  });

  it('pinchar un set anterior avisa con su número', () => {
    const { onSelectSet } = renderBoard();

    fireEvent.click(screen.getByRole('button', { name: 'Set 2' }));

    expect(onSelectSet).toHaveBeenCalledWith(2);
  });

  it('pinchar el set en curso no avisa', () => {
    const { onSelectSet } = renderBoard();

    fireEvent.click(screen.getByRole('button', { name: 'Set 3' }));

    expect(onSelectSet).not.toHaveBeenCalled();
  });

  it('deshacer avisa', () => {
    const { onUndo, container } = renderBoard();

    fireEvent.click(
      container.querySelector('.tabler-icon-arrow-back-up')?.closest('button') as HTMLElement,
    );

    expect(onUndo).toHaveBeenCalledTimes(1);
  });

  it('pinchar el nombre del rival avisa para editarlo', () => {
    const { onEditRival } = renderBoard();

    fireEvent.click(screen.getByText('MAXIMILIAN'));

    expect(onEditRival).toHaveBeenCalledTimes(1);
  });
});

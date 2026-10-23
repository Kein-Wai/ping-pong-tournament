import { describe, it, expect, vi } from 'vitest';
import { renderWithProviders } from '../../test/utils';
import { SwapPlayersModal } from './SwapPlayersModal';

const mockSwapOptions = [
  { value: 'p1', label: 'Ana García' },
  { value: 'p2', label: 'Luis Pérez' },
];

const defaultProps = {
  swapOptions: mockSwapOptions,
  isSwapping: false,
  onSwap: vi.fn(),
};

describe('SwapPlayersModal', () => {
  it('muestra el titulo "Intercambiar Jugadores"', () => {
    const { getByText } = renderWithProviders(
      <SwapPlayersModal
        opened
        onClose={vi.fn()}
        {...defaultProps}
        swapPlayerA={null}
        setSwapPlayerA={vi.fn()}
        swapPlayerB={null}
        setSwapPlayerB={vi.fn()}
      />,
    );
    expect(getByText('Intercambiar Jugadores')).toBeInTheDocument();
  });

  it('muestra la descripcion y alerta de Bloqueo de Sorteo', () => {
    const { getByText } = renderWithProviders(
      <SwapPlayersModal
        opened
        onClose={vi.fn()}
        {...defaultProps}
        swapPlayerA={null}
        setSwapPlayerA={vi.fn()}
        swapPlayerB={null}
        setSwapPlayerB={vi.fn()}
      />,
    );
    expect(
      getByText(/Selecciona dos jugadores reales inscritos/),
    ).toBeInTheDocument();
    expect(getByText('Bloqueo de Sorteo')).toBeInTheDocument();
  });

  it('deshabilita el boton cuando no hay jugadores seleccionados', () => {
    const { getByRole } = renderWithProviders(
      <SwapPlayersModal
        opened
        onClose={vi.fn()}
        {...defaultProps}
        swapPlayerA={null}
        setSwapPlayerA={vi.fn()}
        swapPlayerB={null}
        setSwapPlayerB={vi.fn()}
      />,
    );
    const button = getByRole('button', { name: 'Realizar Intercambio' });
    expect(button).toBeDisabled();
  });

  it('deshabilita el boton cuando ambos jugadores son el mismo', () => {
    const { getByRole } = renderWithProviders(
      <SwapPlayersModal
        opened
        onClose={vi.fn()}
        {...defaultProps}
        swapPlayerA="p1"
        setSwapPlayerA={vi.fn()}
        swapPlayerB="p1"
        setSwapPlayerB={vi.fn()}
      />,
    );
    const button = getByRole('button', { name: 'Realizar Intercambio' });
    expect(button).toBeDisabled();
  });

  it('llama a onSwap al hacer click en Realizar Intercambio con jugadores distintos', async () => {
    const onSwap = vi.fn();
    const { getByRole } = renderWithProviders(
      <SwapPlayersModal
        opened
        onClose={vi.fn()}
        swapOptions={mockSwapOptions}
        swapPlayerA="p1"
        setSwapPlayerA={vi.fn()}
        swapPlayerB="p2"
        setSwapPlayerB={vi.fn()}
        isSwapping={false}
        onSwap={onSwap}
      />,
    );
    const button = getByRole('button', { name: 'Realizar Intercambio' });
    await button.click();
    expect(onSwap).toHaveBeenCalledTimes(1);
  });

  it('habilita el boton cuando se seleccionan dos jugadores distintos', () => {
    const { getByRole } = renderWithProviders(
      <SwapPlayersModal
        opened
        onClose={vi.fn()}
        {...defaultProps}
        swapPlayerA="p1"
        setSwapPlayerA={vi.fn()}
        swapPlayerB="p2"
        setSwapPlayerB={vi.fn()}
      />,
    );
    const button = getByRole('button', { name: 'Realizar Intercambio' });
    expect(button).not.toBeDisabled();
  });
});

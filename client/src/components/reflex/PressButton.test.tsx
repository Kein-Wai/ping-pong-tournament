import { describe, expect, it, vi } from 'vitest';
import { fireEvent, screen } from '@testing-library/react';
import { renderWithProviders } from '../../test/utils';
import { PressButton } from './PressButton';

describe('PressButton', () => {
  const setup = () => {
    const onPress = vi.fn();
    renderWithProviders(<PressButton onPress={onPress} aria-label="Zona" />);
    return { onPress, button: screen.getByRole('button', { name: 'Zona' }) };
  };

  it('reacciona al pulsar, sin esperar a soltar', () => {
    const { onPress, button } = setup();

    fireEvent.pointerDown(button);

    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('acepta el clic del teclado, que llega sin posición (detail 0)', () => {
    const { onPress, button } = setup();

    fireEvent.click(button, { detail: 0 });

    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('ignora el clic que sigue a un toque o a un ratón, para no contar dos veces', () => {
    const { onPress, button } = setup();

    fireEvent.pointerDown(button);
    fireEvent.click(button, { detail: 1 });

    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('ignora el clic derecho y el central, que no son un toque', () => {
    const { onPress, button } = setup();

    fireEvent.pointerDown(button, { button: 2 });
    fireEvent.pointerDown(button, { button: 1 });

    expect(onPress).not.toHaveBeenCalled();
  });

  it('cuenta el toque con el dedo o con el botón principal del ratón (button 0)', () => {
    const { onPress, button } = setup();

    fireEvent.pointerDown(button, { button: 0 });

    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('impide que mantener pulsada una tecla repita la pulsación', () => {
    const { button } = setup();

    const proceeded = fireEvent.keyDown(button, { key: 'Enter', repeat: true });

    expect(proceeded).toBe(false);
  });
});

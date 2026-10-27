import { Button, type ButtonProps } from '@mantine/core';

interface PressButtonProps extends ButtonProps {
  'aria-label'?: string;
  'data-signal'?: boolean;
  onPress: () => void;
}

/**
 * Botón que reacciona al pulsar y no al soltar: el clic llega ~100 ms más tarde y falsearía los
 * tiempos de reacción. El clic solo cuenta si viene del teclado.
 */
export const PressButton = ({ onPress, ...props }: PressButtonProps) => (
  <Button
    {...props}
    // Solo cuenta el toque o el botón principal: el clic derecho o el central no son una respuesta.
    onPointerDown={(event) => {
      if (event.button > 0) return;
      onPress();
    }}
    // Mantener una tecla pulsada repite el clic en Enter: se impide para que cuente una sola vez.
    onKeyDown={(event) => {
      if (event.repeat) event.preventDefault();
    }}
    // Con teclado el clic no trae posición (detail 0); tras un toque o ratón detail es 1 y se ignora.
    onClick={(event) => {
      if (event.detail === 0) onPress();
    }}
  />
);

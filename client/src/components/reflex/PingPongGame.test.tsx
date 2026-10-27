import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, fireEvent, screen } from '@testing-library/react';
import { renderWithProviders } from '../../test/utils';
import { BAR_WIDTH, FIELD_WIDTH } from '../../utils/reflex/pingPongEngine';
import { PingPongGame } from './PingPongGame';

const field = () => screen.getByRole('group', { name: /campo de ping pong/i });
const bar = () => screen.getByTestId('player-bar');
const ball = () => screen.getByTestId('ball');
const barCenter = () => Number(bar().getAttribute('x')) + BAR_WIDTH / 2;

describe('PingPongGame', () => {
  const onFinish = vi.fn();
  const onCue = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers({
      toFake: [
        'setTimeout',
        'clearTimeout',
        'setInterval',
        'clearInterval',
        'requestAnimationFrame',
        'cancelAnimationFrame',
        'performance',
        'Date',
      ],
    });
    // Con 0,5 la pelota sale recta hacia abajo desde el centro.
    vi.spyOn(Math, 'random').mockReturnValue(0.5);
    // jsdom no calcula tamaños: el campo mide 300 px de ancho y empieza en x = 0.
    vi.spyOn(Element.prototype, 'getBoundingClientRect').mockReturnValue({
      left: 0,
      top: 0,
      right: 300,
      bottom: 400,
      width: 300,
      height: 400,
      x: 0,
      y: 0,
      toJSON: () => ({}),
    });
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  const setup = () => renderWithProviders(<PingPongGame onFinish={onFinish} onCue={onCue} />);
  const wait = (ms: number) => act(() => vi.advanceTimersByTime(ms));

  it('Debería mostrar el campo con la barra centrada y el marcador de rebotes a cero', () => {
    setup();

    expect(field()).toBeInTheDocument();
    expect(screen.getByText('Rebotes: 0')).toBeInTheDocument();
    expect(barCenter()).toBeCloseTo(FIELD_WIDTH / 2);
  });

  it('Debería mover la pelota con el paso del tiempo', () => {
    setup();
    const before = Number(ball().getAttribute('cy'));

    wait(300);

    expect(Number(ball().getAttribute('cy'))).toBeGreaterThan(before);
  });

  it('Debería llevar la barra a donde está el puntero dentro del campo', () => {
    setup();

    fireEvent.pointerMove(field(), { clientX: 75 });

    // 75 px de 300 es un cuarto del ancho del campo.
    expect(barCenter()).toBeCloseTo(FIELD_WIDTH / 4);
  });

  it('Debería mantener la barra dentro del campo aunque el puntero salga fuera', () => {
    setup();

    fireEvent.pointerMove(field(), { clientX: -500 });

    expect(barCenter()).toBeCloseTo(BAR_WIDTH / 2);
  });

  it('Debería mover la barra con las flechas del teclado mientras están pulsadas', () => {
    setup();

    fireEvent.keyDown(window, { key: 'ArrowLeft' });
    wait(300);
    fireEvent.keyUp(window, { key: 'ArrowLeft' });
    const afterLeft = barCenter();
    wait(300);

    expect(afterLeft).toBeLessThan(FIELD_WIDTH / 2);
    expect(barCenter()).toBeCloseTo(afterLeft);
  });

  it('Debería soltar las flechas si la ventana pierde el foco, para que la barra no siga sola', () => {
    setup();
    fireEvent.keyDown(window, { key: 'ArrowRight' });
    wait(100);

    fireEvent.blur(window);
    const atBlur = barCenter();
    wait(300);

    expect(barCenter()).toBeCloseTo(atBlur);
  });

  it('Debería sumar un rebote y avisar cuando la barra devuelve la pelota', () => {
    setup();

    wait(1000);

    expect(screen.getByText('Rebotes: 1')).toBeInTheDocument();
    expect(onCue).toHaveBeenCalledWith('hit');
  });

  it('Debería terminar al fallar la pelota, avisando y entregando los rebotes una sola vez', () => {
    setup();
    fireEvent.pointerMove(field(), { clientX: 0 });

    wait(5000);

    expect(onFinish).toHaveBeenCalledTimes(1);
    expect(onFinish).toHaveBeenCalledWith(0);
    expect(onCue).toHaveBeenCalledWith('miss');
    expect(onCue).toHaveBeenCalledWith('finish');
  });

  it('Debería entregar los rebotes conseguidos antes de fallar', () => {
    setup();
    wait(1000);
    expect(screen.getByText('Rebotes: 1')).toBeInTheDocument();
    fireEvent.pointerMove(field(), { clientX: 0 });

    wait(10_000);

    expect(onFinish).toHaveBeenCalledTimes(1);
    expect(onFinish.mock.calls[0][0]).toBeGreaterThanOrEqual(1);
  });
});

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, fireEvent, screen } from '@testing-library/react';
import { renderWithProviders } from '../../test/utils';
import { GAME_DURATION_MS, GAP_MS, visibleMsOf } from '../../utils/reflex/goNoGoEngine';
import { GoNoGoGame } from './GoNoGoGame';

const cell = (number: number) => screen.getByRole('button', { name: `Casilla ${number}` });

describe('GoNoGoGame', () => {
  const onFinish = vi.fn();
  const onCue = vi.fn();
  let random: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    // Con 0 todos los círculos son verdes y la primera casilla es la 1.
    random = vi.spyOn(Math, 'random').mockReturnValue(0);
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  const setup = () => renderWithProviders(<GoNoGoGame onFinish={onFinish} onCue={onCue} />);
  const wait = (ms: number) => act(() => vi.advanceTimersByTime(ms));
  const press = (element: HTMLElement) => fireEvent.pointerDown(element);

  it('Debería mostrar un tablero de 9 casillas vacías con el marcador a cero', () => {
    setup();

    expect(screen.getAllByRole('button', { name: /^Casilla \d+$/ })).toHaveLength(9);
    expect(cell(1)).toHaveAttribute('data-circle', 'none');
    expect(screen.getByText('Puntos: 0')).toBeInTheDocument();
    expect(screen.getByText('Errores: 0')).toBeInTheDocument();
    expect(screen.getByText('Tiempo: 30 s')).toBeInTheDocument();
  });

  it('Debería mostrar un círculo verde en una casilla cuando termina la pausa', () => {
    setup();

    wait(GAP_MS);

    expect(cell(1)).toHaveAttribute('data-circle', 'go');
    expect(cell(2)).toHaveAttribute('data-circle', 'none');
  });

  it('Debería mostrar un círculo rojo cuando el azar lo decide', () => {
    setup();
    // Después de montar: Mantine también usa Math.random para generar ids al montarse.
    random.mockReturnValueOnce(0.9);

    wait(GAP_MS);

    expect(cell(1)).toHaveAttribute('data-circle', 'nogo');
  });

  it('Debería pintar el círculo en la propia casilla, de verde o de rojo, y nada en las vacías', () => {
    setup();
    random.mockReturnValueOnce(0.9);
    wait(GAP_MS);

    expect(cell(1).style.backgroundImage).toContain('radial-gradient');
    expect(cell(1).style.backgroundImage).toContain('red');
    expect(cell(2).style.backgroundImage).toBe('');
  });

  it('Debería pintar de verde el círculo de ir', () => {
    setup();
    wait(GAP_MS);

    expect(cell(1).style.backgroundImage).toContain('green');
  });

  it('Debería sumar un punto y avisar al tocar un círculo verde', () => {
    setup();
    wait(GAP_MS);

    press(cell(1));

    expect(screen.getByText('Puntos: 1')).toBeInTheDocument();
    expect(cell(1)).toHaveAttribute('data-circle', 'none');
    expect(onCue).toHaveBeenCalledWith('hit');
  });

  it('Debería contar un error y avisar al tocar un círculo rojo', () => {
    setup();
    // Después de montar: Mantine también usa Math.random para generar ids al montarse.
    random.mockReturnValueOnce(0.9);
    wait(GAP_MS);

    press(cell(1));

    expect(screen.getByText('Errores: 1')).toBeInTheDocument();
    expect(screen.getByText('Puntos: 0')).toBeInTheDocument();
    expect(onCue).toHaveBeenCalledWith('miss');
  });

  it('Debería ignorar un toque en una casilla vacía', () => {
    setup();
    wait(GAP_MS);

    press(cell(5));

    expect(screen.getByText('Errores: 0')).toBeInTheDocument();
    expect(onCue).not.toHaveBeenCalled();
    expect(cell(1)).toHaveAttribute('data-circle', 'go');
  });

  it('Debería contar un error cuando se deja pasar un círculo verde', () => {
    setup();
    wait(GAP_MS);

    wait(visibleMsOf(0) + 50);

    expect(screen.getByText('Errores: 1')).toBeInTheDocument();
    expect(onCue).toHaveBeenCalledWith('miss');
  });

  it('Debería no castigar dejar pasar un círculo rojo', () => {
    setup();
    // Después de montar: Mantine también usa Math.random para generar ids al montarse.
    random.mockReturnValueOnce(0.9);
    wait(GAP_MS);

    wait(visibleMsOf(0) + 50);

    expect(screen.getByText('Errores: 0')).toBeInTheDocument();
    expect(onCue).not.toHaveBeenCalled();
  });

  it('Debería terminar a los 30 s entregando la puntuación una sola vez', () => {
    setup();
    // Toca cada verde nada más aparecer: sin errores, la puntuación son todos los aciertos.
    for (let elapsed = 0; elapsed < GAME_DURATION_MS; elapsed += GAP_MS) {
      wait(GAP_MS);
      const circle = document.querySelector('[data-circle="go"]');
      if (circle) press(circle as HTMLElement);
    }
    wait(1000);

    expect(onFinish).toHaveBeenCalledTimes(1);
    expect(onFinish.mock.calls[0][0]).toBeGreaterThan(80);
    expect(onCue).toHaveBeenCalledWith('finish');
  });

  it('Debería terminar con 0 puntos, no con negativos, si se dejan pasar todos los verdes', () => {
    setup();

    wait(GAME_DURATION_MS + 1000);

    expect(onFinish).toHaveBeenCalledTimes(1);
    expect(onFinish).toHaveBeenCalledWith(0);
  });
});

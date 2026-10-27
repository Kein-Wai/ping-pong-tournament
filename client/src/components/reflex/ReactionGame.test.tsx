import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, fireEvent, screen } from '@testing-library/react';
import { renderWithProviders } from '../../test/utils';
import { ATTEMPTS, MIN_WAIT_MS, PAUSE_MS, TIMEOUT_MS } from '../../utils/reflex/reactionEngine';
import { ReactionGame } from './ReactionGame';

const zone = () => screen.getByRole('button', { name: /zona de reacción/i });

describe('ReactionGame (Reacción simple)', () => {
  const onFinish = vi.fn();
  const onCue = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    // Con 0 la espera es siempre la mínima: 1 s.
    vi.spyOn(Math, 'random').mockReturnValue(0);
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  const setup = () => renderWithProviders(<ReactionGame onFinish={onFinish} onCue={onCue} />);
  const wait = (ms: number) => act(() => vi.advanceTimersByTime(ms));
  const touch = () => fireEvent.pointerDown(zone());

  it('Debería empezar esperando la señal, en el intento 1 de 5', () => {
    setup();

    expect(screen.getByText('Intento 1 de 5')).toBeInTheDocument();
    expect(screen.getByText(/espera la señal/i)).toBeInTheDocument();
    expect(zone()).toHaveAttribute('data-signal', 'false');
  });

  it('Debería dar la señal y avisar cuando termina la espera', () => {
    setup();

    wait(MIN_WAIT_MS);

    expect(screen.getByText('¡Ya!')).toBeInTheDocument();
    expect(zone()).toHaveAttribute('data-signal', 'true');
    expect(onCue).toHaveBeenCalledWith('go');
  });

  it('Debería mostrar los milisegundos de reacción al tocar tras la señal', () => {
    setup();
    wait(MIN_WAIT_MS);
    wait(230);

    touch();

    expect(screen.getByText('230 ms')).toBeInTheDocument();
    expect(onCue).toHaveBeenCalledWith('hit');
  });

  it('Debería avisar de salida en falso, sin gastar el intento, al tocar antes de la señal', () => {
    setup();
    wait(400);

    touch();

    expect(screen.getByText(/salida en falso/i)).toBeInTheDocument();
    expect(onCue).toHaveBeenCalledWith('miss');
    wait(PAUSE_MS);
    expect(screen.getByText('Intento 1 de 5')).toBeInTheDocument();
  });

  it('Debería decir «Demasiado lento» si no se toca en 1,5 s tras la señal', () => {
    setup();
    wait(MIN_WAIT_MS);

    wait(TIMEOUT_MS);

    expect(screen.getByText(/demasiado lento/i)).toBeInTheDocument();
    expect(onCue).toHaveBeenCalledWith('miss');
  });

  it('Debería pasar al intento siguiente tras la pausa', () => {
    setup();
    wait(MIN_WAIT_MS);
    wait(200);
    touch();

    wait(PAUSE_MS);

    expect(screen.getByText('Intento 2 de 5')).toBeInTheDocument();
  });

  it('Debería aceptar también el teclado, que dispara un clic sin posición', () => {
    setup();
    wait(MIN_WAIT_MS);
    wait(150);

    fireEvent.click(zone());

    expect(screen.getByText('150 ms')).toBeInTheDocument();
  });

  it('Debería ignorar el clic que sigue a un toque o un ratón, para no contar dos veces', () => {
    setup();
    wait(MIN_WAIT_MS);
    wait(150);
    touch();

    fireEvent.click(zone(), { detail: 1 });

    expect(screen.getByText('150 ms')).toBeInTheDocument();
    expect(onCue.mock.calls.filter(([cue]) => cue === 'hit')).toHaveLength(1);
  });

  it('Debería terminar tras 5 intentos entregando la media en ms una sola vez', () => {
    setup();
    for (let attempt = 1; attempt <= ATTEMPTS; attempt += 1) {
      wait(MIN_WAIT_MS);
      wait(200);
      touch();
      wait(PAUSE_MS);
    }
    wait(1000);

    expect(onFinish).toHaveBeenCalledTimes(1);
    expect(onFinish).toHaveBeenCalledWith(200);
    expect(onCue).toHaveBeenCalledWith('finish');
  });
});

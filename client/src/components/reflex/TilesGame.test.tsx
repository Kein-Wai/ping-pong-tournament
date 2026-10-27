import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, fireEvent, screen } from '@testing-library/react';
import { renderWithProviders } from '../../test/utils';
import { GAME_DURATION_MS, GAP_MS, litDurationMs } from '../../utils/reflex/tilesEngine';
import { TilesGame } from './TilesGame';

const tile = (number: number) => screen.getByRole('button', { name: `Teja ${number}` });

describe('TilesGame (Tejas)', () => {
  const onFinish = vi.fn();
  const onCue = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    // Con 0 la primera teja que se enciende es siempre la 1.
    vi.spyOn(Math, 'random').mockReturnValue(0);
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  const setup = () => renderWithProviders(<TilesGame onFinish={onFinish} onCue={onCue} />);
  const wait = (ms: number) => act(() => vi.advanceTimersByTime(ms));

  it('Debería mostrar una cuadrícula de 16 tejas apagadas con el marcador a cero', () => {
    setup();

    expect(screen.getAllByRole('button', { name: /^Teja \d+$/ })).toHaveLength(16);
    expect(tile(1)).toHaveAttribute('data-lit', 'false');
    expect(screen.getByText('Puntos: 0')).toBeInTheDocument();
    expect(screen.getByText('Fallos: 0')).toBeInTheDocument();
  });

  it('Debería encender una teja cuando pasa la pausa inicial', () => {
    setup();

    wait(GAP_MS);

    expect(tile(1)).toHaveAttribute('data-lit', 'true');
    expect(tile(2)).toHaveAttribute('data-lit', 'false');
  });

  it('Debería sumar un acierto, avisar y apagar la teja al tocarla encendida', () => {
    setup();
    wait(GAP_MS);

    fireEvent.click(tile(1));

    expect(screen.getByText('Puntos: 1')).toBeInTheDocument();
    expect(tile(1)).toHaveAttribute('data-lit', 'false');
    expect(onCue).toHaveBeenCalledWith('hit');
  });

  it('Debería avisar de un fallo, sin sumar, al tocar otra teja', () => {
    setup();
    wait(GAP_MS);

    fireEvent.click(tile(5));

    expect(screen.getByText('Puntos: 0')).toBeInTheDocument();
    expect(screen.getByText('Fallos: 1')).toBeInTheDocument();
    expect(onCue).toHaveBeenCalledWith('miss');
    expect(tile(1)).toHaveAttribute('data-lit', 'true');
  });

  it('Debería avisar de un fallo cuando la teja se apaga sin que la toquen', () => {
    setup();
    wait(GAP_MS);

    wait(litDurationMs(0) + 50);

    expect(onCue).toHaveBeenCalledWith('miss');
    expect(tile(1)).toHaveAttribute('data-lit', 'false');
  });

  it('Debería mostrar el tiempo que queda', () => {
    setup();
    expect(screen.getByText('Tiempo: 30 s')).toBeInTheDocument();

    wait(10_000);

    expect(screen.getByText('Tiempo: 20 s')).toBeInTheDocument();
  });

  it('Debería terminar a los 30 s entregando la puntuación una sola vez', () => {
    setup();
    // Toca cada teja nada más encenderse: sin fallos, la puntuación son todos los aciertos.
    for (let elapsed = 0; elapsed < GAME_DURATION_MS; elapsed += GAP_MS) {
      wait(GAP_MS);
      const lit = document.querySelector('[data-lit="true"]');
      if (lit) fireEvent.click(lit);
    }
    wait(1000);

    expect(onFinish).toHaveBeenCalledTimes(1);
    expect(onFinish.mock.calls[0][0]).toBeGreaterThan(100);
    expect(onCue).toHaveBeenCalledWith('finish');
  });

  it('Debería terminar con 0 puntos, no con negativos, si solo se acumulan fallos', () => {
    setup();

    wait(GAME_DURATION_MS + 1000);

    expect(onFinish).toHaveBeenCalledTimes(1);
    expect(onFinish).toHaveBeenCalledWith(0);
  });
});

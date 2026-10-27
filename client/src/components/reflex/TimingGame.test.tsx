import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, fireEvent, screen } from '@testing-library/react';
import { renderWithProviders } from '../../test/utils';
import { BALLS, PAUSE_MS, flightMsOf } from '../../utils/reflex/timingEngine';
import { TimingGame } from './TimingGame';

const zone = () => screen.getByRole('button', { name: /zona de golpeo/i });
const ballY = () => Number(screen.getByTestId('ball').getAttribute('cy'));

describe('TimingGame', () => {
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
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  const setup = () => renderWithProviders(<TimingGame onFinish={onFinish} onCue={onCue} />);
  const wait = (ms: number) => act(() => vi.advanceTimersByTime(ms));
  const press = () => fireEvent.pointerDown(zone());

  it('Debería empezar en la pelota 1 de 10 con 0 puntos', () => {
    setup();

    expect(screen.getByText(`Pelota 1 de ${BALLS}`)).toBeInTheDocument();
    expect(screen.getByText('Puntos: 0')).toBeInTheDocument();
  });

  it('Debería hacer subir la pelota y devolverla a la raqueta justo en el impacto', () => {
    setup();
    const atRacket = ballY();

    wait(flightMsOf(0) / 2);
    expect(ballY()).toBeLessThan(atRacket - 0.5);

    wait(flightMsOf(0) / 2);
    expect(ballY()).toBeCloseTo(atRacket, 1);
  });

  it('Debería calificar como perfecto un toque justo en el impacto', () => {
    setup();
    wait(flightMsOf(0));

    press();

    expect(screen.getByText('Perfecto · 0 ms')).toBeInTheDocument();
    expect(screen.getByText('Puntos: 10')).toBeInTheDocument();
    expect(onCue).toHaveBeenCalledWith('hit');
  });

  it('Debería indicar «pronto» con desviación negativa cuando se toca antes', () => {
    setup();
    wait(flightMsOf(0) - 130);

    press();

    expect(screen.getByText('Pronto · −130 ms')).toBeInTheDocument();
    expect(screen.getByText('Puntos: 3')).toBeInTheDocument();
    expect(onCue).toHaveBeenCalledWith('miss');
  });

  it('Debería indicar «tarde» con desviación positiva cuando se toca después', () => {
    setup();
    wait(flightMsOf(0) + 75);

    press();

    expect(screen.getByText('Bueno · +75 ms')).toBeInTheDocument();
    expect(screen.getByText('Puntos: 6')).toBeInTheDocument();
  });

  it('Debería decir «Demasiado tarde» y perder la pelota si nadie toca', () => {
    setup();

    wait(flightMsOf(0) + 400);

    expect(screen.getByText('Demasiado tarde')).toBeInTheDocument();
    expect(onCue).toHaveBeenCalledWith('miss');
  });

  it('Debería ignorar un segundo toque sobre la misma pelota', () => {
    setup();
    wait(flightMsOf(0));
    press();

    press();

    expect(screen.getByText('Puntos: 10')).toBeInTheDocument();
    expect(onCue.mock.calls.filter(([cue]) => cue === 'hit')).toHaveLength(1);
  });

  it('Debería golpear con la barra espaciadora o con Enter aunque la zona no tenga el foco', () => {
    setup();
    wait(flightMsOf(0));

    fireEvent.keyDown(window, { key: ' ' });

    expect(screen.getByText('Perfecto · 0 ms')).toBeInTheDocument();
  });

  it('Debería ignorar la repetición de una tecla mantenida pulsada', () => {
    setup();
    wait(flightMsOf(0) - 200);

    fireEvent.keyDown(window, { key: ' ', repeat: true });

    expect(screen.getByText('Puntos: 0')).toBeInTheDocument();
    expect(onCue).not.toHaveBeenCalled();
  });

  it('Debería golpear también con la barra espaciadora sobre la zona', () => {
    setup();
    wait(flightMsOf(0));

    fireEvent.keyDown(zone(), { key: ' ' });

    expect(screen.getByText('Perfecto · 0 ms')).toBeInTheDocument();
  });

  it('Debería lanzar la pelota siguiente, más rápida, tras la pausa', () => {
    setup();
    wait(flightMsOf(0));
    press();

    wait(PAUSE_MS + 50);

    expect(screen.getByText(`Pelota 2 de ${BALLS}`)).toBeInTheDocument();
  });

  it('Debería terminar tras 10 pelotas entregando los puntos y la desviación media', () => {
    setup();
    for (let ball = 0; ball < BALLS; ball += 1) {
      wait(flightMsOf(ball));
      press();
      wait(PAUSE_MS);
    }
    wait(100);

    expect(onFinish).toHaveBeenCalledTimes(1);
    expect(onFinish).toHaveBeenCalledWith(100, expect.stringMatching(/^Desviación media: \d+ ms$/));
    expect(onCue).toHaveBeenCalledWith('finish');
  });

  it('Debería terminar con 0 puntos y sin desviación media si no se golpea ninguna pelota', () => {
    setup();

    wait(60_000);

    expect(onFinish).toHaveBeenCalledTimes(1);
    expect(onFinish).toHaveBeenCalledWith(0, undefined);
  });
});

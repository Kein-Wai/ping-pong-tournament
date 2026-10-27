import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, fireEvent, screen } from '@testing-library/react';
import { Route, Routes } from 'react-router-dom';
import { APP_ROUTES } from '../../constants/routes';
import { GAME_DURATION_MS, GAP_MS } from '../../utils/reflex/tilesEngine';
import { BALLS, PAUSE_MS, flightMsOf } from '../../utils/reflex/timingEngine';
import { getRecord, saveIfBetter } from '../../utils/reflex/reflexRecords';
import { loginAs, renderWithProviders } from '../../test/utils';
import { JuegoPartida } from './JuegoPartida';

const renderAt = (path: string) =>
  renderWithProviders(
    <Routes>
      <Route path={APP_ROUTES.JUEGOS_REFLEJO.PLAY_PATH} element={<JuegoPartida />} />
    </Routes>,
    { initialEntries: [path] }
  );

const wait = (ms: number) => act(() => vi.advanceTimersByTime(ms));
// Toca cada teja en cuanto se enciende, así que no hay fallos y la puntuación es la máxima posible.
const jugarSinFallar = () => {
  for (let elapsed = 0; elapsed < GAME_DURATION_MS; elapsed += GAP_MS) {
    wait(GAP_MS);
    const lit = document.querySelector('[data-lit="true"]');
    if (lit) fireEvent.click(lit);
  }
};
const empezar = () => fireEvent.click(screen.getByRole('button', { name: /empezar/i }));

describe('Partida de un juego de reflejo (/juegos-reflejo/:juego)', () => {
  beforeEach(() => {
    localStorage.clear();
    loginAs({ id: 'u1' });
    vi.useFakeTimers();
    vi.spyOn(Math, 'random').mockReturnValue(0);
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('Debería avisar y ofrecer volver si el juego no existe', () => {
    renderAt('/juegos-reflejo/no-existe');

    expect(screen.getByText(/juego no encontrado/i)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /volver/i })).toHaveAttribute(
      'href',
      APP_ROUTES.JUEGOS_REFLEJO.LIST
    );
  });

  it('Debería empezar con las instrucciones del juego y el botón de empezar', () => {
    renderAt('/juegos-reflejo/tejas');

    expect(screen.getByRole('heading', { name: 'Tejas' })).toBeInTheDocument();
    expect(screen.getByText(/dura 30 segundos/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /empezar/i })).toBeInTheDocument();
  });

  it('Debería hacer una cuenta atrás de 3 a 1 antes de empezar a jugar', () => {
    renderAt('/juegos-reflejo/tejas');

    empezar();
    expect(screen.getByText('3')).toBeInTheDocument();

    wait(1000);
    expect(screen.getByText('2')).toBeInTheDocument();

    wait(2000);
    expect(screen.getByText('Puntos: 0')).toBeInTheDocument();
  });

  it('Debería jugar cada juego con su propio componente, no con el de Tejas', () => {
    renderAt('/juegos-reflejo/reaccion-simple');
    expect(screen.getByRole('heading', { name: 'Reacción simple' })).toBeInTheDocument();

    empezar();
    wait(3000);

    expect(screen.getByText('Intento 1 de 5')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Teja 1' })).not.toBeInTheDocument();
  });

  it('Debería jugar Go / No-Go con su tablero de 9 casillas', () => {
    renderAt('/juegos-reflejo/go-no-go');
    expect(screen.getByRole('heading', { name: 'Go / No-Go' })).toBeInTheDocument();

    empezar();
    wait(3000);

    expect(screen.getAllByRole('button', { name: /^Casilla \d+$/ })).toHaveLength(9);
    expect(screen.queryByRole('button', { name: 'Teja 1' })).not.toBeInTheDocument();
  });

  it('Debería jugar Ping Pong con su campo y su marcador de rebotes', () => {
    renderAt('/juegos-reflejo/ping-pong');
    expect(screen.getByRole('heading', { name: 'Ping Pong' })).toBeInTheDocument();

    empezar();
    wait(3000);

    expect(screen.getByRole('group', { name: /campo de ping pong/i })).toBeInTheDocument();
    expect(screen.getByText('Rebotes: 0')).toBeInTheDocument();
  });

  it('Debería jugar Timing y mostrar la desviación media junto al resultado', () => {
    renderAt('/juegos-reflejo/timing');
    expect(screen.getByRole('heading', { name: 'Timing' })).toBeInTheDocument();
    empezar();
    wait(3000);
    expect(screen.getByText(`Pelota 1 de ${BALLS}`)).toBeInTheDocument();

    for (let ball = 0; ball < BALLS; ball += 1) {
      wait(flightMsOf(ball));
      fireEvent.pointerDown(screen.getByRole('button', { name: /zona de golpeo/i }));
      wait(PAUSE_MS);
    }
    wait(100);

    expect(screen.getByText('100 puntos')).toBeInTheDocument();
    expect(screen.getByText(/^Desviación media: \d+ ms$/)).toBeInTheDocument();
  });

  it('Debería mostrar el resultado con un nuevo récord al terminar la primera partida', () => {
    renderAt('/juegos-reflejo/tejas');
    empezar();
    wait(3000);

    jugarSinFallar();

    expect(screen.getByText(/^\d+ puntos$/)).toBeInTheDocument();
    expect(screen.getByText(/nuevo récord/i)).toBeInTheDocument();
    expect(getRecord('u1', 'tejas')).toBeGreaterThan(100);
  });

  it('Debería animar a reintentar, sin celebrar récord, si la primera partida acaba en 0', () => {
    renderAt('/juegos-reflejo/tejas');
    empezar();
    wait(3000);

    wait(GAME_DURATION_MS);

    expect(screen.getByText('0 puntos')).toBeInTheDocument();
    expect(screen.getByText(/mala suerte, vuelve a intentarlo/i)).toBeInTheDocument();
    expect(screen.queryByText(/nuevo récord/i)).not.toBeInTheDocument();
  });

  it('Debería mostrar el récord anterior si no se supera', () => {
    saveIfBetter('u1', 'tejas', 9, 'higher');
    renderAt('/juegos-reflejo/tejas');
    empezar();
    wait(3000);

    wait(GAME_DURATION_MS);

    expect(screen.queryByText(/nuevo récord/i)).not.toBeInTheDocument();
    expect(screen.getByText(/tu récord: 9 puntos/i)).toBeInTheDocument();
  });

  it('Debería permitir jugar otra vez y volver a los juegos desde el resultado', () => {
    renderAt('/juegos-reflejo/tejas');
    empezar();
    wait(3000);
    wait(GAME_DURATION_MS);

    expect(screen.getByRole('link', { name: /volver/i })).toHaveAttribute(
      'href',
      APP_ROUTES.JUEGOS_REFLEJO.LIST
    );
    fireEvent.click(screen.getByRole('button', { name: /jugar otra vez/i }));

    expect(screen.getByText('3')).toBeInTheDocument();
  });
});

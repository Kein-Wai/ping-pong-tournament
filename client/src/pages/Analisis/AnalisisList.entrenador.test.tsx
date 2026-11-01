import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { screen, fireEvent, waitFor } from '@testing-library/react';
import { Routes, Route } from 'react-router-dom';
import { api } from '../../api/axios';
import { ENDPOINTS } from '../../api/endpoints';
import { APP_ROUTES } from '../../constants/routes';
import { useAuthStore } from '../../store/authStore';
import { loginAs, renderWithProviders } from '../../test/utils';
import { AnalisisList } from './AnalisisList';

// Se mockea el `api` de bajo nivel (la frontera del sistema), como en AnalisisList.test.tsx.
vi.mock('../../api/axios', () => ({
  api: {
    get: vi.fn(),
    post: vi.fn(),
  },
}));

const envelope = (data: unknown) => ({ data: { success: true, data } });

const ANA = { id: 'p1', name: 'Ana', surname: 'García', nickname: null };

const makeMatch = (overrides: Record<string, unknown> = {}) => ({
  id: 'm0',
  opponentName: 'Rival',
  status: 'Completado',
  date: '2026-10-01T10:00:00.000Z',
  format: 'Individual',
  matchType: 'Amistoso',
  analysisType: 'Rapido',
  ...overrides,
});

// Uno propio del entrenador (admin-1) y uno de la jugadora Ana, creado por él.
const OWN = makeMatch({
  id: 'm1',
  opponentName: 'Marta Gil',
  userId: 'admin-1',
  coachId: null,
  user: { id: 'admin-1', name: 'Entrenador', surname: null, nickname: null },
});
const OF_ANA = makeMatch({
  id: 'm2',
  opponentName: 'Pedro Sanz',
  userId: 'p1',
  coachId: 'admin-1',
  user: ANA,
});

// Jugadores del club: Luis aún no está aprobado y no debe poder elegirse.
const CLUB_PLAYERS = [
  { ...ANA, clubStatus: 'Aprobado' },
  { id: 'p2', name: 'Luis', surname: 'Pérez', clubStatus: 'Pendiente' },
  { id: 'p3', name: 'Rosa', surname: 'Vega', clubStatus: 'Aprobado' },
];

const SEASONS = [{ id: 's2', name: 'Temporada 2026/2027', isCurrent: true }];

const serve = (matches: unknown[] = [OWN, OF_ANA]) => {
  vi.mocked(api.get).mockImplementation((async (url: string) => {
    if (url === ENDPOINTS.MANUAL_MATCHES.BASE) return envelope(matches);
    if (url === ENDPOINTS.SEASONS.BASE) return envelope(SEASONS);
    if (url === ENDPOINTS.USERS.BASE) return envelope(CLUB_PLAYERS);
    throw new Error(`Peticion no esperada: ${url}`);
  }) as never);
};

const renderLoaded = async () => {
  renderWithProviders(
    <Routes>
      <Route path={APP_ROUTES.HOME} element={<AnalisisList />} />
      <Route path={APP_ROUTES.ANALISIS.TRACKER_PATH} element={<div>Pantalla del tracker</div>} />
    </Routes>,
  );
  await screen.findByText('Temporada 2026/2027');
};

const cards = () => screen.queryAllByText(/^vs /).map((card) => card.textContent);

const pick = async (input: HTMLElement, option: string) => {
  fireEvent.click(input);
  // El filtro y el selector del modal listan a los mismos jugadores: el último es el del desplegable recién abierto.
  const matches = await screen.findAllByRole('option', { name: option, hidden: true });
  fireEvent.click(matches[matches.length - 1]);
};

describe('AnalisisList: análisis del entrenador a un jugador', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    serve();
    vi.mocked(api.post).mockResolvedValue(envelope({ id: 'nuevo-1' }) as never);
  });

  afterEach(() => {
    useAuthStore.setState({ token: null, user: null, isAuthenticated: false });
  });

  describe('como jugador', () => {
    it('no pide los usuarios del club ni muestra el filtro ni el selector', async () => {
      loginAs({ id: 'p1', role: 'Player' });

      await renderLoaded();

      expect(api.get).not.toHaveBeenCalledWith(ENDPOINTS.USERS.BASE, expect.anything());
      expect(screen.queryByPlaceholderText('Todos los jugadores')).not.toBeInTheDocument();
      fireEvent.click(screen.getByRole('button', { name: 'Nuevo Registro' }));
      await screen.findByText('Configurar Partido / Plan');
      expect(screen.queryByLabelText('Analizar a')).not.toBeInTheDocument();
    });
  });

  describe('como AdminClub', () => {
    beforeEach(() => {
      loginAs({ id: 'admin-1', role: 'AdminClub' });
    });

    it('ofrece solo a los jugadores aprobados en el filtro', async () => {
      await renderLoaded();

      fireEvent.click(await screen.findByPlaceholderText('Todos los jugadores'));

      expect(
        await screen.findByRole('option', { name: 'Ana García', hidden: true }),
      ).toBeInTheDocument();
      expect(screen.getByRole('option', { name: 'Rosa Vega', hidden: true })).toBeInTheDocument();
      expect(
        screen.queryByRole('option', { name: 'Luis Pérez', hidden: true }),
      ).not.toBeInTheDocument();
    });

    it('al elegir un jugador vuelve a pedir los análisis filtrados por él', async () => {
      await renderLoaded();

      await pick(await screen.findByPlaceholderText('Todos los jugadores'), 'Ana García');

      await waitFor(() =>
        expect(api.get).toHaveBeenCalledWith(ENDPOINTS.MANUAL_MATCHES.BASE, {
          params: { playerId: 'p1' },
        }),
      );
    });

    it('si falla la carga filtrada no deja en pantalla los análisis del filtro anterior', async () => {
      vi.spyOn(console, 'error').mockImplementation(() => {});
      await renderLoaded();
      expect(cards()).toHaveLength(2);
      vi.mocked(api.get).mockImplementation((async (url: string, config?: unknown) => {
        if (url === ENDPOINTS.MANUAL_MATCHES.BASE && config) throw new Error('red caida');
        return envelope([]);
      }) as never);

      await pick(await screen.findByPlaceholderText('Todos los jugadores'), 'Ana García');

      await screen.findByText('No hay partidos registrados.');
      expect(cards()).toEqual([]);
    });

    it('la tarjeta indica el jugador analizado, pero no en los análisis propios', async () => {
      await renderLoaded();

      expect(cards()).toEqual(['vs Marta Gil', 'vs Pedro Sanz']);
      expect(screen.getAllByText('Jugador: Ana García')).toHaveLength(1);
      expect(screen.queryByText(/Jugador: Entrenador/)).not.toBeInTheDocument();
    });

    it('crea un análisis para el jugador elegido en «Analizar a»', async () => {
      await renderLoaded();
      fireEvent.click(screen.getByRole('button', { name: 'Nuevo Registro' }));
      await screen.findByText('Configurar Partido / Plan');

      await pick(screen.getByPlaceholderText('Yo (análisis propio)'), 'Rosa Vega');
      fireEvent.click(screen.getByRole('button', { name: 'Crear Plan General' }));

      expect(await screen.findByText('Pantalla del tracker')).toBeInTheDocument();
      expect(api.post).toHaveBeenCalledWith(
        ENDPOINTS.MANUAL_MATCHES.BASE,
        expect.objectContaining({ playerId: 'p3' }),
        undefined,
      );
    });

    it('sin elegir jugador crea un análisis propio, sin playerId', async () => {
      await renderLoaded();
      fireEvent.click(screen.getByRole('button', { name: 'Nuevo Registro' }));
      await screen.findByText('Configurar Partido / Plan');

      fireEvent.click(screen.getByRole('button', { name: 'Crear Plan General' }));

      expect(await screen.findByText('Pantalla del tracker')).toBeInTheDocument();
      const [, payload] = vi.mocked(api.post).mock.calls[0];
      expect(payload).not.toHaveProperty('playerId');
    });
  });
});

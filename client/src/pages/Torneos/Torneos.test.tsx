import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen, fireEvent, within } from '@testing-library/react';
import { Routes, Route } from 'react-router-dom';
import { api } from '../../api/axios';
import { ENDPOINTS } from '../../api/endpoints';
import { APP_ROUTES } from '../../constants/routes';
import { useAuthStore } from '../../store/authStore';
import { loginAs, renderWithProviders } from '../../test/utils';
import { Torneos } from './Torneos';

// Se mockea el `api` de bajo nivel (la frontera del sistema) y no los servicios,
// para que estos tests sigan valiendo cuando el acceso a datos migre a servicios.
vi.mock('../../api/axios', () => ({
  api: {
    get: vi.fn(),
  },
}));

const makeTournament = (overrides: Record<string, unknown> = {}) => ({
  id: 't0',
  name: 'Torneo',
  dateStart: '2026-11-20T10:00:00.000Z',
  numPlayers: 16,
  typeTournament: 'Interno',
  levelTournament: 'Avanzado',
  rounds: 'GruposKnockout',
  status: 'Programado',
  clubId: 'club-1',
  club: { name: 'Club Norte' },
  ...overrides,
});

const OPEN = makeTournament({ id: 't1', name: 'Open Primavera' });
const LIGA = makeTournament({
  id: 't2',
  name: 'Liga Invierno',
  status: 'Completado',
  rounds: 'Liga',
  levelTournament: null,
  typeTournament: null,
  club: null,
  clubId: null,
});
const NO_ROUNDS = makeTournament({ id: 't3', name: 'Copa Libre', rounds: null, status: null });

const serve = (tournaments: unknown = [OPEN, LIGA, NO_ROUNDS]) => {
  vi.mocked(api.get).mockResolvedValue({ data: { success: true, data: tournaments } } as never);
};

const renderPage = () =>
  renderWithProviders(
    <Routes>
      <Route path={APP_ROUTES.HOME} element={<Torneos />} />
      <Route path={APP_ROUTES.TORNEOS.NEW} element={<div>Pantalla de torneo nuevo</div>} />
      <Route path={APP_ROUTES.TORNEOS.EXCEL_CREATOR} element={<div>Pantalla de excel</div>} />
      <Route path={APP_ROUTES.TORNEOS.DETAILS_PATH} element={<div>Pantalla de torneo</div>} />
    </Routes>,
  );

const renderLoaded = async () => {
  const view = renderPage();
  await screen.findByRole('heading', { name: 'Torneos' });
  return view;
};

const cardOf = (name: string) => screen.getByText(name).closest('[class*="mantine-Card-root"]') as HTMLElement;

describe('Torneos', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useAuthStore.setState({ token: null, user: null, isAuthenticated: false });
    serve();
    loginAs({ role: 'AdminClub' });
  });

  describe('listado', () => {
    it('pide los torneos y muestra una tarjeta por cada uno', async () => {
      await renderLoaded();

      expect(api.get).toHaveBeenCalledWith(ENDPOINTS.TOURNAMENTS.BASE);
      expect(screen.getByText('Open Primavera')).toBeInTheDocument();
      expect(screen.getByText('Liga Invierno')).toBeInTheDocument();
      expect(screen.getByText('Copa Libre')).toBeInTheDocument();
    });

    it('muestra club, plazas, nivel, tipo y formato de un torneo completo', async () => {
      await renderLoaded();

      const card = within(cardOf('Open Primavera'));
      expect(card.getByText('Programado')).toBeInTheDocument();
      expect(card.getByText('20 nov 2026')).toBeInTheDocument();
      expect(card.getByText('Club Norte')).toBeInTheDocument();
      expect(card.getByText('Plazas: 16 max.')).toBeInTheDocument();
      expect(card.getByText('Avanzado · Interno')).toBeInTheDocument();
      expect(card.getByText('Grupos + Elim.')).toBeInTheDocument();
    });

    it('usa valores por defecto cuando faltan datos', async () => {
      await renderLoaded();

      const sinClub = within(cardOf('Liga Invierno'));
      expect(sinClub.getByText('Torneo Global / SaaS')).toBeInTheDocument();
      expect(sinClub.getByText('Mixto · Interno')).toBeInTheDocument();
      expect(sinClub.getByText('Liga')).toBeInTheDocument();

      const sinFormato = within(cardOf('Copa Libre'));
      expect(sinFormato.getByText('Desconocido')).toBeInTheDocument();
      expect(sinFormato.getByText('Por definir')).toBeInTheDocument();
    });

    it('avisa cuando no hay torneos', async () => {
      serve([]);

      await renderLoaded();

      expect(screen.getByText('No se han encontrado torneos con estos filtros.')).toBeInTheDocument();
    });

    it('trata como vacia una respuesta que no es una lista', async () => {
      serve({ no: 'lista' });

      await renderLoaded();

      expect(screen.getByText('No se han encontrado torneos con estos filtros.')).toBeInTheDocument();
    });

    it('no rompe si falla la carga', async () => {
      const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
      vi.mocked(api.get).mockRejectedValue(new Error('red caida'));

      await renderLoaded();

      expect(screen.getByText('No se han encontrado torneos con estos filtros.')).toBeInTheDocument();
      expect(consoleError).toHaveBeenCalled();
    });

    it('pulsar "Ver Detalles" lleva al torneo', async () => {
      await renderLoaded();

      fireEvent.click(within(cardOf('Open Primavera')).getByRole('button', { name: 'Ver Detalles' }));

      expect(await screen.findByText('Pantalla de torneo')).toBeInTheDocument();
    });
  });

  describe('busqueda, filtro y paginacion', () => {
    it('filtra por nombre sin distinguir mayusculas', async () => {
      await renderLoaded();

      fireEvent.change(screen.getByPlaceholderText('Buscar por nombre...'), {
        target: { value: 'LIGA' },
      });

      expect(screen.getByText('Liga Invierno')).toBeInTheDocument();
      expect(screen.queryByText('Open Primavera')).not.toBeInTheDocument();
    });

    it('filtra por estado, ofreciendo solo los estados que existen', async () => {
      await renderLoaded();

      fireEvent.click(screen.getByRole('combobox'));
      fireEvent.click(await screen.findByRole('option', { name: 'Completado', hidden: true }));

      expect(screen.getByText('Liga Invierno')).toBeInTheDocument();
      expect(screen.queryByText('Open Primavera')).not.toBeInTheDocument();
      expect(screen.queryByRole('option', { name: 'Cancelado', hidden: true })).not.toBeInTheDocument();
    });

    it('pagina de diez en diez', async () => {
      serve(
        Array.from({ length: 12 }, (_, index) =>
          makeTournament({ id: `m${index + 1}`, name: `Torneo ${String(index + 1).padStart(2, '0')}` }),
        ),
      );
      await renderLoaded();

      expect(screen.getByText('Torneo 10')).toBeInTheDocument();
      expect(screen.queryByText('Torneo 11')).not.toBeInTheDocument();

      fireEvent.click(screen.getByRole('button', { name: '2' }));

      expect(screen.getByText('Torneo 11')).toBeInTheDocument();
      expect(screen.queryByText('Torneo 01')).not.toBeInTheDocument();
    });
  });

  describe('crear torneo', () => {
    it.each(['AdminClub', 'SuperAdmin'])('un %s ve los botones de crear', async (role) => {
      loginAs({ role });

      await renderLoaded();

      expect(screen.getByRole('button', { name: 'Crear Torneo' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Crear Torneo Excel' })).toBeInTheDocument();
    });

    it('un Player no puede crear torneos', async () => {
      loginAs({ role: 'Player' });

      await renderLoaded();

      expect(screen.queryByRole('button', { name: 'Crear Torneo' })).not.toBeInTheDocument();
      expect(screen.queryByRole('button', { name: 'Crear Torneo Excel' })).not.toBeInTheDocument();
    });

    it('"Crear Torneo" lleva al formulario de alta', async () => {
      await renderLoaded();

      fireEvent.click(screen.getByRole('button', { name: 'Crear Torneo' }));

      expect(await screen.findByText('Pantalla de torneo nuevo')).toBeInTheDocument();
    });

    it('"Crear Torneo Excel" lleva al creador desde Excel', async () => {
      await renderLoaded();

      fireEvent.click(screen.getByRole('button', { name: 'Crear Torneo Excel' }));

      expect(await screen.findByText('Pantalla de excel')).toBeInTheDocument();
    });
  });
});

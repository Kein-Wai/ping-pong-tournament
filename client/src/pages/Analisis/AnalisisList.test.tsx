import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { screen, fireEvent, waitFor } from '@testing-library/react';
import { Routes, Route } from 'react-router-dom';
import { api } from '../../api/axios';
import { ENDPOINTS } from '../../api/endpoints';
import { APP_ROUTES } from '../../constants/routes';
import { normalizeIds, renderWithProviders } from '../../test/utils';
import { AnalisisList } from './AnalisisList';

// Se mockea el `api` de bajo nivel (la frontera del sistema) y no los servicios,
// para que estos tests sigan valiendo cuando el acceso a datos migre a servicios.
vi.mock('../../api/axios', () => ({
  api: {
    get: vi.fn(),
    post: vi.fn(),
  },
}));

const envelope = (data: unknown) => ({ data: { success: true, data } });

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

const DONE = makeMatch({ id: 'm1', opponentName: 'Luis Pérez', status: 'Completado' });
const PLAYING = makeMatch({ id: 'm2', opponentName: 'Marta Gil', status: 'Iniciado' });
const PLAN = makeMatch({ id: 'm3', opponentName: 'Carlos Ruiz', status: 'Programado', date: null });

const SEASONS = [
  { id: 's1', name: 'Temporada 2025/2026', isCurrent: false },
  { id: 's2', name: 'Temporada 2026/2027', isCurrent: true },
];

interface Served {
  matches?: unknown[];
  seasons?: unknown[];
}

const serve = ({ matches = [DONE, PLAYING, PLAN], seasons = SEASONS }: Served = {}) => {
  vi.mocked(api.get).mockImplementation((async (url: string) => {
    if (url === ENDPOINTS.MANUAL_MATCHES.BASE) return envelope(matches);
    if (url === ENDPOINTS.SEASONS.BASE) return envelope(seasons);
    throw new Error(`Peticion no esperada: ${url}`);
  }) as never);
};

const renderPage = () =>
  renderWithProviders(
    <Routes>
      <Route path={APP_ROUTES.HOME} element={<AnalisisList />} />
      <Route path={APP_ROUTES.ANALISIS.TRACKER_PATH} element={<div>Pantalla del tracker</div>} />
    </Routes>,
  );

const renderLoaded = async () => {
  const view = renderPage();
  await screen.findByText('Temporada 2026/2027');
  return view;
};

// El SegmentedControl genera ids y `name` con mayusculas que normalizeIds no cubre.
const stableHtml = (html: string) => normalizeIds(html).replace(/mantine-[a-z0-9]{9,}/g, 'mantine-id');

const cards = () => screen.queryAllByText(/^vs /);

const openCreateModal = async () => {
  fireEvent.click(screen.getByRole('button', { name: 'Nuevo Registro' }));
  await screen.findByText('Configurar Partido / Plan');
};

describe('AnalisisList', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Solo se congela la fecha: la fecha por defecto del modal es «hoy».
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date('2026-10-15T12:00:00.000Z'));
    serve();
    vi.mocked(api.post).mockResolvedValue(envelope({ id: 'nuevo-1' }) as never);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('carga', () => {
    it('pide los analisis y las temporadas y muestra la temporada vigente', async () => {
      await renderLoaded();

      const urls = vi.mocked(api.get).mock.calls.map(([url]) => url);
      expect(urls).toHaveLength(2);
      expect(api.get).toHaveBeenCalledWith(ENDPOINTS.MANUAL_MATCHES.BASE, undefined);
      expect(api.get).toHaveBeenCalledWith(ENDPOINTS.SEASONS.BASE, undefined);
    });

    it('muestra «Cargando...» si ninguna temporada esta vigente', async () => {
      serve({ seasons: [SEASONS[0]] });

      renderPage();

      expect(await screen.findByText('vs Luis Pérez')).toBeInTheDocument();
      expect(screen.getByText('Cargando...')).toBeInTheDocument();
    });

    it('si falla la carga deja la lista vacia', async () => {
      const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
      vi.mocked(api.get).mockRejectedValue(new Error('red caida'));

      renderPage();

      expect(await screen.findByText('No hay partidos registrados.')).toBeInTheDocument();
      expect(consoleError).toHaveBeenCalled();
    });
  });

  describe('listado', () => {
    it('la pestaña de analisis muestra los partidos que no estan programados', async () => {
      await renderLoaded();

      expect(cards().map((card) => card.textContent)).toEqual(['vs Luis Pérez', 'vs Marta Gil']);
    });

    it('la pestaña de planificaciones muestra solo los programados', async () => {
      await renderLoaded();

      fireEvent.click(screen.getByRole('tab', { name: /Planificaciones Futuras/ }));

      expect(cards().map((card) => card.textContent)).toEqual(['vs Carlos Ruiz']);
      expect(screen.getByText(/Sin fecha/)).toBeInTheDocument();
    });

    it('cada tarjeta muestra fecha, formato y tipo, y el boton segun el estado', async () => {
      await renderLoaded();

      expect(
        screen.getAllByText(/1\/10\/2026 · Formato: Individual · Amistoso \(Rapido\)/),
      ).toHaveLength(2);
      expect(screen.getByRole('button', { name: 'Ver Reporte' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Continuar Arbitraje' })).toBeInTheDocument();
      fireEvent.click(screen.getByRole('tab', { name: /Planificaciones Futuras/ }));
      expect(screen.getByRole('button', { name: 'Planificar / Jugar' })).toBeInTheDocument();
    });

    it('el boton de una tarjeta lleva al tracker del partido', async () => {
      await renderLoaded();

      fireEvent.click(screen.getByRole('button', { name: 'Ver Reporte' }));

      expect(await screen.findByText('Pantalla del tracker')).toBeInTheDocument();
    });

    it('filtra por rival sin distinguir mayusculas', async () => {
      await renderLoaded();

      fireEvent.change(screen.getByPlaceholderText('Buscar rival...'), {
        target: { value: 'MARTA' },
      });

      expect(cards().map((card) => card.textContent)).toEqual(['vs Marta Gil']);
    });

    it('avisa cuando no hay partidos ni planificaciones', async () => {
      serve({ matches: [] });
      await renderLoaded();

      expect(screen.getByText('No hay partidos registrados.')).toBeInTheDocument();
      fireEvent.click(screen.getByRole('tab', { name: /Planificaciones Futuras/ }));
      expect(screen.getByText('No hay planificaciones registrados.')).toBeInTheDocument();
    });

    it('pagina de ocho en ocho', async () => {
      serve({
        matches: Array.from({ length: 9 }, (_, index) =>
          makeMatch({ id: `m${index}`, opponentName: `Rival ${index + 1}` }),
        ),
      });
      await renderLoaded();
      expect(cards()).toHaveLength(8);

      fireEvent.click(screen.getByRole('button', { name: '2' }));

      expect(cards().map((card) => card.textContent)).toEqual(['vs Rival 9']);
    });
  });

  describe('crear un registro', () => {
    it('por defecto crea un plan sin rival con los valores iniciales y abre su tracker', async () => {
      await renderLoaded();
      await openCreateModal();

      fireEvent.click(screen.getByRole('button', { name: 'Crear Plan General' }));

      expect(await screen.findByText('Pantalla del tracker')).toBeInTheDocument();
      expect(api.post).toHaveBeenCalledWith(
        ENDPOINTS.MANUAL_MATCHES.BASE,
        {
          opponentName: 'Rival por determinar',
          matchType: 'Amistoso',
          location: 'Casa',
          format: 'Individual',
          analysisType: 'Rapido',
          opponentHand: null,
          opponentStyle: null,
          opponentLevel: null,
          opponentRubberForehand: null,
          opponentRubberBackhand: null,
          status: 'Programado',
          setsToWin: 3,
          date: '2026-10-15T12:00:00.000Z',
        },
        undefined,
      );
    });

    it('para jugar ya exige el nombre del rival y envia el estado Iniciado', async () => {
      await renderLoaded();
      await openCreateModal();
      fireEvent.click(screen.getByText('Empezar a Jugar Ya'));

      const start = await screen.findByRole('button', { name: 'Ir a la mesa' });
      expect(start).toBeDisabled();
      fireEvent.change(screen.getByLabelText(/Nombre del Rival/), { target: { value: 'Pedro' } });
      expect(start).toBeEnabled();
      fireEvent.click(start);

      expect(await screen.findByText('Pantalla del tracker')).toBeInTheDocument();
      expect(api.post).toHaveBeenCalledWith(
        ENDPOINTS.MANUAL_MATCHES.BASE,
        expect.objectContaining({
          opponentName: 'Pedro',
          status: 'Iniciado',
          analysisType: 'Rapido',
          setsToWin: 3,
        }),
        undefined,
      );
    });

    it('si falla la creacion se queda en la pantalla y vuelve a habilitar el boton', async () => {
      const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
      vi.mocked(api.post).mockRejectedValue(new Error('500'));
      await renderLoaded();
      await openCreateModal();

      fireEvent.click(screen.getByRole('button', { name: 'Crear Plan General' }));

      await waitFor(() => expect(consoleError).toHaveBeenCalled());
      expect(screen.queryByText('Pantalla del tracker')).not.toBeInTheDocument();
      await waitFor(() =>
        expect(screen.getByRole('button', { name: 'Crear Plan General' })).toBeEnabled(),
      );
    });
  });

  describe('estructura del DOM', () => {
    // Verificador mecanico de la regla de oro del JSX.
    it('el listado y el modal de creacion conservan su estructura', async () => {
      const { container } = await renderLoaded();
      expect(stableHtml(container.innerHTML)).toMatchSnapshot('listado');

      await openCreateModal();
      const body = document.querySelector('.mantine-Modal-body') as HTMLElement;
      expect(stableHtml(body.innerHTML)).toMatchSnapshot('modal');
    });
  });
});

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Routes, Route } from 'react-router-dom';
import { api } from '../../api/axios';
import { ENDPOINTS } from '../../api/endpoints';
import { APP_ROUTES } from '../../constants/routes';
import { chooseOption, normalizeIds, renderWithProviders } from '../../test/utils';
import { TorneoNuevo } from './TorneoNuevo';

// Se mockea el `api` de bajo nivel (la frontera del sistema) y no los servicios,
// para que estos tests sigan valiendo cuando el acceso a datos migre a servicios.
vi.mock('../../api/axios', () => ({
  api: {
    post: vi.fn(),
  },
}));

// Mantine genera ids y `name` con mayusculas que normalizeIds no cubre.
const stableHtml = (html: string) =>
  normalizeIds(html).replace(/mantine-[a-z0-9]{9,}/g, 'mantine-id');

const renderPage = () =>
  renderWithProviders(
    <Routes>
      <Route path={APP_ROUTES.TORNEOS.NEW} element={<TorneoNuevo />} />
      <Route path={APP_ROUTES.TORNEOS.LIST} element={<div>Pantalla de torneos</div>} />
      <Route path={APP_ROUTES.TORNEOS.DETAILS_PATH} element={<div>Pantalla de un torneo</div>} />
    </Routes>,
    { initialEntries: [APP_ROUTES.TORNEOS.NEW] },
  );

const NOW = '2026-10-15T12:00:00.000Z';

const fillName = (value = 'Open de Primavera') =>
  fireEvent.change(screen.getByLabelText(/Nombre del Torneo/), { target: { value } });

const submit = () =>
  fireEvent.submit(screen.getByRole('button', { name: 'Guardar y Crear Torneo' }).closest('form')!);

const sentPayload = () => vi.mocked(api.post).mock.calls[0][1];

const RESPONSE = { data: { success: true, message: 'Torneo creado', data: { id: 't99' } } };

describe('TorneoNuevo', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Sin fecha elegida el torneo usa «hoy»: se congela solo Date.
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date(NOW));
    // La API responde FUERA del sobre { success, data }: { message, tournament }.
    vi.mocked(api.post).mockResolvedValue(RESPONSE as never);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('formulario', () => {
    it('arranca con fase de grupos y eliminatorias', () => {
      renderPage();

      expect(screen.getByText('Configuración de Grupos')).toBeInTheDocument();
      expect(screen.getByText('Configuración de Llaves (Cuadro)')).toBeInTheDocument();
      expect(screen.getByLabelText(/Cantidad de Grupos/)).toBeInTheDocument();
      expect(screen.getByLabelText(/Clasificados por grupo/)).toBeInTheDocument();
      expect(screen.getByLabelText(/Total Jugadores/)).toHaveValue('16');
    });

    it('una liga solo configura grupos de un unico grupo y ajusta a 10 jugadores', () => {
      renderPage();

      chooseOption(/Estructura de Rondas/, 'Liga (Todos contra Todos)');

      expect(screen.getByText('Configuración de Grupos')).toBeInTheDocument();
      expect(screen.queryByLabelText(/Cantidad de Grupos/)).not.toBeInTheDocument();
      expect(screen.queryByText('Configuración de Llaves (Cuadro)')).not.toBeInTheDocument();
      expect(screen.getByLabelText(/Total Jugadores/)).toHaveValue('10');
    });

    it('una eliminatoria directa solo configura llaves y vuelve a 16 jugadores', () => {
      renderPage();
      chooseOption(/Estructura de Rondas/, 'Liga (Todos contra Todos)');

      chooseOption(/Estructura de Rondas/, 'Eliminatoria Directa (Knockout)');

      expect(screen.queryByText('Configuración de Grupos')).not.toBeInTheDocument();
      expect(screen.getByText('Configuración de Llaves (Cuadro)')).toBeInTheDocument();
      expect(screen.queryByLabelText(/Clasificados por grupo/)).not.toBeInTheDocument();
      expect(screen.getByLabelText(/Total Jugadores/)).toHaveValue('16');
    });

    it('«Volver a Torneos» regresa al listado', async () => {
      renderPage();

      fireEvent.click(screen.getByRole('button', { name: 'Volver a Torneos' }));

      expect(await screen.findByText('Pantalla de torneos')).toBeInTheDocument();
    });
  });

  describe('crear el torneo', () => {
    it('fase de grupos + eliminatorias: envia los valores por defecto del formato', async () => {
      renderPage();
      fillName();

      submit();

      await waitFor(() =>
        expect(api.post).toHaveBeenCalledWith(ENDPOINTS.TOURNAMENTS.BASE, expect.any(Object), undefined),
      );
      expect(sentPayload()).toEqual({
        name: 'Open de Primavera',
        dateStart: NOW,
        numPlayers: 16,
        typeTournament: 'Interno',
        levelTournament: 'Mixto',
        rounds: 'GruposKnockout',
        numGroup: 4,
        numGroupPlayers: 4,
        playersKnockout: 2,
        typeKnockout: 'LlaveA',
        sortKnockout: 'Siembra',
        allPos: true,
        sortGroups: 'Snake',
        setsToWinGroup: 2,
        setsToWinKnockout: 3,
      });
    });

    it('liga: un solo grupo con todos los jugadores y sin datos de eliminatorias', async () => {
      renderPage();
      fillName('Liga Invierno');
      chooseOption(/Estructura de Rondas/, 'Liga (Todos contra Todos)');

      submit();

      await waitFor(() => expect(api.post).toHaveBeenCalled());
      expect(sentPayload()).toEqual({
        name: 'Liga Invierno',
        dateStart: NOW,
        numPlayers: 10,
        typeTournament: 'Interno',
        levelTournament: 'Mixto',
        rounds: 'TodosvsTodos',
        numGroup: 1,
        numGroupPlayers: 10,
        setsToWinGroup: 2,
        playersKnockout: null,
        typeKnockout: null,
        sortKnockout: null,
        allPos: null,
        sortGroups: null,
        setsToWinKnockout: null,
      });
    });

    it('eliminatoria directa: sin datos de grupos', async () => {
      renderPage();
      fillName('Copa Directa');
      chooseOption(/Estructura de Rondas/, 'Eliminatoria Directa (Knockout)');

      submit();

      await waitFor(() => expect(api.post).toHaveBeenCalled());
      expect(sentPayload()).toEqual({
        name: 'Copa Directa',
        dateStart: NOW,
        numPlayers: 16,
        typeTournament: 'Interno',
        levelTournament: 'Mixto',
        rounds: 'Knockout',
        numGroup: null,
        numGroupPlayers: null,
        playersKnockout: null,
        typeKnockout: 'LlaveA',
        sortKnockout: 'Siembra',
        allPos: true,
        setsToWinKnockout: 3,
      });
    });

    it('envia las opciones que el usuario cambia', async () => {
      renderPage();
      fillName();
      chooseOption(/^Nivel/, 'Avanzado');
      chooseOption(/^Acceso/, 'Abierto');
      fireEvent.change(screen.getByLabelText(/Cantidad de Grupos/), { target: { value: '6' } });
      chooseOption(/Sets para ganar en Grupos/, '3 Sets (Al mejor de 5 sets)');
      chooseOption(/Tipo de Llaves/, 'Llave A y B (Consolación)');
      chooseOption(/Ordenamiento en el Cuadro/, 'Sorteo Aleatorio');
      chooseOption(/Sets para ganar en Eliminatorias/, '4 Sets (Al mejor de 7 sets)');
      fireEvent.click(screen.getByRole('switch', { name: /Jugar todos los puestos/ }));

      submit();

      await waitFor(() => expect(api.post).toHaveBeenCalled());
      expect(sentPayload()).toMatchObject({
        levelTournament: 'Avanzado',
        typeTournament: 'Abierto',
        numGroup: 6,
        setsToWinGroup: 3,
        typeKnockout: 'LlaveAB',
        sortKnockout: 'Aleatorio',
        setsToWinKnockout: 4,
        allPos: false,
      });
    });

    it('usa la fecha de inicio que escribe el usuario', async () => {
      const user = userEvent.setup();
      renderPage();
      fillName();
      await user.type(screen.getByLabelText(/Fecha de Inicio/), 'October 20, 2026');

      submit();

      await waitFor(() => expect(api.post).toHaveBeenCalled());
      expect(sentPayload()).toMatchObject({ dateStart: '2026-10-20T00:00:00.000Z' });
    });

    it('al crearse lleva al detalle del nuevo torneo', async () => {
      renderPage();
      fillName();

      submit();

      expect(await screen.findByText('Pantalla de un torneo')).toBeInTheDocument();
    });

    it('si la respuesta no trae el torneo se queda en el formulario', async () => {
      vi.mocked(api.post).mockResolvedValue({ data: { success: true, message: 'ok' } } as never);
      renderPage();
      fillName();

      submit();

      await waitFor(() => expect(api.post).toHaveBeenCalled());
      await waitFor(() =>
        expect(screen.getByRole('button', { name: 'Guardar y Crear Torneo' })).toBeEnabled(),
      );
      expect(screen.queryByText('Pantalla de un torneo')).not.toBeInTheDocument();
    });

    it('si falla la creacion se queda en el formulario y vuelve a habilitar el boton', async () => {
      const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
      vi.mocked(api.post).mockRejectedValue(new Error('400'));
      renderPage();
      fillName();

      submit();

      await waitFor(() => expect(consoleError).toHaveBeenCalled());
      expect(screen.getByRole('button', { name: 'Guardar y Crear Torneo' })).toBeEnabled();
      expect(screen.queryByText('Pantalla de un torneo')).not.toBeInTheDocument();
    });
  });

  describe('estructura del DOM', () => {
    // Verificador mecanico de la regla de oro del JSX.
    it('el formulario por defecto conserva su estructura', () => {
      const { container } = renderPage();

      expect(stableHtml(container.innerHTML)).toMatchSnapshot();
    });
  });
});

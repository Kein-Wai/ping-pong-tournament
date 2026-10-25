import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { screen, fireEvent, waitFor } from '@testing-library/react';
import { Routes, Route } from 'react-router-dom';
import { api } from '../../api/axios';
import { ENDPOINTS } from '../../api/endpoints';
import { APP_ROUTES } from '../../constants/routes';
import { chooseOption, normalizeIds, renderWithProviders } from '../../test/utils';
import { ExcelTournamentCreator } from './ExcelTournamentCreator';

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
      <Route path={APP_ROUTES.TORNEOS.EXCEL_CREATOR} element={<ExcelTournamentCreator />} />
      <Route path={APP_ROUTES.TORNEOS.LIST} element={<div>Pantalla de torneos</div>} />
    </Routes>,
    { initialEntries: [APP_ROUTES.TORNEOS.EXCEL_CREATOR] },
  );

const next = () => fireEvent.click(screen.getByRole('button', { name: 'Siguiente Paso' }));

const setTotalPlayers = (value: string) =>
  fireEvent.change(screen.getByLabelText(/Total de Jugadores/), { target: { value } });

const fillStep1 = (name = 'Open de Invierno') => {
  fireEvent.change(screen.getByLabelText(/Nombre del Torneo/), { target: { value: name } });
};

const fillPlayers = (names: string[]) =>
  names.forEach((name, index) =>
    fireEvent.change(screen.getByLabelText(new RegExp(`^Jugador ${index + 1}`)), {
      target: { value: name },
    }),
  );

// Avanza por el asistente hasta la pantalla de revision con 2 jugadores.
const reachReview = (names = ['Ana', 'Luis ']) => {
  fillStep1();
  setTotalPlayers(String(names.length));
  next();
  fillPlayers(names);
  fireEvent.click(screen.getByRole('button', { name: 'Revisar Inscripción' }));
};

const openConfirm = async () => {
  fireEvent.click(screen.getByRole('button', { name: 'Generar Excel Oficial' }));
  await screen.findByText('Confirmar Sorteo');
};

describe('ExcelTournamentCreator', () => {
  let anchorClick: ReturnType<typeof vi.spyOn>;
  let createObjectURL: ReturnType<typeof vi.fn>;
  let revokeObjectURL: ReturnType<typeof vi.fn>;
  let downloaded: { download: string | null; href: string } | null;

  beforeEach(() => {
    vi.clearAllMocks();
    // La fecha por defecto es «hoy»: se congela solo Date.
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date('2026-10-15T12:00:00.000Z'));
    vi.mocked(api.post).mockResolvedValue({ data: new Blob(['xlsx']) } as never);

    // jsdom no implementa la descarga: se captura el enlace que crea la pantalla.
    downloaded = null;
    createObjectURL = vi.fn(() => 'blob:excel-1');
    revokeObjectURL = vi.fn();
    Object.defineProperty(window.URL, 'createObjectURL', { value: createObjectURL, configurable: true, writable: true });
    Object.defineProperty(window.URL, 'revokeObjectURL', { value: revokeObjectURL, configurable: true, writable: true });
    anchorClick = vi
      .spyOn(HTMLAnchorElement.prototype, 'click')
      .mockImplementation(function (this: HTMLAnchorElement) {
        downloaded = { download: this.getAttribute('download'), href: this.href };
      });
  });

  afterEach(() => {
    anchorClick.mockRestore();
    vi.useRealTimers();
  });

  describe('paso 1: configuracion', () => {
    it('muestra los valores por defecto y no deja avanzar sin nombre', () => {
      renderPage();

      expect(screen.getByLabelText(/Fecha/)).toHaveValue('2026-10-15');
      expect(screen.getByLabelText(/Total de Jugadores/)).toHaveValue('8');
      expect(screen.getByLabelText(/Jugadores por Grupo/)).toHaveValue('4');
      expect(screen.getByLabelText(/Clasifican al Cuadro/)).toHaveValue('2');
      expect(screen.getByRole('button', { name: 'Siguiente Paso' })).toBeDisabled();
    });

    it('con nombre y al menos dos jugadores se puede avanzar', () => {
      renderPage();

      fillStep1();

      expect(screen.getByRole('button', { name: 'Siguiente Paso' })).toBeEnabled();
    });

    it('«Volver a Torneos» regresa al listado', async () => {
      renderPage();

      fireEvent.click(screen.getByRole('button', { name: 'Volver a Torneos' }));

      expect(await screen.findByText('Pantalla de torneos')).toBeInTheDocument();
    });
  });

  describe('paso 2: participantes', () => {
    it('pide un nombre por cada jugador y marca al cabeza de serie', () => {
      renderPage();
      fillStep1();
      next();

      expect(screen.getAllByLabelText(/^Jugador \d/)).toHaveLength(8);
      expect(screen.getByLabelText(/^Jugador 1 👑/)).toBeInTheDocument();
    });

    it('la lista se ajusta al total de jugadores', () => {
      renderPage();
      fillStep1();
      setTotalPlayers('4');
      next();

      expect(screen.getAllByLabelText(/^Jugador \d/)).toHaveLength(4);
    });

    it('no deja revisar hasta que todos tienen nombre', () => {
      renderPage();
      fillStep1();
      setTotalPlayers('2');
      next();
      const review = screen.getByRole('button', { name: 'Revisar Inscripción' });
      expect(review).toBeDisabled();

      fillPlayers(['Ana']);
      expect(review).toBeDisabled();

      fillPlayers(['Ana', 'Luis']);
      expect(review).toBeEnabled();
    });

    it('«Atrás» vuelve a la configuracion conservando los datos', () => {
      renderPage();
      fillStep1('Copa Test');
      next();

      fireEvent.click(screen.getByRole('button', { name: 'Atrás' }));

      expect(screen.getByLabelText(/Nombre del Torneo/)).toHaveValue('Copa Test');
    });
  });

  describe('paso 3: generar el Excel', () => {
    it('resume el sorteo con el numero de jugadores y el tamaño de grupo', () => {
      renderPage();
      reachReview();

      expect(screen.getByText('Todo listo para el Sorteo')).toBeInTheDocument();
      expect(screen.getByText(/distribuirá a los 2 jugadores en grupos de 4/)).toBeInTheDocument();
    });

    it('pide confirmacion mostrando el nombre del torneo', async () => {
      renderPage();
      reachReview();

      await openConfirm();

      expect(screen.getByText('Open de Invierno')).toBeInTheDocument();
      expect(api.post).not.toHaveBeenCalled();
    });

    it('cancelar no genera nada', async () => {
      renderPage();
      reachReview();
      await openConfirm();

      fireEvent.click(screen.getByRole('button', { name: 'Cancelar' }));

      await waitFor(() => expect(screen.queryByText('Confirmar Sorteo')).not.toBeInTheDocument());
      expect(api.post).not.toHaveBeenCalled();
    });

    it('envia la configuracion y los nombres sin espacios sobrantes pidiendo un blob', async () => {
      renderPage();
      reachReview();
      await openConfirm();

      fireEvent.click(screen.getByRole('button', { name: 'Sí, Descargar Excel' }));

      await waitFor(() =>
        expect(api.post).toHaveBeenCalledWith(
          ENDPOINTS.TOURNAMENTS.GENERATE_EXCEL,
          {
            tournamentInfo: {
              name: 'Open de Invierno',
              dateStart: '2026-10-15',
              levelTournament: 'General',
              numPlayers: 2,
              numGroupPlayers: 4,
              playersKnockout: 2,
            },
            players: [{ name: 'Ana' }, { name: 'Luis' }],
          },
          { responseType: 'blob' },
        ),
      );
    });

    it('descarga el archivo con el nombre del torneo, libera la URL y vuelve al listado', async () => {
      renderPage();
      reachReview();
      await openConfirm();

      fireEvent.click(screen.getByRole('button', { name: 'Sí, Descargar Excel' }));

      expect(await screen.findByText('Pantalla de torneos')).toBeInTheDocument();
      expect(createObjectURL).toHaveBeenCalledWith(expect.any(Blob));
      expect(downloaded).toEqual({
        download: 'Torneo_Open_de_Invierno.xlsx',
        href: 'blob:excel-1',
      });
      expect(revokeObjectURL).toHaveBeenCalledWith('blob:excel-1');
      expect(document.querySelector('a[download]')).toBeNull();
    });

    it('si falla la generacion no descarga nada y se queda en la confirmacion', async () => {
      const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
      vi.mocked(api.post).mockRejectedValue(new Error('500'));
      renderPage();
      reachReview();
      await openConfirm();

      fireEvent.click(screen.getByRole('button', { name: 'Sí, Descargar Excel' }));

      await waitFor(() => expect(consoleError).toHaveBeenCalled());
      expect(downloaded).toBeNull();
      expect(screen.getByText('Confirmar Sorteo')).toBeInTheDocument();
      expect(screen.queryByText('Pantalla de torneos')).not.toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Sí, Descargar Excel' })).toBeEnabled();
    });
  });

  describe('categoria', () => {
    it('la categoria elegida viaja en la configuracion', async () => {
      renderPage();
      chooseOption(/Categoría \/ Nivel/, 'Veteranos');
      reachReview();
      await openConfirm();

      fireEvent.click(screen.getByRole('button', { name: 'Sí, Descargar Excel' }));

      await waitFor(() => expect(api.post).toHaveBeenCalled());
      expect(vi.mocked(api.post).mock.calls[0][1]).toMatchObject({
        tournamentInfo: { levelTournament: 'Veteranos' },
      });
    });
  });

  describe('estructura del DOM', () => {
    // Verificador mecanico de la regla de oro del JSX.
    it('el primer paso conserva su estructura', () => {
      const { container } = renderPage();

      expect(stableHtml(container.innerHTML)).toMatchSnapshot();
    });
  });
});

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen, fireEvent, within } from '@testing-library/react';
import { api } from '../../api/axios';
import { ENDPOINTS } from '../../api/endpoints';
import { useAuthStore } from '../../store/authStore';
import { loginAs, renderWithProviders } from '../../test/utils';
import { Partidos } from './Partidos';

// Se mockea el `api` de bajo nivel (la frontera del sistema) y no los servicios,
// para que estos tests sigan valiendo cuando el acceso a datos migre a servicios.
vi.mock('../../api/axios', () => ({
  api: {
    get: vi.fn(),
  },
}));

const makeMatch = (overrides: Record<string, unknown> = {}) => ({
  id: 'm0',
  status: 'Completado',
  dateStart: '2026-10-01T10:00:00.000Z',
  tournament: { name: 'Liga Local' },
  playerOne: { id: 'p1', name: 'Luis', surname: 'Pérez', avatarUrl: null, club: { name: 'Club Norte' } },
  playerTwo: { id: 'p2', name: 'Marta', surname: 'Gil', avatarUrl: null, club: null },
  setOnePlayerOne: 11,
  setOnePlayerTwo: 5,
  setTwoPlayerOne: 11,
  setTwoPlayerTwo: 6,
  setThreePlayerOne: 11,
  setThreePlayerTwo: 7,
  setFourPlayerOne: null,
  setFourPlayerTwo: null,
  setFivePlayerOne: null,
  setFivePlayerTwo: null,
  setSixPlayerOne: null,
  setSixPlayerTwo: null,
  setSevenPlayerOne: null,
  setSevenPlayerTwo: null,
  ...overrides,
});

const serve = (matches: unknown[] = [makeMatch({ id: 'm1' })]) => {
  vi.mocked(api.get).mockResolvedValue({ data: { success: true, data: matches } } as never);
};

const renderLoaded = async () => {
  const view = renderWithProviders(<Partidos />);
  await screen.findByRole('heading', { name: 'Historial de Partidas' });
  return view;
};

const bodyRows = () => screen.getAllByRole('row').slice(1);

const openMatch = async (rowText: string) => {
  const row = screen.getByText(rowText).closest('tr') as HTMLElement;
  fireEvent.click(row.querySelector('.tabler-icon-eye')?.closest('button') as HTMLElement);
  await screen.findByText('Detalles del Encuentro');
};

describe('Partidos', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useAuthStore.setState({ token: null, user: null, isAuthenticated: false });
    serve();
    loginAs({ role: 'AdminClub' });
  });

  describe('listado', () => {
    it('pide los partidos y muestra torneo, jugadores y clubes', async () => {
      await renderLoaded();

      expect(api.get).toHaveBeenCalledWith(ENDPOINTS.MATCHES.BASE);
      const row = within(bodyRows()[0]);
      expect(row.getByText('Liga Local')).toBeInTheDocument();
      expect(row.getByText('Luis Pérez')).toBeInTheDocument();
      expect(row.getByText('Marta Gil')).toBeInTheDocument();
      expect(row.getByText('Club Norte')).toBeInTheDocument();
      expect(row.getByText('Libre')).toBeInTheDocument();
    });

    it('llama "Amistoso" a un partido sin torneo', async () => {
      serve([makeMatch({ id: 'm1', tournament: null })]);

      await renderLoaded();

      expect(within(bodyRows()[0]).getByText('Amistoso')).toBeInTheDocument();
    });

    it('ordena del partido mas reciente al mas antiguo', async () => {
      serve([
        makeMatch({ id: 'old', dateStart: '2026-01-01T10:00:00.000Z', tournament: { name: 'Antiguo' } }),
        makeMatch({ id: 'new', dateStart: '2026-10-01T10:00:00.000Z', tournament: { name: 'Reciente' } }),
        makeMatch({ id: 'mid', dateStart: '2026-05-01T10:00:00.000Z', tournament: { name: 'Medio' } }),
      ]);

      await renderLoaded();

      const names = bodyRows().map((row) => row.textContent ?? '');
      expect(names[0]).toContain('Reciente');
      expect(names[1]).toContain('Medio');
      expect(names[2]).toContain('Antiguo');
    });

    it('avisa cuando no hay partidos', async () => {
      serve([]);

      await renderLoaded();

      expect(screen.getByText('No se han encontrado partidos con este filtro.')).toBeInTheDocument();
    });

    it('no rompe si falla la carga', async () => {
      const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
      vi.mocked(api.get).mockRejectedValue(new Error('red caida'));

      await renderLoaded();

      expect(screen.getByText('No se han encontrado partidos con este filtro.')).toBeInTheDocument();
      expect(consoleError).toHaveBeenCalled();
    });
  });

  describe('busqueda y paginacion', () => {
    it('filtra por jugador o torneo sin distinguir mayusculas', async () => {
      serve([
        makeMatch({ id: 'a', tournament: { name: 'Liga Local' } }),
        makeMatch({
          id: 'b',
          tournament: { name: 'Copa Verano' },
          playerOne: { id: 'p3', name: 'Zoe', surname: null, avatarUrl: null, club: null },
        }),
      ]);
      await renderLoaded();

      fireEvent.change(screen.getByPlaceholderText('Buscar por jugador o torneo...'), {
        target: { value: 'COPA' },
      });

      expect(screen.getByText('Copa Verano')).toBeInTheDocument();
      expect(screen.queryByText('Liga Local')).not.toBeInTheDocument();
    });

    it('pagina de diez en diez', async () => {
      serve(
        Array.from({ length: 12 }, (_, index) =>
          makeMatch({
            id: `m${index + 1}`,
            dateStart: `2026-10-${String(index + 1).padStart(2, '0')}T10:00:00.000Z`,
            tournament: { name: `Torneo ${String(index + 1).padStart(2, '0')}` },
          }),
        ),
      );
      await renderLoaded();
      expect(bodyRows()).toHaveLength(10);

      fireEvent.click(screen.getByRole('button', { name: '2' }));

      expect(bodyRows()).toHaveLength(2);
    });
  });

  describe('segun el rol y el club', () => {
    it('un AdminClub sin club no pide los partidos y ve la lista vacia', async () => {
      loginAs({ role: 'AdminClub', clubId: null });

      await renderLoaded();

      expect(api.get).not.toHaveBeenCalled();
      expect(screen.getByText('No se han encontrado partidos con este filtro.')).toBeInTheDocument();
    });

    it('un AdminClub con club pide los partidos', async () => {
      await renderLoaded();

      expect(api.get).toHaveBeenCalledWith(ENDPOINTS.MATCHES.BASE);
    });

    it.each([
      ['Player', 'Player sin club'],
      ['SuperAdmin', 'SuperAdmin sin club'],
    ])('un %s sin club si pide los partidos (%s)', async (role) => {
      loginAs({ role, clubId: null });

      await renderLoaded();

      expect(api.get).toHaveBeenCalledWith(ENDPOINTS.MATCHES.BASE);
      expect(screen.getByText('Liga Local')).toBeInTheDocument();
    });
  });

  describe('detalle de un partido', () => {
    it('muestra el estado y el marcador de los tres primeros sets', async () => {
      await renderLoaded();

      await openMatch('Liga Local');

      expect(screen.getByText('Marcador por Sets')).toBeInTheDocument();
      expect(screen.getByText('Set 1: 11 - 5')).toBeInTheDocument();
      expect(screen.getByText('Set 2: 11 - 6')).toBeInTheDocument();
      expect(screen.getByText('Set 3: 11 - 7')).toBeInTheDocument();
      expect(screen.queryByText(/Set 4/)).not.toBeInTheDocument();
    });

    it('muestra los sets cuarto y siguientes solo si se jugaron', async () => {
      serve([
        makeMatch({
          id: 'm1',
          setFourPlayerOne: 9,
          setFourPlayerTwo: 11,
          setFivePlayerOne: 0,
          setFivePlayerTwo: 0,
        }),
      ]);
      await renderLoaded();

      await openMatch('Liga Local');

      expect(screen.getByText('Set 4: 9 - 11')).toBeInTheDocument();
      expect(screen.queryByText(/Set 5/)).not.toBeInTheDocument();
    });

    it('avisa cuando el partido no tiene resultados registrados', async () => {
      serve([makeMatch({ id: 'm1', status: null, setOnePlayerOne: null, setOnePlayerTwo: null })]);
      await renderLoaded();

      await openMatch('Liga Local');

      expect(screen.getByText('No hay resultados registrados todavía.')).toBeInTheDocument();
      expect(screen.getByText('Desconocido')).toBeInTheDocument();
      expect(screen.queryByText(/Set 1/)).not.toBeInTheDocument();
    });
  });
});

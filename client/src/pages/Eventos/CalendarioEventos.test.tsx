import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { screen, fireEvent, waitFor, within } from '@testing-library/react';
import { api } from '../../api/axios';
import { ENDPOINTS } from '../../api/endpoints';
import { useAuthStore } from '../../store/authStore';
import { loginAs, normalizeIds, renderWithProviders } from '../../test/utils';
import { CalendarioEventos } from './CalendarioEventos';

// Se mockea el `api` de bajo nivel (la frontera del sistema) y no los servicios,
// para que estos tests sigan valiendo cuando el acceso a datos migre a servicios.
vi.mock('../../api/axios', () => ({
  api: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    delete: vi.fn(),
  },
}));

const envelope = (data: unknown) => ({ data: { success: true, data } });

const TOP_ESTATAL = {
  id: 'e1',
  name: 'Top Estatal',
  date: '2026-10-20T10:00:00.000Z',
  endDate: '2026-10-22T10:00:00.000Z',
  location: 'Madrid',
  color: 'orange',
  region: 'Regional',
  reminders: [],
};
const PASADO = {
  id: 'e2',
  name: 'Torneo Pasado',
  date: '2026-10-05T10:00:00.000Z',
  endDate: null,
  location: null,
  color: 'red',
  region: 'Local',
  reminders: [{ id: 'r1' }],
};
const LIGA = {
  id: 'e3',
  name: 'Liga Club',
  date: '2026-10-25T18:00:00.000Z',
  endDate: null,
  location: null,
  color: 'blue',
  region: 'Club',
  reminders: [{ id: 'r2' }],
};

const serve = (events: unknown[] = [TOP_ESTATAL, PASADO, LIGA]) => {
  vi.mocked(api.get).mockResolvedValue(envelope(events) as never);
};

const renderLoaded = async () => {
  const view = renderWithProviders(<CalendarioEventos />);
  await screen.findByRole('heading', { name: 'Calendario de Eventos' });
  return view;
};

const openDay = async (dayNumber: number) => {
  fireEvent.click(screen.getByText(String(dayNumber)));
  await screen.findByText(/^Eventos del /);
};

const clickIcon = (scope: HTMLElement, icon: string) =>
  fireEvent.click(scope.querySelector(`.tabler-icon-${icon}`)?.closest('button') as HTMLElement);

const dialog = () => screen.getByRole('dialog', { name: /Eventos del / });

const eventCard = (name: string) =>
  within(dialog()).getByText(name).closest('[class*="mantine-Card-root"]') as HTMLElement;

describe('CalendarioEventos', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // El calendario arranca en «hoy»: se congela solo Date.
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date('2026-10-15T12:00:00.000Z'));
    useAuthStore.setState({ token: null, user: null, isAuthenticated: false });
    serve();
    vi.mocked(api.post).mockResolvedValue(envelope({}) as never);
    vi.mocked(api.put).mockResolvedValue(envelope({}) as never);
    vi.mocked(api.delete).mockResolvedValue(envelope({}) as never);
    loginAs({ role: 'AdminClub', clubId: 'club-1' });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('carga y calendario', () => {
    it('pide los eventos del club del usuario y muestra el mes actual', async () => {
      await renderLoaded();

      expect(api.get).toHaveBeenCalledWith(ENDPOINTS.EVENTS.BY_CLUB('club-1'), undefined);
      expect(screen.getByText('OCTUBRE DE 2026')).toBeInTheDocument();
    });

    it('muestra cada evento en los dias que ocupa, tambien los multidia', async () => {
      await renderLoaded();

      expect(screen.getAllByText('Top Estatal')).toHaveLength(3);
      expect(screen.getAllByText('Torneo Pasado')).toHaveLength(1);
      expect(screen.getAllByText('Liga Club')).toHaveLength(1);
    });

    it('cambia de mes con las flechas', async () => {
      await renderLoaded();
      const [prev, next] = screen
        .getAllByRole('button')
        .filter((button) =>
          button.querySelector('.tabler-icon-chevron-left, .tabler-icon-chevron-right'),
        );

      fireEvent.click(next);
      expect(screen.getByText('NOVIEMBRE DE 2026')).toBeInTheDocument();
      expect(screen.queryByText('Top Estatal')).not.toBeInTheDocument();

      fireEvent.click(prev);
      fireEvent.click(prev);
      expect(screen.getByText('SEPTIEMBRE DE 2026')).toBeInTheDocument();
    });

    it('si falla la carga muestra el calendario vacio', async () => {
      const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
      vi.mocked(api.get).mockRejectedValue(new Error('red caida'));

      await renderLoaded();

      expect(screen.queryByText('Top Estatal')).not.toBeInTheDocument();
      expect(consoleError).toHaveBeenCalled();
    });

    it('un usuario sin club no pide nada y muestra el calendario vacío', async () => {
      loginAs({ role: 'Player', clubId: null });

      renderWithProviders(<CalendarioEventos />);

      expect(
        await screen.findByRole('heading', { name: 'Calendario de Eventos' }),
      ).toBeInTheDocument();
      expect(api.get).not.toHaveBeenCalled();
    });
  });

  describe('eventos de un dia', () => {
    it('muestra el detalle de un evento multidia', async () => {
      await renderLoaded();

      await openDay(20);

      expect(screen.getByText('Eventos del 20/10/2026')).toBeInTheDocument();
      const card = within(eventCard('Top Estatal'));
      expect(card.getByText(/20 oct.* - .*22 oct/)).toBeInTheDocument();
      expect(card.getByText('Madrid')).toBeInTheDocument();
      expect(card.getByText('Regional')).toBeInTheDocument();
      expect(card.getByText('Multi-día')).toBeInTheDocument();
      expect(card.queryByText('Finalizado')).not.toBeInTheDocument();
    });

    it('marca como finalizado un evento pasado y no ofrece recordatorio', async () => {
      await renderLoaded();

      await openDay(5);

      const card = eventCard('Torneo Pasado');
      expect(within(card).getByText('Finalizado')).toBeInTheDocument();
      expect(card.querySelector('.tabler-icon-bell, .tabler-icon-bell-ringing')).toBeNull();
    });

    it('avisa cuando el dia no tiene eventos', async () => {
      await renderLoaded();

      await openDay(10);

      expect(screen.getByText('No hay eventos para esta fecha.')).toBeInTheDocument();
    });
  });

  describe('segun el rol', () => {
    it.each(['AdminClub', 'SuperAdmin'])(
      'un %s puede añadir, editar y borrar eventos',
      async (role) => {
        loginAs({ role, clubId: 'club-1' });
        await renderLoaded();

        expect(screen.getByRole('button', { name: 'Añadir Evento' })).toBeInTheDocument();
        await openDay(20);
        const card = eventCard('Top Estatal');
        expect(card.querySelector('.tabler-icon-edit')).not.toBeNull();
        expect(card.querySelector('.tabler-icon-trash')).not.toBeNull();
      },
    );

    it('un jugador solo consulta el calendario y gestiona sus recordatorios', async () => {
      loginAs({ role: 'Player', clubId: 'club-1' });
      await renderLoaded();

      expect(screen.queryByRole('button', { name: 'Añadir Evento' })).not.toBeInTheDocument();
      await openDay(20);
      const card = eventCard('Top Estatal');
      expect(card.querySelector('.tabler-icon-edit')).toBeNull();
      expect(card.querySelector('.tabler-icon-trash')).toBeNull();
      expect(card.querySelector('.tabler-icon-bell')).not.toBeNull();
    });
  });

  describe('recordatorios', () => {
    it('activar el recordatorio de un evento sin aviso lo pide y recarga', async () => {
      await renderLoaded();
      await openDay(20);

      clickIcon(eventCard('Top Estatal'), 'bell');

      await waitFor(() =>
        expect(api.post).toHaveBeenCalledWith(
          ENDPOINTS.EVENTS.REMINDERS('e1'),
          undefined,
          undefined,
        ),
      );
      await waitFor(() => expect(api.get).toHaveBeenCalledTimes(2));
    });

    it('desactivar el recordatorio de un evento con aviso lo cancela y recarga', async () => {
      await renderLoaded();
      await openDay(25);

      clickIcon(eventCard('Liga Club'), 'bell-ringing');

      await waitFor(() =>
        expect(api.delete).toHaveBeenCalledWith(ENDPOINTS.EVENTS.REMINDERS('e3'), undefined),
      );
      await waitFor(() => expect(api.get).toHaveBeenCalledTimes(2));
    });
  });

  describe('crear un evento', () => {
    it('el boton queda desactivado hasta escribir el nombre', async () => {
      await renderLoaded();

      fireEvent.click(screen.getByRole('button', { name: 'Añadir Evento' }));

      expect(await screen.findByText('Nuevo Evento Oficial')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Añadir al Calendario' })).toBeDisabled();
    });

    it('envia el evento con los valores por defecto, cierra el modal y recarga', async () => {
      await renderLoaded();
      fireEvent.click(screen.getByRole('button', { name: 'Añadir Evento' }));
      await screen.findByText('Nuevo Evento Oficial');
      fireEvent.change(screen.getByLabelText(/Nombre del Evento/), {
        target: { value: 'Open Local' },
      });

      fireEvent.click(screen.getByRole('button', { name: 'Añadir al Calendario' }));

      await waitFor(() =>
        expect(api.post).toHaveBeenCalledWith(
          ENDPOINTS.EVENTS.BASE,
          {
            name: 'Open Local',
            location: '',
            color: 'blue',
            region: 'Local',
            date: '2026-10-15T12:00:00.000Z',
            endDate: null,
          },
          undefined,
        ),
      );
      await waitFor(() => expect(api.get).toHaveBeenCalledTimes(2));
      await waitFor(() =>
        expect(screen.queryByText('Nuevo Evento Oficial')).not.toBeInTheDocument(),
      );
    });

    it('si falla el guardado el modal sigue abierto y no recarga', async () => {
      vi.mocked(api.post).mockRejectedValue(new Error('400'));
      await renderLoaded();
      fireEvent.click(screen.getByRole('button', { name: 'Añadir Evento' }));
      await screen.findByText('Nuevo Evento Oficial');
      fireEvent.change(screen.getByLabelText(/Nombre del Evento/), { target: { value: 'Open' } });

      fireEvent.click(screen.getByRole('button', { name: 'Añadir al Calendario' }));

      await waitFor(() => expect(api.post).toHaveBeenCalled());
      await waitFor(() =>
        expect(screen.getByRole('button', { name: 'Añadir al Calendario' })).toBeEnabled(),
      );
      expect(screen.getByText('Nuevo Evento Oficial')).toBeInTheDocument();
      expect(api.get).toHaveBeenCalledTimes(1);
    });
  });

  describe('editar y borrar un evento', () => {
    it('editar rellena el formulario y envia los cambios por PUT', async () => {
      await renderLoaded();
      await openDay(20);

      clickIcon(eventCard('Top Estatal'), 'edit');
      expect(await screen.findByText('Editar Evento')).toBeInTheDocument();
      expect(screen.getByLabelText(/Nombre del Evento/)).toHaveValue('Top Estatal');
      expect(screen.getByLabelText(/Ubicación/)).toHaveValue('Madrid');
      fireEvent.change(screen.getByLabelText(/Nombre del Evento/), {
        target: { value: 'Top Estatal 2026' },
      });
      fireEvent.click(screen.getByRole('button', { name: 'Guardar Cambios' }));

      await waitFor(() =>
        expect(api.put).toHaveBeenCalledWith(
          ENDPOINTS.EVENTS.UPDATE('e1'),
          {
            name: 'Top Estatal 2026',
            location: 'Madrid',
            color: 'orange',
            region: 'Regional',
            date: '2026-10-20T10:00:00.000Z',
            endDate: '2026-10-22T10:00:00.000Z',
          },
          undefined,
        ),
      );
      expect(api.post).not.toHaveBeenCalled();
      await waitFor(() => expect(api.get).toHaveBeenCalledTimes(2));
    });

    it('borrar pide confirmacion, elimina el evento y recarga', async () => {
      await renderLoaded();
      await openDay(20);

      clickIcon(eventCard('Top Estatal'), 'trash');
      expect(await screen.findByText('Eliminar Evento')).toBeInTheDocument();
      fireEvent.click(screen.getByRole('button', { name: 'Sí, eliminar' }));

      await waitFor(() =>
        expect(api.delete).toHaveBeenCalledWith(ENDPOINTS.EVENTS.DELETE('e1'), undefined),
      );
      await waitFor(() => expect(api.get).toHaveBeenCalledTimes(2));
    });

    it('cancelar el borrado no llama a la API', async () => {
      await renderLoaded();
      await openDay(20);
      clickIcon(eventCard('Top Estatal'), 'trash');

      fireEvent.click(await screen.findByRole('button', { name: 'Cancelar' }));

      await waitFor(() => expect(screen.queryByText('Eliminar Evento')).not.toBeInTheDocument());
      expect(api.delete).not.toHaveBeenCalled();
    });
  });

  describe('estructura del DOM', () => {
    // Verificador mecanico de la regla de oro del JSX.
    it('el calendario del mes conserva su estructura', async () => {
      const { container } = await renderLoaded();

      expect(normalizeIds(container.innerHTML)).toMatchSnapshot();
    });
  });
});

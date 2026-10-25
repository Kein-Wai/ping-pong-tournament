import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { screen, fireEvent, waitFor } from '@testing-library/react';
import { Routes, Route } from 'react-router-dom';
import { api } from '../../api/axios';
import { ENDPOINTS } from '../../api/endpoints';
import { APP_ROUTES } from '../../constants/routes';
import { useAuthStore } from '../../store/authStore';
import { loginAs, normalizeIds, renderWithProviders } from '../../test/utils';
import { MiClub } from './MiClub';

// Se mockea el `api` de bajo nivel (la frontera del sistema) y no los servicios,
// para que estos tests sigan valiendo cuando el acceso a datos migre a servicios.
vi.mock('../../api/axios', () => ({
  api: {
    get: vi.fn(),
    put: vi.fn(),
  },
}));

const envelope = (data: unknown) => ({ data: { success: true, data } });

const CLUB = {
  id: 'club-1',
  name: 'Club Norte',
  city: 'Valencia',
  address: 'Calle Mayor 12',
  foundedAt: '2010-03-15T00:00:00.000Z',
  logoUrl: null,
  status: 'Aprobado',
  _count: { users: 12 },
  users: [
    { birthDate: '2000-10-16T00:00:00.000Z' },
    { birthDate: '1990-01-01T00:00:00.000Z' },
    { birthDate: null },
  ],
};

const serve = (overrides: Record<string, unknown> = {}) => {
  vi.mocked(api.get).mockResolvedValue(envelope({ ...CLUB, ...overrides }) as never);
};

const renderPage = () =>
  renderWithProviders(
    <Routes>
      <Route path={APP_ROUTES.HOME} element={<MiClub />} />
      <Route path={APP_ROUTES.JUGADORES.LIST} element={<div>Pantalla de jugadores</div>} />
    </Routes>,
  );

const renderLoaded = async () => {
  const view = renderPage();
  await screen.findByRole('heading', { name: 'Club Norte' });
  return view;
};

const startEditing = async () => {
  fireEvent.click(screen.getByRole('button', { name: 'Editar Datos' }));
  await screen.findByLabelText(/Nombre Oficial del Club/);
};

const save = () => fireEvent.click(screen.getByRole('button', { name: 'Guardar Cambios' }));

describe('MiClub', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // La edad media depende de «hoy»: se congela solo Date.
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date('2026-10-15T12:00:00.000Z'));
    useAuthStore.setState({ token: null, user: null, isAuthenticated: false });
    serve();
    vi.mocked(api.put).mockResolvedValue(envelope({}) as never);
    loginAs({ role: 'AdminClub', clubId: 'club-1' });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('carga', () => {
    it('pide el club del usuario y muestra nombre, estado, ubicacion y fundacion', async () => {
      await renderLoaded();

      expect(api.get).toHaveBeenCalledWith(ENDPOINTS.CLUBS.BY_ID('club-1'), undefined);
      expect(screen.getByText('Estado: Aprobado')).toBeInTheDocument();
      expect(screen.getByText('Valencia')).toBeInTheDocument();
      expect(screen.getByText('Calle Mayor 12')).toBeInTheDocument();
      expect(screen.getByText('15 de marzo de 2010')).toBeInTheDocument();
    });

    it('muestra los textos alternativos cuando faltan direccion y fecha de fundacion', async () => {
      serve({ address: null, foundedAt: null });

      await renderLoaded();

      expect(screen.getByText('Sin dirección exacta registrada')).toBeInTheDocument();
      expect(screen.getByText('Fecha no registrada')).toBeInTheDocument();
    });

    it('avisa cuando no se puede cargar el club', async () => {
      const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
      vi.mocked(api.get).mockRejectedValue(new Error('red caida'));

      renderPage();

      expect(
        await screen.findByText('No se pudo cargar la información del club.'),
      ).toBeInTheDocument();
      expect(consoleError).toHaveBeenCalled();
    });

    it('un usuario sin club no pide nada y se queda cargando', async () => {
      loginAs({ role: 'Player', clubId: null });

      renderPage();

      expect(api.get).not.toHaveBeenCalled();
      expect(screen.queryByText('No se pudo cargar la información del club.')).not.toBeInTheDocument();
      expect(screen.queryByRole('heading', { name: 'Club Norte' })).not.toBeInTheDocument();
    });
  });

  describe('demografia', () => {
    it('muestra el numero de miembros y la edad media sobre quienes tienen fecha de nacimiento', async () => {
      await renderLoaded();

      expect(screen.getByText('12')).toBeInTheDocument();
      // 25 y 36 años: media 30,5 -> 31.
      expect(screen.getByText('31 años')).toBeInTheDocument();
      expect(
        screen.getByText('Calculado sobre 2 jugadores con fecha de nacimiento.'),
      ).toBeInTheDocument();
    });

    it('muestra «N/D» cuando nadie tiene fecha de nacimiento', async () => {
      serve({ users: [{ birthDate: null }] });

      await renderLoaded();

      expect(screen.getByText('N/D')).toBeInTheDocument();
    });
  });

  describe('segun el rol', () => {
    it.each(['AdminClub', 'SuperAdmin'])('un %s puede editar y gestionar la plantilla', async (role) => {
      loginAs({ role, clubId: 'club-1' });

      await renderLoaded();

      expect(screen.getByRole('button', { name: 'Editar Datos' })).toBeInTheDocument();
      expect(
        screen.getByRole('button', { name: 'Gestionar Solicitudes y Plantilla' }),
      ).toBeInTheDocument();
    });

    it('un jugador solo consulta el club', async () => {
      loginAs({ role: 'Player', clubId: 'club-1' });

      await renderLoaded();

      expect(screen.queryByRole('button', { name: 'Editar Datos' })).not.toBeInTheDocument();
      expect(
        screen.queryByRole('button', { name: 'Gestionar Solicitudes y Plantilla' }),
      ).not.toBeInTheDocument();
    });

    it('«Gestionar Solicitudes y Plantilla» lleva a los jugadores', async () => {
      await renderLoaded();

      fireEvent.click(screen.getByRole('button', { name: 'Gestionar Solicitudes y Plantilla' }));

      expect(await screen.findByText('Pantalla de jugadores')).toBeInTheDocument();
    });
  });

  describe('edicion', () => {
    it('al editar el formulario se rellena con los datos del club', async () => {
      await renderLoaded();

      await startEditing();

      expect(screen.getByLabelText(/Nombre Oficial del Club/)).toHaveValue('Club Norte');
      expect(screen.getByRole('combobox', { name: /Ciudad base/ })).toHaveValue('Valencia');
      expect(screen.getByLabelText(/Dirección Completa/)).toHaveValue('Calle Mayor 12');
      expect(screen.getByLabelText(/URL del Logo/)).toHaveValue('');
    });

    it('guarda los cambios, envia nulos en los campos vacios y recarga el club', async () => {
      await renderLoaded();
      await startEditing();
      fireEvent.change(screen.getByLabelText(/Nombre Oficial del Club/), {
        target: { value: 'Club Norte Renovado' },
      });
      fireEvent.change(screen.getByLabelText(/Dirección Completa/), { target: { value: '' } });

      save();

      await waitFor(() =>
        expect(api.put).toHaveBeenCalledWith(
          ENDPOINTS.CLUBS.UPDATE('club-1'),
          {
            name: 'Club Norte Renovado',
            city: 'Valencia',
            address: null,
            foundedAt: '2010-03-15T00:00:00.000Z',
            logoUrl: null,
          },
          undefined,
        ),
      );
      await waitFor(() => expect(api.get).toHaveBeenCalledTimes(2));
      expect(await screen.findByRole('button', { name: 'Editar Datos' })).toBeInTheDocument();
    });

    it('cancelar vuelve a la vista sin llamar a la API', async () => {
      await renderLoaded();
      await startEditing();

      fireEvent.click(
        document.querySelector('.tabler-icon-x')?.closest('button') as HTMLElement,
      );

      expect(await screen.findByRole('button', { name: 'Editar Datos' })).toBeInTheDocument();
      expect(api.put).not.toHaveBeenCalled();
    });

    it('si falla el guardado se queda editando y no recarga', async () => {
      const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
      vi.mocked(api.put).mockRejectedValue(new Error('403'));
      await renderLoaded();
      await startEditing();

      save();

      await waitFor(() => expect(consoleError).toHaveBeenCalled());
      expect(screen.getByLabelText(/Nombre Oficial del Club/)).toBeInTheDocument();
      expect(api.get).toHaveBeenCalledTimes(1);
    });
  });

  describe('estructura del DOM', () => {
    // Verificador mecanico de la regla de oro del JSX.
    it('la vista del club conserva su estructura', async () => {
      const { container } = await renderLoaded();

      expect(normalizeIds(container.innerHTML)).toMatchSnapshot();
    });
  });
});

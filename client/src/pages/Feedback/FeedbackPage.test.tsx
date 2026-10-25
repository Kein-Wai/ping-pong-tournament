import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen, fireEvent, waitFor, within } from '@testing-library/react';
import { api } from '../../api/axios';
import { ENDPOINTS } from '../../api/endpoints';
import { useAuthStore, type User } from '../../store/authStore';
import { normalizeIds, renderWithProviders } from '../../test/utils';
import { FeedbackPage } from './FeedbackPage';

// Se mockea el `api` de bajo nivel (la frontera del sistema) y no los servicios,
// para que estos tests sigan valiendo cuando el acceso a datos migre a servicios.
vi.mock('../../api/axios', () => ({
  api: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
  },
}));

const BUG = {
  id: 'f1',
  type: 'Bug',
  status: 'Pendiente',
  content: 'La pantalla de torneos se queda en blanco',
  createdAt: '2026-10-10T12:00:00.000Z',
  user: { name: 'Ana', surname: 'Gil', email: 'ana@test.com' },
};
const SUGGESTION = {
  id: 'f2',
  type: 'Sugerencia',
  status: 'Revisado',
  content: 'Estaria bien poder exportar los torneos',
  createdAt: '2026-10-11T12:00:00.000Z',
  user: { name: 'Luis', surname: 'Pérez', email: 'luis@test.com' },
};
const DONE = {
  id: 'f3',
  type: 'Bug',
  status: 'Resuelto',
  content: 'Error ya corregido',
  createdAt: '2026-10-12T12:00:00.000Z',
  user: { name: 'Marta', surname: 'Ruiz', email: 'marta@test.com' },
};

const loginAs = (role: string, overrides: Partial<User> = {}) => {
  useAuthStore.setState({
    token: 'token-test',
    user: {
      id: 'u1',
      email: 'u1@test.com',
      name: 'Usuario',
      role,
      clubId: 'club-1',
      ...overrides,
    } as User,
    isAuthenticated: true,
  });
};

const serve = (feedbacks: unknown[] = [BUG, SUGGESTION, DONE]) => {
  vi.mocked(api.get).mockResolvedValue({ data: { success: true, data: feedbacks } } as never);
};

const renderLoaded = async () => {
  const view = renderWithProviders(<FeedbackPage />);
  await screen.findByRole('heading', { level: 4 });
  return view;
};

const openReport = async (rowText: string) => {
  const row = screen.getByText(rowText).closest('tr') as HTMLElement;
  const button = row.querySelector('.tabler-icon-eye')?.closest('button');
  if (!button) throw new Error('La fila no tiene el boton de ver detalles');
  fireEvent.click(button);
  await screen.findByText('Detalles del Reporte');
};

describe('FeedbackPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useAuthStore.setState({ token: null, user: null, isAuthenticated: false });
    serve();
    // Respuestas con el sobre real de la API: el adaptador `http` solo desenvuelve si existe `success`.
    vi.mocked(api.post).mockResolvedValue({ data: { success: true, data: {} } } as never);
    vi.mocked(api.put).mockResolvedValue({ data: { success: true, data: {} } } as never);
  });

  describe('segun el rol', () => {
    it('el SuperAdmin ve la bandeja de soporte con la columna de usuario', async () => {
      loginAs('SuperAdmin');

      await renderLoaded();

      expect(screen.getByText('Bandeja de Soporte y Feedback')).toBeInTheDocument();
      expect(screen.getByText('Bandeja de Entrada')).toBeInTheDocument();
      expect(screen.getByText('Usuario')).toBeInTheDocument();
      expect(screen.getByText('Ana Gil')).toBeInTheDocument();
      expect(screen.getByText('ana@test.com')).toBeInTheDocument();
    });

    it.each(['Player', 'AdminClub'])('un %s ve solo su historial, sin columna de usuario', async (role) => {
      loginAs(role);

      await renderLoaded();

      expect(screen.getByText('Sugerencias y Reportes')).toBeInTheDocument();
      expect(screen.getByText('Mi Historial de Reportes')).toBeInTheDocument();
      expect(screen.queryByText('Usuario')).not.toBeInTheDocument();
      expect(screen.queryByText('ana@test.com')).not.toBeInTheDocument();
    });
  });

  describe('listado', () => {
    beforeEach(() => loginAs('SuperAdmin'));

    it('pide los reportes y los lista con tipo y estado', async () => {
      await renderLoaded();

      expect(api.get).toHaveBeenCalledWith(ENDPOINTS.FEEDBACK.BASE, undefined);
      const rows = screen.getAllByRole('row').slice(1);
      expect(rows).toHaveLength(3);
      expect(within(rows[0]).getByText('Bug')).toBeInTheDocument();
      expect(within(rows[0]).getByText('Pendiente')).toBeInTheDocument();
      expect(within(rows[1]).getByText('Sugerencia')).toBeInTheDocument();
      expect(within(rows[1]).getByText('Revisado')).toBeInTheDocument();
      expect(within(rows[2]).getByText('Resuelto')).toBeInTheDocument();
    });

    it('avisa cuando no hay reportes', async () => {
      serve([]);

      await renderLoaded();

      expect(screen.getByText('No hay registros en la bandeja.')).toBeInTheDocument();
    });

    it('no rompe si falla la carga', async () => {
      vi.mocked(api.get).mockRejectedValue(new Error('red caida'));

      await renderLoaded();

      expect(screen.getByText('No hay registros en la bandeja.')).toBeInTheDocument();
    });
  });

  describe('enviar un reporte', () => {
    beforeEach(() => loginAs('Player'));

    const submit = () => screen.getByRole('button', { name: 'Enviar Reporte' });

    it('exige al menos diez caracteres de detalle', async () => {
      await renderLoaded();
      expect(submit()).toBeDisabled();

      fireEvent.change(screen.getByLabelText(/^Detalles/), { target: { value: 'corto' } });
      expect(submit()).toBeDisabled();

      fireEvent.change(screen.getByLabelText(/^Detalles/), { target: { value: 'ya es suficiente' } });
      expect(submit()).toBeEnabled();
    });

    it('envia una sugerencia por defecto, limpia el formulario y recarga el historial', async () => {
      await renderLoaded();
      fireEvent.change(screen.getByLabelText(/^Detalles/), {
        target: { value: 'Me gustaria ver el ranking' },
      });

      fireEvent.click(submit());

      await waitFor(() =>
        expect(api.post).toHaveBeenCalledWith(
          ENDPOINTS.FEEDBACK.BASE,
          { type: 'Sugerencia', content: 'Me gustaria ver el ranking' },
          undefined,
        ),
      );
      await waitFor(() => expect(screen.getByLabelText(/^Detalles/)).toHaveValue(''));
      await waitFor(() => expect(api.get).toHaveBeenCalledTimes(2));
    });

    it('cambiar a Bug cambia el texto de ayuda y el tipo enviado', async () => {
      await renderLoaded();
      expect(screen.getByPlaceholderText('¿Qué nueva funcionalidad te gustaría ver?')).toBeInTheDocument();

      fireEvent.click(screen.getByRole('combobox', { name: /Tipo de reporte/ }));
      fireEvent.click(await screen.findByRole('option', { name: 'Bug', hidden: true }));
      fireEvent.change(screen.getByLabelText(/^Detalles/), {
        target: { value: 'Se cierra al guardar el perfil' },
      });
      fireEvent.click(submit());

      expect(
        screen.getByPlaceholderText('¿Qué ha fallado y cómo llegaste a ese error?'),
      ).toBeInTheDocument();
      await waitFor(() =>
        expect(api.post).toHaveBeenCalledWith(
          ENDPOINTS.FEEDBACK.BASE,
          { type: 'Bug', content: 'Se cierra al guardar el perfil' },
          undefined,
        ),
      );
    });
  });

  describe('detalle de un reporte', () => {
    it('el SuperAdmin ve quien lo envio y puede marcarlo como revisado', async () => {
      loginAs('SuperAdmin');
      await renderLoaded();

      await openReport('Ana Gil');

      expect(screen.getByText('La pantalla de torneos se queda en blanco')).toBeInTheDocument();
      expect(screen.getByText(/Reportado por/)).toBeInTheDocument();
      fireEvent.click(screen.getByRole('button', { name: 'Marcar como Revisado' }));

      await waitFor(() =>
        expect(api.put).toHaveBeenCalledWith(
          ENDPOINTS.FEEDBACK.UPDATE_STATUS('f1'),
          { status: 'Revisado' },
          undefined,
        ),
      );
      await waitFor(() => expect(api.get).toHaveBeenCalledTimes(2));
    });

    it('un reporte ya revisado solo se puede marcar como resuelto', async () => {
      loginAs('SuperAdmin');
      await renderLoaded();

      await openReport('Luis Pérez');

      expect(screen.queryByRole('button', { name: 'Marcar como Revisado' })).not.toBeInTheDocument();
      fireEvent.click(screen.getByRole('button', { name: 'Marcar como Resuelto' }));
      await waitFor(() =>
        expect(api.put).toHaveBeenCalledWith(
          ENDPOINTS.FEEDBACK.UPDATE_STATUS('f2'),
          { status: 'Resuelto' },
          undefined,
        ),
      );
    });

    it('un reporte resuelto no ofrece cambiar el estado', async () => {
      loginAs('SuperAdmin');
      await renderLoaded();

      await openReport('Marta Ruiz');

      expect(screen.queryByRole('button', { name: /Marcar como/ })).not.toBeInTheDocument();
    });

    it('un jugador ve el detalle de su reporte sin autor ni acciones de gestion', async () => {
      loginAs('Player');
      serve([{ ...BUG, user: undefined }]);
      await renderLoaded();

      fireEvent.click(
        screen.getByRole('table').querySelector('.tabler-icon-eye')?.closest('button') as HTMLElement,
      );
      await screen.findByText('Detalles del Reporte');

      expect(screen.getByText('La pantalla de torneos se queda en blanco')).toBeInTheDocument();
      expect(screen.queryByText(/Reportado por/)).not.toBeInTheDocument();
      expect(screen.queryByRole('button', { name: /Marcar como/ })).not.toBeInTheDocument();
    });

    it('un AdminClub tampoco gestiona reportes: solo el SuperAdmin', async () => {
      loginAs('AdminClub');
      serve([BUG]);
      await renderLoaded();

      fireEvent.click(
        screen.getByRole('table').querySelector('.tabler-icon-eye')?.closest('button') as HTMLElement,
      );
      await screen.findByText('Detalles del Reporte');

      expect(screen.queryByRole('button', { name: /Marcar como/ })).not.toBeInTheDocument();
    });
  });

  describe('estructura del DOM', () => {
    // Verificador mecanico de la regla de oro del JSX: si una extraccion cambia
    // el HTML renderizado, este snapshot falla. Los ids de Mantine se normalizan
    // porque se generan en cada render.
    it('la bandeja del SuperAdmin conserva su estructura', async () => {
      loginAs('SuperAdmin');

      const { container } = await renderLoaded();

      expect(normalizeIds(container.innerHTML)).toMatchSnapshot();
    });
  });
});

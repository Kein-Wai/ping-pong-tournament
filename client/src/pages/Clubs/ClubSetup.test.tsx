import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen, fireEvent, waitFor } from '@testing-library/react';
import { Routes, Route } from 'react-router-dom';
import { api } from '../../api/axios';
import { ENDPOINTS } from '../../api/endpoints';
import { APP_ROUTES } from '../../constants/routes';
import { useAuthStore } from '../../store/authStore';
import { loginAs, normalizeIds, renderWithProviders } from '../../test/utils';
import { ClubSetup } from './ClubSetup';

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
      <Route path="/setup" element={<ClubSetup />} />
      <Route path={APP_ROUTES.HOME} element={<div>Pantalla de inicio</div>} />
    </Routes>,
    { initialEntries: ['/setup'] },
  );

const fillForm = (name = 'Club TM Onda', city = 'Onda') => {
  fireEvent.change(screen.getByLabelText(/Nombre Oficial del Club/), { target: { value: name } });
  fireEvent.change(screen.getByPlaceholderText(/Onda, Vila-real/), { target: { value: city } });
};

// jsdom bloquea el envio por clic con campos `required` vacios: se envia el formulario.
const submit = () =>
  fireEvent.submit(screen.getByRole('button', { name: 'Registrar Club' }).closest('form')!);

describe('ClubSetup', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useAuthStore.setState({ token: null, user: null, isAuthenticated: false });
    loginAs({ role: 'AdminClub', clubId: null });
    vi.mocked(api.post).mockResolvedValue({ data: { success: true, data: { id: 'club-9' } } } as never);
  });

  it('muestra la bienvenida y el formulario de registro de la sede', () => {
    renderPage();

    expect(screen.getByRole('heading', { name: 'Configura tu Sede' })).toBeInTheDocument();
    expect(screen.getByLabelText(/Nombre Oficial del Club/)).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/Onda, Vila-real/)).toBeInTheDocument();
  });

  it('envía el nombre y la ciudad del club', async () => {
    renderPage();
    fillForm();

    submit();

    await waitFor(() =>
      expect(api.post).toHaveBeenCalledWith(
        ENDPOINTS.CLUBS.BASE,
        { name: 'Club TM Onda', city: 'Onda' },
        undefined,
      ),
    );
  });

  it('al registrar el club guarda su id en la sesión, lo marca aprobado y va al inicio', async () => {
    renderPage();
    fillForm();

    submit();

    expect(await screen.findByText('Pantalla de inicio')).toBeInTheDocument();
    expect(useAuthStore.getState().user).toMatchObject({ clubId: 'club-9', clubStatus: 'Aprobado' });
  });

  it('si el registro falla, no toca la sesión, no navega y vuelve a habilitar el botón', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
    vi.mocked(api.post).mockRejectedValue(new Error('400'));
    renderPage();
    fillForm();

    submit();

    await waitFor(() => expect(api.post).toHaveBeenCalledTimes(1));
    await waitFor(() =>
      expect(screen.getByRole('button', { name: 'Registrar Club' })).not.toBeDisabled(),
    );
    expect(screen.queryByText('Pantalla de inicio')).not.toBeInTheDocument();
    expect(useAuthStore.getState().user?.clubId).toBeNull();
  });

  it('el DOM del formulario no cambia', () => {
    const { container } = renderPage();

    expect(stableHtml(container.innerHTML)).toMatchSnapshot();
  });
});

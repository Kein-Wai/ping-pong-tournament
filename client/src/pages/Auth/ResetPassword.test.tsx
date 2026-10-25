import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen, fireEvent, waitFor } from '@testing-library/react';
import { Routes, Route } from 'react-router-dom';
import { api } from '../../api/axios';
import { ENDPOINTS } from '../../api/endpoints';
import { APP_ROUTES } from '../../constants/routes';
import { normalizeIds, renderWithProviders } from '../../test/utils';
import { ResetPassword } from './ResetPassword';

// Se mockea el `api` de bajo nivel (la frontera del sistema) y no los servicios,
// para que estos tests sigan valiendo cuando el acceso a datos migre a servicios.
vi.mock('../../api/axios', () => ({
  api: {
    post: vi.fn(),
  },
}));

const STRONG = 'Abcdef1@';

const renderAt = (url: string) =>
  renderWithProviders(
    <Routes>
      <Route path={APP_ROUTES.RESET_PASSWORD} element={<ResetPassword />} />
      <Route path={APP_ROUTES.LOGIN} element={<div>Pantalla de login</div>} />
      <Route path={APP_ROUTES.FORGOT_PASSWORD} element={<div>Pantalla de recuperar</div>} />
    </Routes>,
    { initialEntries: [url] },
  );

const renderWithToken = () => renderAt(`${APP_ROUTES.RESET_PASSWORD}?token=tok-123`);

const fill = (password: string, confirm: string) => {
  fireEvent.change(screen.getByLabelText(/Nueva contraseña/), { target: { value: password } });
  fireEvent.change(screen.getByLabelText(/Confirmar contraseña/), { target: { value: confirm } });
};

const submit = () => fireEvent.click(screen.getByRole('button', { name: 'Guardar Contraseña' }));

describe('ResetPassword', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // La API responde solo { message }, sin sobre { success, data }.
    vi.mocked(api.post).mockResolvedValue({ data: { message: 'Contraseña actualizada' } } as never);
  });

  describe('sin token en la URL', () => {
    it('avisa de que el enlace es invalido y no muestra el formulario', () => {
      renderAt(APP_ROUTES.RESET_PASSWORD);

      expect(screen.getByText('Enlace Inválido')).toBeInTheDocument();
      expect(screen.queryByLabelText(/Nueva contraseña/)).not.toBeInTheDocument();
    });

    it('ofrece solicitar un enlace nuevo', async () => {
      renderAt(APP_ROUTES.RESET_PASSWORD);

      fireEvent.click(screen.getByRole('button', { name: 'Solicitar nuevo enlace' }));

      expect(await screen.findByText('Pantalla de recuperar')).toBeInTheDocument();
    });
  });

  describe('con token', () => {
    it('muestra el formulario', () => {
      renderWithToken();

      expect(screen.getByText('Crea tu nueva contraseña')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Guardar Contraseña' })).toBeInTheDocument();
    });

    it('rechaza contrasenas que no coinciden sin llamar a la API', async () => {
      renderWithToken();
      fill(STRONG, 'Otra1234@');

      submit();

      expect(await screen.findByText('Las contraseñas no coinciden')).toBeInTheDocument();
      expect(api.post).not.toHaveBeenCalled();
    });

    it('rechaza una contrasena debil sin llamar a la API', async () => {
      renderWithToken();
      fill('abc', 'abc');

      submit();

      expect(await screen.findByText('Contraseña débil')).toBeInTheDocument();
      expect(api.post).not.toHaveBeenCalled();
    });

    it('envia el token y las contrasenas y lleva al login', async () => {
      renderWithToken();
      fill(STRONG, STRONG);

      submit();

      expect(await screen.findByText('Pantalla de login')).toBeInTheDocument();
      expect(api.post).toHaveBeenCalledWith(
        ENDPOINTS.AUTH.RESET_PASSWORD,
        { token: 'tok-123', newPassword: STRONG, confirmPassword: STRONG },
        undefined,
      );
    });

    it('si la API falla se queda en la pantalla y vuelve a habilitar el boton', async () => {
      vi.mocked(api.post).mockRejectedValue(new Error('token caducado'));
      renderWithToken();
      fill(STRONG, STRONG);

      submit();

      await waitFor(() => expect(api.post).toHaveBeenCalled());
      await waitFor(() =>
        expect(screen.getByRole('button', { name: 'Guardar Contraseña' })).toBeEnabled(),
      );
      expect(screen.queryByText('Pantalla de login')).not.toBeInTheDocument();
      expect(screen.getByText('Crea tu nueva contraseña')).toBeInTheDocument();
    });
  });

  describe('estructura del DOM', () => {
    // Verificador mecanico de la regla de oro del JSX.
    it('el formulario conserva su estructura', () => {
      const { container } = renderWithToken();

      expect(normalizeIds(container.innerHTML)).toMatchSnapshot();
    });
  });
});

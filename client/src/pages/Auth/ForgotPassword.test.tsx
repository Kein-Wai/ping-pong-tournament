import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen, fireEvent, waitFor } from '@testing-library/react';
import { Routes, Route } from 'react-router-dom';
import { api } from '../../api/axios';
import { ENDPOINTS } from '../../api/endpoints';
import { APP_ROUTES } from '../../constants/routes';
import { normalizeIds, renderWithProviders } from '../../test/utils';
import { ForgotPassword } from './ForgotPassword';

// Se mockea el `api` de bajo nivel (la frontera del sistema) y no los servicios,
// para que estos tests sigan valiendo cuando el acceso a datos migre a servicios.
vi.mock('../../api/axios', () => ({
  api: {
    post: vi.fn(),
  },
}));

const renderPage = () =>
  renderWithProviders(
    <Routes>
      <Route path={APP_ROUTES.FORGOT_PASSWORD} element={<ForgotPassword />} />
      <Route path={APP_ROUTES.LOGIN} element={<div>Pantalla de login</div>} />
    </Routes>,
    { initialEntries: [APP_ROUTES.FORGOT_PASSWORD] },
  );

const fillEmail = (value = 'ana@test.com') =>
  fireEvent.change(screen.getByLabelText(/Correo electrónico/), { target: { value } });

// jsdom bloquea el envio por clic con campos `required` vacios: se envia el formulario.
const submit = () =>
  fireEvent.submit(screen.getByRole('button', { name: 'Restablecer' }).closest('form')!);

describe('ForgotPassword', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // La API responde solo { message }, sin sobre { success, data }.
    vi.mocked(api.post).mockResolvedValue({ data: { message: 'Correo enviado' } } as never);
  });

  it('muestra el formulario para pedir el enlace', () => {
    renderPage();

    expect(screen.getByText('¿Has olvidado tu contraseña?')).toBeInTheDocument();
    expect(screen.getByLabelText(/Correo electrónico/)).toBeInTheDocument();
  });

  it('envía el correo escrito', async () => {
    renderPage();
    fillEmail();

    submit();

    await waitFor(() =>
      expect(api.post).toHaveBeenCalledWith(
        ENDPOINTS.AUTH.FORGOT_PASSWORD,
        { email: 'ana@test.com' },
        undefined,
      ),
    );
  });

  it('sin correo no llama a la API', () => {
    renderPage();

    submit();

    expect(api.post).not.toHaveBeenCalled();
  });

  it('tras enviar muestra el aviso de revisar la bandeja de entrada', async () => {
    renderPage();
    fillEmail();

    submit();

    expect(await screen.findByText('Revisa tu bandeja de entrada')).toBeInTheDocument();
    expect(screen.queryByLabelText(/Correo electrónico/)).not.toBeInTheDocument();
  });

  it('desde el aviso «Volver al Login» lleva al login', async () => {
    renderPage();
    fillEmail();
    submit();
    await screen.findByText('Revisa tu bandeja de entrada');

    fireEvent.click(screen.getByRole('button', { name: 'Volver al Login' }));

    expect(await screen.findByText('Pantalla de login')).toBeInTheDocument();
  });

  it('el enlace «Volver al Login» del formulario lleva al login', async () => {
    renderPage();

    fireEvent.click(screen.getByText('Volver al Login'));

    expect(await screen.findByText('Pantalla de login')).toBeInTheDocument();
  });

  it('si la petición falla, se queda en el formulario y vuelve a habilitar el botón', async () => {
    vi.spyOn(console, 'log').mockImplementation(() => undefined);
    vi.mocked(api.post).mockRejectedValue(new Error('500'));
    renderPage();
    fillEmail();

    submit();

    await waitFor(() => expect(api.post).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(screen.getByRole('button', { name: 'Restablecer' })).not.toBeDisabled());
    expect(screen.queryByText('Revisa tu bandeja de entrada')).not.toBeInTheDocument();
  });

  it('el DOM del formulario no cambia', () => {
    const { container } = renderPage();

    expect(normalizeIds(container.innerHTML)).toMatchSnapshot();
  });
});

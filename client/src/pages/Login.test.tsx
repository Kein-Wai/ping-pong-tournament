import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { screen, fireEvent, waitFor, act, within } from '@testing-library/react';
import { Routes, Route } from 'react-router-dom';
import { Capacitor } from '@capacitor/core';
import { SocialLogin } from '@capgo/capacitor-social-login';
import { api } from '../api/axios';
import { ENDPOINTS } from '../api/endpoints';
import DICTIONARY from '../constants/dictionary.json';
import { APP_ROUTES } from '../constants/routes';
import { useAuthStore } from '../store/authStore';
import { normalizeIds, renderWithProviders } from '../test/utils';
import { Login } from './Login';

// Se mockea el `api` de bajo nivel (la frontera del sistema) y no los servicios,
// para que estos tests sigan valiendo cuando el acceso a datos migre a servicios.
vi.mock('../api/axios', () => ({
  api: {
    post: vi.fn(),
  },
}));

// SDKs externos: son la frontera con Google y con la plataforma nativa.
vi.mock('@capacitor/core', () => ({
  Capacitor: { isNativePlatform: vi.fn(() => false) },
}));
vi.mock('@capgo/capacitor-social-login', () => ({
  SocialLogin: { initialize: vi.fn(), login: vi.fn() },
}));
vi.mock('@react-oauth/google', () => ({
  GoogleLogin: ({
    onSuccess,
    onError,
  }: {
    onSuccess: (response: { credential: string }) => void;
    onError: () => void;
  }) => (
    <div>
      <button onClick={() => onSuccess({ credential: 'google-cred' })}>Google web</button>
      <button onClick={() => onError()}>Google web con error</button>
    </div>
  ),
}));

// Mantine genera ids y `name` con mayusculas que normalizeIds no cubre.
const stableHtml = (html: string) =>
  normalizeIds(html).replace(/mantine-[a-z0-9]{9,}/g, 'mantine-id');

const makeToken = (payload: Record<string, unknown>) =>
  `cabecera.${btoa(String.fromCharCode(...new TextEncoder().encode(JSON.stringify(payload))))}.firma`;

const FULL_PAYLOAD = {
  id: 'u1',
  email: 'ana@test.com',
  name: 'Ana',
  surname: 'Gil',
  nickname: 'Anita',
  avatarUrl: 'http://avatar',
  role: 'Player',
  clubId: 'club-1',
  clubStatus: 'Aprobado',
  dominantHand: 'Diestro',
  playstyle: 'Ofensivo',
  birthDate: '2000-01-01',
  authProvider: 'local',
  forcePasswordChange: false,
};

// La API responde FUERA del sobre { success, data }: { message, token }.
const tokenResponse = (payload: Record<string, unknown> = FULL_PAYLOAD) => ({
  data: { message: 'ok', token: makeToken(payload) },
});

const backendError = (message: string) =>
  Object.assign(new Error('Request failed'), { response: { status: 400, data: { error: message } } });

const renderPage = (url: string = APP_ROUTES.LOGIN) =>
  renderWithProviders(
    <Routes>
      <Route path={APP_ROUTES.LOGIN} element={<Login />} />
      <Route path={APP_ROUTES.HOME} element={<div>Pantalla de inicio</div>} />
      <Route path={APP_ROUTES.FORGOT_PASSWORD} element={<div>Pantalla de recuperar</div>} />
      <Route path={APP_ROUTES.LEGAL} element={<div>Pantalla de privacidad</div>} />
    </Routes>,
    { initialEntries: [url] },
  );

// Mantine mantiene montados los dos paneles de pestañas: se trabaja dentro del visible.
const panel = () => within(screen.getByRole('tabpanel'));

const fillLogin = (email = 'ana@test.com', password = 'Secreto1@') => {
  fireEvent.change(panel().getByLabelText(/^Correo electrónico/), { target: { value: email } });
  fireEvent.change(panel().getByLabelText(/^Contraseña/), { target: { value: password } });
};

const submitLogin = () => fireEvent.click(screen.getByRole('button', { name: 'Iniciar Sesión' }));

const goToRegister = () => fireEvent.click(screen.getByRole('tab', { name: /Registrarse/ }));

const fillRegister = (overrides: Record<string, string> = {}) => {
  const values = {
    name: 'Ana',
    surname: 'Gil',
    secondSurname: '',
    email: 'ana@test.com',
    password: 'Secreto1@',
    confirm: 'Secreto1@',
    ...overrides,
  };
  fireEvent.change(panel().getByLabelText(/^Nombre/), { target: { value: values.name } });
  fireEvent.change(panel().getByLabelText(/^Primer Apellido/), { target: { value: values.surname } });
  fireEvent.change(panel().getByLabelText(/^Segundo Apellido/), {
    target: { value: values.secondSurname },
  });
  fireEvent.change(panel().getByLabelText(/^Correo electrónico/), { target: { value: values.email } });
  fireEvent.change(panel().getByLabelText(/^Contraseña/), { target: { value: values.password } });
  fireEvent.change(panel().getByLabelText(/^Confirmar Contraseña/), {
    target: { value: values.confirm },
  });
  fireEvent.click(panel().getByRole('checkbox'));
};

const submitRegister = () =>
  fireEvent.click(panel().getByRole('button', { name: /^Crear Cuenta/ }));

describe('Login', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(Capacitor.isNativePlatform).mockReturnValue(false);
    useAuthStore.setState({ token: null, user: null, isAuthenticated: false });
    localStorage.clear();
    vi.mocked(api.post).mockResolvedValue(tokenResponse() as never);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('iniciar sesion', () => {
    it('muestra el titulo, las pestañas y el formulario de acceso', () => {
      renderPage();

      expect(screen.getByText(DICTIONARY.app_title)).toBeInTheDocument();
      expect(screen.getByRole('tab', { name: /Ingresar/ })).toHaveAttribute('aria-selected', 'true');
      expect(screen.getByRole('button', { name: 'Iniciar Sesión' })).toBeInTheDocument();
      expect(SocialLogin.initialize).toHaveBeenCalledTimes(1);
    });

    it('envia el correo y la contraseña', async () => {
      renderPage();
      fillLogin();

      submitLogin();

      await waitFor(() =>
        expect(api.post).toHaveBeenCalledWith(
          ENDPOINTS.AUTH.LOGIN,
          { email: 'ana@test.com', password: 'Secreto1@' },
          undefined,
        ),
      );
    });

    it('guarda la sesion con los datos del token y lleva al inicio', async () => {
      renderPage();
      fillLogin();

      submitLogin();

      expect(await screen.findByText('Pantalla de inicio')).toBeInTheDocument();
      expect(useAuthStore.getState().isAuthenticated).toBe(true);
      expect(useAuthStore.getState().token).toBe(makeToken(FULL_PAYLOAD));
      expect(useAuthStore.getState().user).toMatchObject({
        id: 'u1',
        email: 'ana@test.com',
        name: 'Ana',
        surname: 'Gil',
        nickname: 'Anita',
        avatarUrl: 'http://avatar',
        role: 'Player',
        clubId: 'club-1',
        clubStatus: 'Aprobado',
        dominantHand: 'Diestro',
        playstyle: 'Ofensivo',
        birthDate: '2000-01-01',
        authProvider: 'local',
        forcePasswordChange: false,
      });
    });

    it('rellena los valores por defecto cuando el token trae pocos datos', async () => {
      vi.mocked(api.post).mockResolvedValue(
        tokenResponse({ id: 'u2', email: 'luis@test.com', role: 'AdminClub' }) as never,
      );
      renderPage();
      fillLogin('luis@test.com');

      submitLogin();

      await screen.findByText('Pantalla de inicio');
      expect(useAuthStore.getState().user).toMatchObject({
        id: 'u2',
        name: 'Jugador',
        surname: '',
        avatarUrl: null,
        clubId: null,
        clubStatus: null,
        dominantHand: null,
        playstyle: null,
        birthDate: null,
      });
    });

    it('interpreta correctamente los acentos del token', async () => {
      vi.mocked(api.post).mockResolvedValue(
        tokenResponse({ ...FULL_PAYLOAD, name: 'José Ángel', surname: 'Muñoz' }) as never,
      );
      renderPage();
      fillLogin();

      submitLogin();

      await screen.findByText('Pantalla de inicio');
      expect(useAuthStore.getState().user).toMatchObject({ name: 'José Ángel', surname: 'Muñoz' });
    });

    it('muestra el mensaje de error que envia el servidor y rehabilita el boton', async () => {
      vi.mocked(api.post).mockRejectedValue(backendError('Credenciales inválidas'));
      renderPage();
      fillLogin();

      submitLogin();

      expect(await screen.findByText('Credenciales inválidas')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Iniciar Sesión' })).toBeEnabled();
      expect(useAuthStore.getState().isAuthenticated).toBe(false);
    });

    it('si no hay respuesta del servidor avisa de un error de conexion', async () => {
      vi.mocked(api.post).mockRejectedValue(new Error('Network Error'));
      renderPage();
      fillLogin();

      submitLogin();

      expect(await screen.findByText('Error de conexión con el servidor')).toBeInTheDocument();
    });

    it('«¿Olvidaste tu contraseña?» lleva a recuperarla', async () => {
      renderPage();

      fireEvent.click(screen.getByText('¿Olvidaste tu contraseña?'));

      expect(await screen.findByText('Pantalla de recuperar')).toBeInTheDocument();
    });

    it('avisa de que la cuenta esta verificada cuando llega ?verified y limpia la URL', async () => {
      renderPage(`${APP_ROUTES.LOGIN}?verified=1`);

      expect(
        await screen.findByText('¡Cuenta verificada con éxito! Ya puedes iniciar sesión'),
      ).toBeInTheDocument();
    });

    it('muestra el aviso de servidor lento si la peticion tarda mas de cinco segundos', async () => {
      vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] });
      let release: (value: unknown) => void = () => {};
      vi.mocked(api.post).mockReturnValue(new Promise((resolve) => (release = resolve)) as never);
      renderPage();
      fillLogin();

      submitLogin();
      expect(screen.queryByText(/Despertando al servidor/)).not.toBeInTheDocument();
      await act(async () => {
        await vi.advanceTimersByTimeAsync(5000);
      });

      expect(screen.getByText(/Despertando al servidor/)).toBeInTheDocument();
      await act(async () => {
        release(tokenResponse());
        await vi.advanceTimersByTimeAsync(0);
      });
      expect(screen.queryByText(/Despertando al servidor/)).not.toBeInTheDocument();
    });
  });

  describe('registrarse', () => {
    it('al cambiar de pestaña se limpia el mensaje de error', async () => {
      vi.mocked(api.post).mockRejectedValue(backendError('Credenciales inválidas'));
      renderPage();
      fillLogin();
      submitLogin();
      await screen.findByText('Credenciales inválidas');

      goToRegister();

      expect(screen.queryByText('Credenciales inválidas')).not.toBeInTheDocument();
    });

    it('el boton cambia segun el rol y exige aceptar la politica de privacidad', () => {
      renderPage();
      goToRegister();
      const create = screen.getByRole('button', { name: 'Crear Cuenta Libre' });
      expect(create).toBeDisabled();

      fireEvent.click(screen.getByRole('checkbox'));
      expect(create).toBeEnabled();

      fireEvent.click(screen.getByText('Fundar Club'));
      expect(screen.getByRole('button', { name: 'Crear Cuenta de Sede' })).toBeEnabled();
    });

    it('rechaza contraseñas distintas sin llamar a la API', async () => {
      renderPage();
      goToRegister();
      fillRegister({ confirm: 'Otra1234@' });

      submitRegister();

      expect(await screen.findByText('Las contraseñas no coinciden')).toBeInTheDocument();
      expect(api.post).not.toHaveBeenCalled();
    });

    it('envia el registro de un jugador libre con el segundo apellido vacio como nulo', async () => {
      vi.mocked(api.post).mockResolvedValue({ data: { message: 'Registrado' } } as never);
      renderPage();
      goToRegister();
      fillRegister();

      submitRegister();

      await waitFor(() =>
        expect(api.post).toHaveBeenCalledWith(
          ENDPOINTS.AUTH.REGISTER,
          {
            email: 'ana@test.com',
            password: 'Secreto1@',
            confirmPassword: 'Secreto1@',
            name: 'Ana',
            surname: 'Gil',
            secondSurname: null,
            role: 'Player',
          },
          undefined,
        ),
      );
    });

    it('envia el rol y el segundo apellido elegidos al fundar un club', async () => {
      vi.mocked(api.post).mockResolvedValue({ data: { message: 'Registrado' } } as never);
      renderPage();
      goToRegister();
      fireEvent.click(screen.getByText('Fundar Club'));
      fillRegister({ secondSurname: 'Pérez' });

      submitRegister();

      await waitFor(() => expect(api.post).toHaveBeenCalled());
      expect(vi.mocked(api.post).mock.calls[0][1]).toMatchObject({
        secondSurname: 'Pérez',
        role: 'AdminClub',
      });
    });

    it('tras registrarse limpia el formulario y vuelve a la pestaña de acceso', async () => {
      vi.mocked(api.post).mockResolvedValue({ data: { message: 'Registrado' } } as never);
      renderPage();
      goToRegister();
      fillRegister();

      submitRegister();

      await waitFor(() =>
        expect(screen.getByRole('tab', { name: /Ingresar/ })).toHaveAttribute('aria-selected', 'true'),
      );
      expect(panel().getByLabelText(/^Correo electrónico/)).toHaveValue('');
      expect(useAuthStore.getState().isAuthenticated).toBe(false);
    });

    it('si el registro falla muestra el error y se queda en la pestaña', async () => {
      vi.mocked(api.post).mockRejectedValue(backendError('El correo ya existe'));
      renderPage();
      goToRegister();
      fillRegister();

      submitRegister();

      expect(await screen.findByText('El correo ya existe')).toBeInTheDocument();
      expect(screen.getByRole('tab', { name: /Registrarse/ })).toHaveAttribute('aria-selected', 'true');
    });
  });

  describe('Google en la web', () => {
    it('envia la credencial de Google como jugador y abre la sesion', async () => {
      renderPage();

      fireEvent.click(screen.getByRole('button', { name: 'Google web' }));

      expect(await screen.findByText('Pantalla de inicio')).toBeInTheDocument();
      expect(api.post).toHaveBeenCalledWith(
        ENDPOINTS.AUTH.GOOGLE,
        { credential: 'google-cred', role: 'Player' },
        undefined,
      );
      expect(useAuthStore.getState().isAuthenticated).toBe(true);
    });

    it('desde la pestaña de registro envia el rol elegido', async () => {
      renderPage();
      goToRegister();
      fireEvent.click(screen.getByText('Fundar Club'));

      fireEvent.click(screen.getByRole('button', { name: 'Google web' }));

      await waitFor(() => expect(api.post).toHaveBeenCalled());
      expect(vi.mocked(api.post).mock.calls[0][1]).toEqual({
        credential: 'google-cred',
        role: 'AdminClub',
      });
    });

    it('si el servidor rechaza la credencial muestra su mensaje', async () => {
      vi.mocked(api.post).mockRejectedValue(backendError('Cuenta de Google no válida'));
      renderPage();

      fireEvent.click(screen.getByRole('button', { name: 'Google web' }));

      expect(await screen.findByText('Cuenta de Google no válida')).toBeInTheDocument();
    });

    it('si Google falla avisa de un error interno', async () => {
      renderPage();

      fireEvent.click(screen.getByRole('button', { name: 'Google web con error' }));

      expect(await screen.findByText('Error interno al conectar con Google')).toBeInTheDocument();
      expect(api.post).not.toHaveBeenCalled();
    });
  });

  describe('Google en iOS / Android', () => {
    beforeEach(() => {
      vi.mocked(Capacitor.isNativePlatform).mockReturnValue(true);
    });

    it('ofrece el boton nativo en lugar del componente web', () => {
      renderPage();

      expect(screen.getByRole('button', { name: 'Continuar con Google' })).toBeInTheDocument();
      expect(screen.queryByRole('button', { name: 'Google web' })).not.toBeInTheDocument();
    });

    it('envia el idToken que devuelve el plugin y abre la sesion', async () => {
      vi.mocked(SocialLogin.login).mockResolvedValue({ result: { idToken: 'native-token' } } as never);
      renderPage();

      fireEvent.click(screen.getByRole('button', { name: 'Continuar con Google' }));

      expect(await screen.findByText('Pantalla de inicio')).toBeInTheDocument();
      expect(SocialLogin.login).toHaveBeenCalledWith({ provider: 'google', options: {} });
      expect(api.post).toHaveBeenCalledWith(
        ENDPOINTS.AUTH.GOOGLE,
        { credential: 'native-token', role: 'Player' },
        undefined,
      );
    });

    it('acepta el idToken anidado en authentication', async () => {
      vi.mocked(SocialLogin.login).mockResolvedValue({
        result: { authentication: { idToken: 'anidado' } },
      } as never);
      renderPage();

      fireEvent.click(screen.getByRole('button', { name: 'Continuar con Google' }));

      await waitFor(() => expect(api.post).toHaveBeenCalled());
      expect(vi.mocked(api.post).mock.calls[0][1]).toMatchObject({ credential: 'anidado' });
    });

    it('si el plugin no devuelve token avisa del error y no llama a la API', async () => {
      const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
      const alertSpy = vi.spyOn(window, 'alert').mockImplementation(() => {});
      vi.mocked(SocialLogin.login).mockResolvedValue({ result: {} } as never);
      renderPage();

      fireEvent.click(screen.getByRole('button', { name: 'Continuar con Google' }));

      expect(await screen.findByText('Error al iniciar sesión con Google')).toBeInTheDocument();
      expect(alertSpy).toHaveBeenCalled();
      expect(consoleError).toHaveBeenCalled();
      expect(api.post).not.toHaveBeenCalled();
    });

    it.each(['user canceled', 'User cancelled login'])(
      'si el usuario cancela («%s») no muestra ningun error',
      async (message) => {
        const alertSpy = vi.spyOn(window, 'alert').mockImplementation(() => {});
        vi.mocked(SocialLogin.login).mockRejectedValue(new Error(message));
        renderPage();

        fireEvent.click(screen.getByRole('button', { name: 'Continuar con Google' }));

        await waitFor(() => expect(SocialLogin.login).toHaveBeenCalled());
        await waitFor(() =>
          expect(screen.getByRole('button', { name: 'Continuar con Google' })).toBeEnabled(),
        );
        expect(screen.queryByText('Error al iniciar sesión con Google')).not.toBeInTheDocument();
        expect(alertSpy).not.toHaveBeenCalled();
      },
    );
  });

  describe('politica de privacidad', () => {
    it('el enlace junto a Google lleva a la politica', async () => {
      renderPage();

      fireEvent.click(screen.getAllByText('Política de Privacidad')[0]);

      expect(await screen.findByText('Pantalla de privacidad')).toBeInTheDocument();
    });
  });

  describe('fondo', () => {
    // Un fondo remoto deja la app nativa sin imagen cuando no hay red.
    it('usa la imagen incluida en la app y no una URL externa', () => {
      const { container } = renderPage();

      const background = container.querySelector<HTMLElement>('[style*="background-image"]');

      expect(background?.style.backgroundImage).toContain('login-bg');
      expect(background?.style.backgroundImage).not.toContain('unsplash');
    });
  });

  describe('estructura del DOM', () => {
    // Verificador mecanico de la regla de oro del JSX.
    it('la pantalla de acceso conserva su estructura', () => {
      const { container } = renderPage();

      expect(stableHtml(container.innerHTML)).toMatchSnapshot();
    });
  });
});

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen, fireEvent, waitFor } from '@testing-library/react';
import { Routes, Route } from 'react-router-dom';
import { api } from '../../api/axios';
import { ENDPOINTS } from '../../api/endpoints';
import { APP_ROUTES } from '../../constants/routes';
import { useAuthStore, type User } from '../../store/authStore';
import { normalizeIds, renderWithProviders } from '../../test/utils';
import { MainLayout } from './MainLayout';

// Se mockea el `api` de bajo nivel (la frontera del sistema) y no los servicios,
// para que estos tests sigan valiendo cuando el acceso a datos migre a servicios.
vi.mock('../../api/axios', () => ({
  api: {
    get: vi.fn(),
    put: vi.fn(),
  },
}));

const makeUser = (overrides: Partial<User> = {}): User => ({
  id: 'u1',
  email: 'ana@test.com',
  name: 'Ana',
  role: 'Player',
  clubId: 'club-1',
  clubStatus: 'Aprobado',
  dominantHand: 'Diestro',
  playstyle: 'Ofensivo',
  rubberForehand: 'LISA',
  rubberBackhand: 'LISA',
  birthDate: '2000-01-01',
  ...overrides,
});

const loginAs = (overrides: Partial<User> = {}) => {
  useAuthStore.setState({
    token: 'token-test',
    user: makeUser(overrides),
    isAuthenticated: true,
  });
};

const renderLayout = () =>
  renderWithProviders(
    <Routes>
      <Route path={APP_ROUTES.HOME} element={<MainLayout />} />
      <Route path={APP_ROUTES.LOGIN} element={<div>Pantalla de login</div>} />
      <Route path={APP_ROUTES.TORNEOS.LIST} element={<div>Pantalla de torneos</div>} />
    </Routes>,
  );

const visibleLabels = (labels: string[]) =>
  labels.filter((label) => screen.queryByText(label) !== null);

describe('MainLayout', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    useAuthStore.setState({ token: null, user: null, isAuthenticated: false });
    vi.mocked(api.get).mockResolvedValue({
      data: { data: { pendingMembers: 0, pendingTournaments: 0 } },
    } as never);
    vi.mocked(api.put).mockResolvedValue({ data: { data: {} } } as never);
  });

  describe('menu de navegacion por rol', () => {
    const ALL_ITEMS = [
      'Inicio',
      'Panel Global',
      'Mi Club',
      'Mi Perfil',
      'Jugadores',
      'Equipos',
      'Unirse a un Club',
      'Torneos',
      'Calendario Oficial',
      'Entrenamientos Grupales',
      'Ejercicios',
      'Historial',
      'Estadísticas',
      'Análisis Pro',
      'Bandeja de Soporte',
      'Sugerencias y Bugs',
    ];

    it('SuperAdmin ve el panel global y la bandeja de soporte, pero no las secciones de club', () => {
      loginAs({ role: 'SuperAdmin', clubId: null, clubStatus: null });

      renderLayout();

      expect(visibleLabels(ALL_ITEMS)).toEqual([
        'Inicio',
        'Panel Global',
        'Jugadores',
        'Torneos',
        'Calendario Oficial',
        'Ejercicios',
        'Historial',
        'Estadísticas',
        'Bandeja de Soporte',
      ]);
    });

    it('AdminClub ve las secciones de gestion de su club', () => {
      loginAs({ role: 'AdminClub' });

      renderLayout();

      expect(visibleLabels(ALL_ITEMS)).toEqual([
        'Inicio',
        'Mi Club',
        'Jugadores',
        'Equipos',
        'Torneos',
        'Calendario Oficial',
        'Entrenamientos Grupales',
        'Ejercicios',
        'Historial',
        'Estadísticas',
        'Sugerencias y Bugs',
      ]);
    });

    it('Player con club aprobado ve su perfil, su club y el analisis pro', () => {
      loginAs({ role: 'Player', clubStatus: 'Aprobado' });

      renderLayout();

      expect(visibleLabels(ALL_ITEMS)).toEqual([
        'Inicio',
        'Mi Club',
        'Mi Perfil',
        'Jugadores',
        'Equipos',
        'Torneos',
        'Calendario Oficial',
        'Historial',
        'Estadísticas',
        'Análisis Pro',
        'Sugerencias y Bugs',
      ]);
    });

    it('Player sin club solo puede unirse a uno, ver torneos y su perfil', () => {
      loginAs({ role: 'Player', clubId: null, clubStatus: null });

      renderLayout();

      expect(visibleLabels(ALL_ITEMS)).toEqual([
        'Inicio',
        'Mi Perfil',
        'Unirse a un Club',
        'Torneos',
        'Análisis Pro',
        'Sugerencias y Bugs',
      ]);
    });

    it.each(['Pendiente', 'pendiente', 'Rechazado'])(
      'Player con club en estado %s se trata como si no tuviera club',
      (clubStatus) => {
        loginAs({ role: 'Player', clubStatus });

        renderLayout();

        expect(screen.getByText('Unirse a un Club')).toBeInTheDocument();
        expect(screen.queryByText('Jugadores')).not.toBeInTheDocument();
        expect(screen.queryByText('Mi Club')).not.toBeInTheDocument();
      },
    );
  });

  describe('insignias de notificaciones', () => {
    it('AdminClub carga las notificaciones de su club y muestra las insignias', async () => {
      vi.mocked(api.get).mockResolvedValue({
        data: { data: { pendingMembers: 3, pendingTournaments: 2 } },
      } as never);
      loginAs({ role: 'AdminClub' });

      renderLayout();

      expect(await screen.findByText('3')).toBeInTheDocument();
      expect(screen.getByText('2')).toBeInTheDocument();
      expect(api.get).toHaveBeenCalledWith(ENDPOINTS.CLUBS.NOTIFICATIONS('club-1'));
    });

    it('recarga las notificaciones al recibir el evento refresh-notifications', async () => {
      loginAs({ role: 'AdminClub' });
      renderLayout();
      await waitFor(() => expect(api.get).toHaveBeenCalledTimes(1));

      window.dispatchEvent(new CustomEvent('refresh-notifications'));

      await waitFor(() => expect(api.get).toHaveBeenCalledTimes(2));
    });

    it.each(['Player', 'SuperAdmin'])('%s no consulta las notificaciones', (role) => {
      loginAs({ role });

      renderLayout();

      expect(api.get).not.toHaveBeenCalled();
    });
  });

  describe('onboarding del jugador', () => {
    it('Player con el perfil incompleto ve el modal con el boton desactivado', async () => {
      loginAs({ role: 'Player', dominantHand: null });

      renderLayout();

      expect(await screen.findByText('¡Último paso, Ana!')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Completar mi Perfil' })).toBeDisabled();
    });

    it('no vuelve a mostrar el modal si el jugador ya lo completo en este navegador', () => {
      localStorage.setItem('onboarding_done_u1', 'true');
      loginAs({ role: 'Player', dominantHand: null });

      renderLayout();

      expect(screen.queryByText('Completar mi Perfil')).not.toBeInTheDocument();
    });

    it('no muestra el modal si el perfil esta completo', () => {
      loginAs({ role: 'Player' });

      renderLayout();

      expect(screen.queryByText('Completar mi Perfil')).not.toBeInTheDocument();
    });

    it('un AdminClub con el perfil incompleto no ve el modal', () => {
      loginAs({ role: 'AdminClub', dominantHand: null });

      renderLayout();

      expect(screen.queryByText('Completar mi Perfil')).not.toBeInTheDocument();
    });
  });

  describe('cambio de contrasena obligatorio', () => {
    const fillPasswords = (current: string, next: string, confirm: string) => {
      fireEvent.change(screen.getByLabelText(/Contraseña Temporal/), {
        target: { value: current },
      });
      fireEvent.change(screen.getByLabelText(/^Nueva Contraseña/), { target: { value: next } });
      fireEvent.change(screen.getByLabelText(/Confirmar Nueva Contraseña/), {
        target: { value: confirm },
      });
    };

    it('muestra el modal cuando el usuario debe cambiar la contrasena', async () => {
      loginAs({ forcePasswordChange: true });

      renderLayout();

      expect(await screen.findByText('Cambio de Contraseña')).toBeInTheDocument();
    });

    it('no muestra el modal cuando no hay cambio obligatorio', () => {
      loginAs({ forcePasswordChange: false });

      renderLayout();

      expect(screen.queryByText('Cambio de Contraseña')).not.toBeInTheDocument();
    });

    it('mantiene el boton desactivado mientras las contrasenas no coincidan', async () => {
      loginAs({ forcePasswordChange: true });
      renderLayout();
      await screen.findByText('Cambio de Contraseña');

      fillPasswords('Temp1234@', 'Abcdef1@', 'Otra1234@');

      expect(screen.getByRole('button', { name: 'Actualizar y Entrar' })).toBeDisabled();
    });

    it('rechaza una contrasena debil sin llamar a la API', async () => {
      loginAs({ forcePasswordChange: true });
      renderLayout();
      await screen.findByText('Cambio de Contraseña');
      fillPasswords('Temp1234@', 'abc', 'abc');

      fireEvent.click(screen.getByRole('button', { name: 'Actualizar y Entrar' }));

      expect(await screen.findByText('Contraseña débil')).toBeInTheDocument();
      expect(api.put).not.toHaveBeenCalled();
    });

    it('guarda la contrasena fuerte, actualiza el usuario y cierra el modal', async () => {
      loginAs({ forcePasswordChange: true });
      renderLayout();
      await screen.findByText('Cambio de Contraseña');
      fillPasswords('Temp1234@', 'Abcdef1@', 'Abcdef1@');

      fireEvent.click(screen.getByRole('button', { name: 'Actualizar y Entrar' }));

      await waitFor(() =>
        expect(api.put).toHaveBeenCalledWith(ENDPOINTS.USERS.ME, {
          currentPassword: 'Temp1234@',
          newPassword: 'Abcdef1@',
          confirmPassword: 'Abcdef1@',
        }),
      );
      await waitFor(() =>
        expect(useAuthStore.getState().user?.forcePasswordChange).toBe(false),
      );
      await waitFor(() =>
        expect(screen.queryByText('Actualizar y Entrar')).not.toBeInTheDocument(),
      );
    });
  });

  describe('estructura del DOM', () => {
    // Verificador mecanico de la regla de oro del JSX: si una extraccion cambia
    // el HTML renderizado, este snapshot falla. Los ids de Mantine se normalizan
    // porque se generan en cada render.
    it('el layout de un SuperAdmin conserva su estructura', () => {
      loginAs({ role: 'SuperAdmin', clubId: null, clubStatus: null });

      const { container } = renderLayout();

      expect(normalizeIds(container.innerHTML)).toMatchSnapshot();
    });
  });

  describe('navegacion y sesion', () => {
    it('navega a la pantalla del elemento del menu pulsado', async () => {
      loginAs({ role: 'AdminClub' });
      renderLayout();

      fireEvent.click(screen.getByText('Torneos'));

      expect(await screen.findByText('Pantalla de torneos')).toBeInTheDocument();
    });

    it('cerrar sesion limpia la sesion y lleva a la pantalla de login', async () => {
      localStorage.setItem('pingpong_token', 'token-test');
      loginAs({ role: 'AdminClub' });
      renderLayout();

      fireEvent.click(screen.getByText('Ana'));
      fireEvent.click(await screen.findByText('Cerrar Sesión'));

      expect(await screen.findByText('Pantalla de login')).toBeInTheDocument();
      expect(useAuthStore.getState().user).toBeNull();
      expect(localStorage.getItem('pingpong_token')).toBeNull();
    });

    it('el menu de usuario ofrece "Mi Perfil" solo a los jugadores', async () => {
      loginAs({ role: 'AdminClub' });
      renderLayout();

      fireEvent.click(screen.getByText('Ana'));
      await screen.findByText('Cerrar Sesión');

      expect(screen.queryAllByText('Mi Perfil')).toHaveLength(0);
    });
  });
});

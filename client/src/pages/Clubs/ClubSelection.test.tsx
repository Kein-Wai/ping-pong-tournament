import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen, fireEvent, waitFor, within } from '@testing-library/react';
import { api } from '../../api/axios';
import { ENDPOINTS } from '../../api/endpoints';
import { useAuthStore } from '../../store/authStore';
import { loginAs, normalizeIds, renderWithProviders } from '../../test/utils';
import { ClubSelection } from './ClubSelection';

// Se mockea el `api` de bajo nivel (la frontera del sistema) y no los servicios,
// para que estos tests sigan valiendo cuando el acceso a datos migre a servicios.
vi.mock('../../api/axios', () => ({
  api: {
    get: vi.fn(),
    post: vi.fn(),
  },
}));

const NORTE = {
  id: 'c1',
  name: 'Club Norte',
  city: 'Madrid',
  address: 'Calle Mayor 1',
  memberCount: 12,
  createdAt: '2021-06-15T10:00:00.000Z',
  foundedAt: '2020-03-05T10:00:00.000Z',
};
const SUR = {
  id: 'c2',
  name: 'Club Sur',
  city: 'Sevilla',
  memberCount: 3,
  createdAt: '2022-01-02T10:00:00.000Z',
};
const DEMO = {
  id: 'c3',
  name: '(demo) Club de Prueba',
  city: 'Valencia',
  memberCount: 1,
  createdAt: '2022-01-02T10:00:00.000Z',
};

const serve = (clubs: unknown[] = [NORTE, SUR, DEMO]) => {
  vi.mocked(api.get).mockResolvedValue({ data: { success: true, data: clubs } } as never);
};

const renderLoaded = async () => {
  const view = renderWithProviders(<ClubSelection />);
  await screen.findByRole('heading', { name: 'Clubes Disponibles' });
  return view;
};

// El nombre también aparece en el modal de confirmación mientras se cierra: solo cuenta el de la tarjeta.
const cardOf = (name: string) =>
  screen
    .getAllByText(name)
    .map((element) => element.closest('[class*="mantine-Card-root"]'))
    .find(Boolean) as HTMLElement;

describe('ClubSelection', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useAuthStore.setState({ token: null, user: null, isAuthenticated: false });
    serve();
    vi.mocked(api.post).mockResolvedValue({ data: { success: true } } as never);
    loginAs({ name: 'Ana', clubId: null });
  });

  describe('listado', () => {
    it('muestra un loader mientras carga los clubes', () => {
      renderWithProviders(<ClubSelection />);

      expect(document.querySelector('.mantine-Loader-root')).toBeInTheDocument();
    });

    it('pide los clubes y muestra una tarjeta por cada uno', async () => {
      await renderLoaded();

      expect(api.get).toHaveBeenCalledWith(ENDPOINTS.CLUBS.BASE, undefined);
      expect(screen.getByText('Club Norte')).toBeInTheDocument();
      expect(screen.getByText('Club Sur')).toBeInTheDocument();
    });

    it('muestra ciudad, dirección y número de miembros', async () => {
      await renderLoaded();

      const norte = within(cardOf('Club Norte'));
      expect(norte.getByText('📍 Madrid')).toBeInTheDocument();
      expect(norte.getByText('(Calle Mayor 1)')).toBeInTheDocument();
      expect(norte.getByText('12 miembros')).toBeInTheDocument();
      expect(within(cardOf('Club Sur')).queryByText(/^\(/)).not.toBeInTheDocument();
    });

    it('oculta los clubes de demostración sin distinguir mayúsculas', async () => {
      await renderLoaded();

      expect(screen.queryByText('(demo) Club de Prueba')).not.toBeInTheDocument();
    });

    it('avisa cuando no hay clubes', async () => {
      serve([]);

      await renderLoaded();

      expect(
        screen.getByText('No hay clubes registrados o activos en el sistema actualmente.'),
      ).toBeInTheDocument();
    });

    it('no rompe si falla la carga', async () => {
      const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
      vi.mocked(api.get).mockRejectedValue(new Error('red caida'));

      await renderLoaded();

      expect(
        screen.getByText('No hay clubes registrados o activos en el sistema actualmente.'),
      ).toBeInTheDocument();
      expect(consoleError).toHaveBeenCalled();
    });
  });

  describe('fecha de fundación', () => {
    // Los literales fijan el formato es-ES; vitest.config.ts fija TZ=UTC.
    it('muestra la fecha de fundación cuando existe', async () => {
      await renderLoaded();

      expect(within(cardOf('Club Norte')).getByText('Fundado el: 5/3/2020')).toBeInTheDocument();
    });

    it('usa la fecha de creación cuando no hay fecha de fundación', async () => {
      await renderLoaded();

      expect(within(cardOf('Club Sur')).getByText('Fundado el: 2/1/2022')).toBeInTheDocument();
    });
  });

  describe('cabecera según el estado del usuario', () => {
    it('saluda al jugador libre y le explica qué hacer', async () => {
      await renderLoaded();

      expect(screen.getByText('¡Bienvenido a la comunidad, Ana!')).toBeInTheDocument();
      expect(screen.getByText(/Actualmente eres un \*\*jugador libre\*\*/)).toBeInTheDocument();
      expect(screen.queryByText('Solicitud Pendiente de Aprobación')).not.toBeInTheDocument();
    });

    it('con una solicitud pendiente muestra el aviso en vez de la explicación', async () => {
      loginAs({ name: 'Ana', clubId: 'c1', clubStatus: 'Pendiente' });

      await renderLoaded();

      expect(screen.getByText('Solicitud Pendiente de Aprobación')).toBeInTheDocument();
      expect(screen.queryByText(/jugador libre/)).not.toBeInTheDocument();
    });

    it('"Salir / Cerrar sesión" cierra la sesión', async () => {
      await renderLoaded();

      fireEvent.click(screen.getByRole('button', { name: 'Salir / Cerrar sesión' }));

      expect(useAuthStore.getState().isAuthenticated).toBe(false);
      expect(useAuthStore.getState().user).toBeNull();
    });
  });

  describe('botones de solicitud', () => {
    it('un jugador libre puede solicitar acceso a cualquier club', async () => {
      await renderLoaded();

      expect(screen.getAllByRole('button', { name: 'Solicitar Acceso' })).toHaveLength(2);
      screen.getAllByRole('button', { name: 'Solicitar Acceso' }).forEach((button) => {
        expect(button).toBeEnabled();
      });
    });

    it('con una solicitud pendiente, el club solicitado la muestra y el resto se bloquea', async () => {
      loginAs({ name: 'Ana', clubId: 'c1', clubStatus: 'Pendiente' });

      await renderLoaded();

      expect(
        within(cardOf('Club Norte')).getByRole('button', { name: 'Esperando Aprobación' }),
      ).toBeEnabled();
      expect(within(cardOf('Club Sur')).getByRole('button', { name: 'Solicitar Acceso' })).toBeDisabled();
    });
  });

  describe('solicitar acceso', () => {
    const openConfirm = async (clubName: string) => {
      fireEvent.click(
        within(cardOf(clubName)).getByRole('button', { name: 'Solicitar Acceso' }),
      );
      await screen.findByText('Confirmar solicitud de acceso');
    };

    it('pide confirmación mostrando el club elegido, sin enviar nada todavía', async () => {
      await renderLoaded();

      await openConfirm('Club Sur');

      expect(
        screen.getByText('Estás a punto de enviar una solicitud para unirte a:'),
      ).toBeInTheDocument();
      expect(api.post).not.toHaveBeenCalled();
    });

    it('al confirmar envía la solicitud y deja al usuario con la solicitud pendiente', async () => {
      await renderLoaded();
      await openConfirm('Club Sur');

      fireEvent.click(screen.getByRole('button', { name: 'Enviar solicitud' }));

      await waitFor(() => expect(api.post).toHaveBeenCalledWith(ENDPOINTS.CLUBS.JOIN('c2'), undefined, undefined),
      );
      await waitFor(() =>
        expect(useAuthStore.getState().user).toMatchObject({ clubId: 'c2', clubStatus: 'Pendiente' }),
      );
      expect(await screen.findByText('Solicitud Pendiente de Aprobación')).toBeInTheDocument();
      expect(
        within(cardOf('Club Sur')).getByRole('button', { name: 'Esperando Aprobación' }),
      ).toBeInTheDocument();
    });

    it('"Volver atrás" no envía la solicitud', async () => {
      await renderLoaded();
      await openConfirm('Club Sur');

      fireEvent.click(screen.getByRole('button', { name: 'Volver atrás' }));

      await waitFor(() =>
        expect(screen.queryByText('Confirmar solicitud de acceso')).not.toBeInTheDocument(),
      );
      expect(api.post).not.toHaveBeenCalled();
      expect(useAuthStore.getState().user?.clubStatus).toBeUndefined();
    });

    it('si falla el envío, no cambia al usuario', async () => {
      vi.mocked(api.post).mockRejectedValue(new Error('red caida'));
      await renderLoaded();
      await openConfirm('Club Sur');

      fireEvent.click(screen.getByRole('button', { name: 'Enviar solicitud' }));

      await waitFor(() => expect(api.post).toHaveBeenCalled());
      await waitFor(() =>
        expect(within(cardOf('Club Sur')).getByRole('button', { name: 'Solicitar Acceso' })).toBeEnabled(),
      );
      expect(useAuthStore.getState().user?.clubStatus).toBeUndefined();
      expect(useAuthStore.getState().user?.clubId).toBeNull();
    });
  });

  describe('estructura del DOM', () => {
    // Verificador mecanico de la regla de oro del JSX: si una extraccion cambia
    // el HTML renderizado, este snapshot falla. Los ids de Mantine se normalizan
    // porque se generan en cada render.
    it('la lista de clubes de un jugador libre conserva su estructura', async () => {
      const { container } = await renderLoaded();

      expect(normalizeIds(container.innerHTML)).toMatchSnapshot();
    });
  });
});

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen, fireEvent, waitFor, within } from '@testing-library/react';
import { Routes, Route } from 'react-router-dom';
import { api } from '../../api/axios';
import { ENDPOINTS } from '../../api/endpoints';
import { APP_ROUTES } from '../../constants/routes';
import { useAuthStore, type User } from '../../store/authStore';
import { normalizeIds, renderWithProviders } from '../../test/utils';
import { Jugadores } from './Jugadores';

// Se mockea el `api` de bajo nivel (la frontera del sistema) y no los servicios,
// para que estos tests sigan valiendo cuando el acceso a datos migre a servicios.
vi.mock('../../api/axios', () => ({
  api: {
    get: vi.fn(),
    put: vi.fn(),
    post: vi.fn(),
  },
}));

type PlayerFixture = Record<string, unknown>;

const makePlayer = (overrides: PlayerFixture = {}): PlayerFixture => ({
  id: 'p0',
  email: 'p0@test.com',
  name: 'Nombre',
  clubId: 'club-1',
  clubStatus: 'Aprobado',
  ...overrides,
});

const LUIS = makePlayer({
  id: 'p1',
  email: 'luis@test.com',
  name: 'Luis',
  surname: 'Pérez',
  nickname: 'Luchi',
  club: { name: 'Club Norte' },
  stats: { elo: 1200, matchWon: 3, matchLost: 1, setWon: 9, setLost: 4 },
});
const MARTA = makePlayer({ id: 'p2', email: 'marta@test.com', name: 'Marta', surname: 'Gil' });
const PEDRO = makePlayer({
  id: 'p3',
  email: 'pedro@test.com',
  name: 'Pedro',
  surname: 'Ruiz',
  clubStatus: 'Pendiente',
});
const ROSA = makePlayer({
  id: 'p4',
  email: 'rosa@test.com',
  name: 'Rosa',
  surname: 'Sanz',
  clubStatus: 'Rechazado',
});
const GUS = makePlayer({ id: 'p5', email: 'gus@guest.pingpong', name: 'Gus' });
const PLAYERS = [LUIS, MARTA, PEDRO, ROSA, GUS];

const ALL_SKILL_KEYS = [
  'derechaPlano',
  'revesPlano',
  'topspinDerecha',
  'topspinReves',
  'corte',
  'bloqueoDerecha',
  'bloqueoReves',
  'servicio',
  'recepcion',
  'movilidad',
  'fortalezaMental',
  'experiencia',
];
const skillsAll = (value: number) =>
  Object.fromEntries(ALL_SKILL_KEYS.map((key) => [key, value]));

const makeUser = (overrides: Partial<User> = {}): User => ({
  id: 'admin-1',
  email: 'admin@test.com',
  name: 'Admin',
  role: 'AdminClub',
  clubId: 'club-1',
  clubStatus: 'Aprobado',
  ...overrides,
});

const loginAs = (overrides: Partial<User> = {}) => {
  useAuthStore.setState({
    token: 'token-test',
    user: makeUser(overrides),
    isAuthenticated: true,
  });
};

const serve = (players: PlayerFixture[] = PLAYERS) => {
  vi.mocked(api.get).mockResolvedValue({ data: { success: true, data: players } } as never);
};

const renderPage = () =>
  renderWithProviders(
    <Routes>
      <Route path={APP_ROUTES.HOME} element={<Jugadores />} />
      <Route path={APP_ROUTES.JUGADORES.PROFILE_PATH} element={<div>Pantalla de perfil</div>} />
    </Routes>,
  );

const renderLoaded = async () => {
  const view = renderPage();
  await screen.findByText('Plantilla de Jugadores');
  return view;
};

const rowOf = (text: string) => screen.getByText(text).closest('tr') as HTMLElement;

// Los ActionIcon no tienen nombre accesible (solo un Tooltip), asi que se
// localizan por el icono de Tabler que contienen.
const clickRowAction = (rowText: string, icon: string) => {
  const button = rowOf(rowText).querySelector(`.tabler-icon-${icon}`)?.closest('button');
  if (!button) throw new Error(`La fila "${rowText}" no tiene la accion "${icon}"`);
  fireEvent.click(button);
};

const hasRowAction = (rowText: string, icon: string) =>
  rowOf(rowText).querySelector(`.tabler-icon-${icon}`) !== null;

// El desplegable de Mantine esta en el DOM pero con `display: none` mientras
// dura su transicion, y getByRole ignora lo oculto: de ahi `hidden: true`.
const clickOption = async (option: string) =>
  fireEvent.click(await screen.findByRole('option', { name: option, hidden: true }));

// getByLabelText devolveria el input y tambien su lista de opciones (aria-labelledby).
const chooseOption = async (label: RegExp, option: string) => {
  fireEvent.click(screen.getByRole('combobox', { name: label }));
  await clickOption(option);
};

const showRequests = async () => {
  fireEvent.click(screen.getByDisplayValue('Plantilla'));
  await clickOption('Solicitudes');
};

describe('Jugadores', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    useAuthStore.setState({ token: null, user: null, isAuthenticated: false });
    serve();
    vi.mocked(api.put).mockResolvedValue({ data: { success: true, data: {} } } as never);
    vi.mocked(api.post).mockResolvedValue({ data: { success: true, data: {} } } as never);
    loginAs();
  });

  describe('listado', () => {
    it('muestra un cargador y no la pantalla mientras llegan los jugadores', () => {
      vi.mocked(api.get).mockReturnValue(new Promise(() => {}));

      renderPage();

      expect(screen.queryByText('Plantilla de Jugadores')).not.toBeInTheDocument();
    });

    it('carga los jugadores y por defecto solo muestra la plantilla aprobada', async () => {
      await renderLoaded();

      expect(api.get).toHaveBeenCalledWith(ENDPOINTS.USERS.BASE, undefined);
      expect(screen.getByText('Luis Pérez')).toBeInTheDocument();
      expect(screen.getByText('Marta Gil')).toBeInTheDocument();
      expect(screen.getByText('Gus')).toBeInTheDocument();
      expect(screen.queryByText('Pedro Ruiz')).not.toBeInTheDocument();
      expect(screen.queryByText('Rosa Sanz')).not.toBeInTheDocument();
    });

    it('muestra ELO, mote y record de un jugador con estadisticas', async () => {
      await renderLoaded();

      const row = within(rowOf('Luis Pérez'));
      expect(row.getByText('Luchi')).toBeInTheDocument();
      expect(row.getByText('1200 ELO')).toBeInTheDocument();
      expect(row.getByText('3V')).toBeInTheDocument();
      expect(row.getByText('1D')).toBeInTheDocument();
      expect(row.getByText('75% Win Rate')).toBeInTheDocument();
    });

    it('usa valores por defecto para un jugador sin estadisticas ni mote', async () => {
      await renderLoaded();

      const row = within(rowOf('Marta Gil'));
      expect(row.getByText('Sin mote')).toBeInTheDocument();
      expect(row.getByText('500 ELO')).toBeInTheDocument();
      expect(row.getByText('0% Win Rate')).toBeInTheDocument();
    });

    it('acepta las estadisticas como array y usa el primer elemento', async () => {
      serve([
        makePlayer({
          id: 'p9',
          name: 'Ana',
          stats: [{ elo: 900, matchWon: 1, matchLost: 1, setWon: 2, setLost: 2 }],
        }),
      ]);

      await renderLoaded();

      expect(within(rowOf('Ana')).getByText('900 ELO')).toBeInTheDocument();
    });

    it('muestra el mensaje de vacio si el servidor no devuelve una lista', async () => {
      vi.mocked(api.get).mockResolvedValue({ data: { success: true, data: { no: 'lista' } } } as never);

      await renderLoaded();

      expect(screen.getByText('No se encontraron jugadores.')).toBeInTheDocument();
    });

    it('muestra el mensaje de vacio si falla la carga', async () => {
      const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
      vi.mocked(api.get).mockRejectedValue(new Error('red caida'));

      await renderLoaded();

      expect(screen.getByText('No se encontraron jugadores.')).toBeInTheDocument();
      expect(consoleError).toHaveBeenCalled();
    });
  });

  describe('busqueda, filtro y paginacion', () => {
    it('filtra por nombre completo sin distinguir mayusculas', async () => {
      await renderLoaded();

      fireEvent.change(screen.getByPlaceholderText('Buscar jugador...'), {
        target: { value: 'PÉREZ' },
      });

      expect(screen.getByText('Luis Pérez')).toBeInTheDocument();
      expect(screen.queryByText('Marta Gil')).not.toBeInTheDocument();
    });

    it('avisa cuando la busqueda no encuentra a nadie', async () => {
      await renderLoaded();

      fireEvent.change(screen.getByPlaceholderText('Buscar jugador...'), {
        target: { value: 'zzz' },
      });

      expect(screen.getByText('No se encontraron jugadores.')).toBeInTheDocument();
    });

    it('el filtro de estado permite ver las solicitudes pendientes', async () => {
      await renderLoaded();

      await showRequests();

      expect(screen.getByText('Pedro Ruiz')).toBeInTheDocument();
      expect(screen.queryByText('Luis Pérez')).not.toBeInTheDocument();
    });

    describe('con mas de diez jugadores', () => {
      const MANY = Array.from({ length: 12 }, (_, index) =>
        makePlayer({
          id: `m${index + 1}`,
          email: `m${index + 1}@test.com`,
          name: `Jugador ${String(index + 1).padStart(2, '0')}`,
        }),
      );

      it('pagina de diez en diez', async () => {
        serve(MANY);
        await renderLoaded();

        expect(screen.getByText('Jugador 10')).toBeInTheDocument();
        expect(screen.queryByText('Jugador 11')).not.toBeInTheDocument();

        fireEvent.click(screen.getByRole('button', { name: '2' }));

        expect(screen.getByText('Jugador 11')).toBeInTheDocument();
        expect(screen.getByText('Jugador 12')).toBeInTheDocument();
        expect(screen.queryByText('Jugador 01')).not.toBeInTheDocument();
      });

      it('volver a buscar devuelve a la primera pagina', async () => {
        serve(MANY);
        await renderLoaded();
        fireEvent.click(screen.getByRole('button', { name: '2' }));

        fireEvent.change(screen.getByPlaceholderText('Buscar jugador...'), {
          target: { value: 'Jugador 0' },
        });

        expect(screen.getByText('Jugador 01')).toBeInTheDocument();
      });

      it('no muestra la paginacion con diez jugadores o menos', async () => {
        await renderLoaded();

        expect(screen.queryByRole('button', { name: '2' })).not.toBeInTheDocument();
      });
    });
  });

  describe('permisos por rol', () => {
    it('un Player solo ve el listado y el boton de ver perfil', async () => {
      loginAs({ role: 'Player', id: 'u-player' });
      await renderLoaded();

      expect(screen.queryByRole('button', { name: 'Añadir Jugador' })).not.toBeInTheDocument();
      expect(screen.queryByText('Estado')).not.toBeInTheDocument();
      expect(hasRowAction('Luis Pérez', 'edit')).toBe(false);
      expect(hasRowAction('Luis Pérez', 'key')).toBe(false);
      expect(hasRowAction('Luis Pérez', 'eye')).toBe(true);
    });

    it('un AdminClub puede anadir jugadores y ve la columna de estado', async () => {
      await renderLoaded();

      expect(screen.getByRole('button', { name: 'Añadir Jugador' })).toBeInTheDocument();
      expect(screen.getByText('Estado')).toBeInTheDocument();
      expect(hasRowAction('Luis Pérez', 'edit')).toBe(true);
      expect(hasRowAction('Luis Pérez', 'key')).toBe(true);
    });

    it('un AdminClub no ve el nombre del club de cada jugador', async () => {
      await renderLoaded();

      expect(screen.queryByText('Club Norte')).not.toBeInTheDocument();
    });

    it('un SuperAdmin ve a que club pertenece cada jugador', async () => {
      loginAs({ role: 'SuperAdmin', clubId: null });
      await renderLoaded();

      expect(screen.getByText('Club Norte')).toBeInTheDocument();
      expect(within(rowOf('Marta Gil')).getByText('Sin club')).toBeInTheDocument();
    });

    it('ver el perfil lleva a la pantalla del jugador', async () => {
      await renderLoaded();

      clickRowAction('Luis Pérez', 'eye');

      expect(await screen.findByText('Pantalla de perfil')).toBeInTheDocument();
    });

    it('las solicitudes pendientes ofrecen aprobar y rechazar, pero no ajustar el ELO', async () => {
      await renderLoaded();

      await showRequests();

      expect(hasRowAction('Pedro Ruiz', 'check')).toBe(true);
      expect(hasRowAction('Pedro Ruiz', 'x')).toBe(true);
      expect(hasRowAction('Pedro Ruiz', 'edit')).toBe(false);
    });
  });

  describe('procesar solicitudes', () => {
    it('rechazar una solicitud pide confirmacion, la envia y recarga la lista', async () => {
      const onRefresh = vi.fn();
      window.addEventListener('refresh-notifications', onRefresh);
      await renderLoaded();
      await showRequests();

      clickRowAction('Pedro Ruiz', 'x');
      fireEvent.click(await screen.findByRole('button', { name: 'Rechazar Solicitud' }));

      await waitFor(() =>
        expect(api.put).toHaveBeenCalledWith(ENDPOINTS.CLUBS.MEMBER_STATUS('club-1', 'p3'), {
          status: 'Rechazado',
        }, undefined),
      );
      await waitFor(() => expect(api.get).toHaveBeenCalledTimes(2));
      expect(onRefresh).toHaveBeenCalledTimes(1);
      window.removeEventListener('refresh-notifications', onRefresh);
    });

    it('un SuperAdmin procesa la solicitud con el club del propio jugador', async () => {
      loginAs({ role: 'SuperAdmin', clubId: null });
      serve([makePlayer({ id: 'p3', name: 'Pedro', clubId: 'club-9', clubStatus: 'Pendiente' })]);
      await renderLoaded();
      await showRequests();

      clickRowAction('Pedro', 'x');
      fireEvent.click(await screen.findByRole('button', { name: 'Rechazar Solicitud' }));

      await waitFor(() =>
        expect(api.put).toHaveBeenCalledWith(ENDPOINTS.CLUBS.MEMBER_STATUS('club-9', 'p3'), {
          status: 'Rechazado',
        }, undefined),
      );
    });

    it('un AdminClub sin club no puede procesar solicitudes', async () => {
      loginAs({ clubId: null });
      await renderLoaded();
      await showRequests();

      clickRowAction('Pedro Ruiz', 'x');

      expect(screen.queryByRole('button', { name: 'Rechazar Solicitud' })).not.toBeInTheDocument();
      expect(api.put).not.toHaveBeenCalled();
    });

    it('aprobar abre el modal de nivel con el boton desactivado hasta elegir nivel', async () => {
      await renderLoaded();
      await showRequests();

      clickRowAction('Pedro Ruiz', 'check');

      expect(await screen.findByText('Nivel de Entrada Inicial')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Confirmar y Aprobar' })).toBeDisabled();
    });

    it('aprobar con un nivel asigna a todas las habilidades el valor base del nivel', async () => {
      await renderLoaded();
      await showRequests();
      clickRowAction('Pedro Ruiz', 'check');
      await screen.findByText('Nivel de Entrada Inicial');

      await chooseOption(/Nivel Técnico Base/, 'Intermedio');
      fireEvent.click(screen.getByRole('button', { name: 'Confirmar y Aprobar' }));

      await waitFor(() =>
        expect(api.put).toHaveBeenCalledWith(ENDPOINTS.CLUBS.MEMBER_STATUS('club-1', 'p3'), {
          status: 'Aprobado',
          level: 'Intermedio',
          elo: 500,
          skills: skillsAll(40),
        }, undefined),
      );
      await waitFor(() => expect(api.get).toHaveBeenCalledTimes(2));
    });

    it('una habilidad rellenada a mano sustituye al valor base solo en esa habilidad', async () => {
      await renderLoaded();
      await showRequests();
      clickRowAction('Pedro Ruiz', 'check');
      await screen.findByText('Nivel de Entrada Inicial');
      await chooseOption(/Nivel Técnico Base/, 'Avanzado');

      fireEvent.change(screen.getByLabelText('Derecha Plano'), { target: { value: '90' } });
      fireEvent.click(screen.getByRole('button', { name: 'Confirmar y Aprobar' }));

      await waitFor(() =>
        expect(api.put).toHaveBeenCalledWith(
          ENDPOINTS.CLUBS.MEMBER_STATUS('club-1', 'p3'),
          expect.objectContaining({ skills: { ...skillsAll(60), derechaPlano: 90 } }),
          undefined,
        ),
      );
    });
  });

  describe('ajustar ELO', () => {
    it('muestra el ELO actual del jugador en el modal', async () => {
      await renderLoaded();

      clickRowAction('Luis Pérez', 'edit');

      expect(await screen.findByText('Ajustar Nivel ELO')).toBeInTheDocument();
      expect(screen.getByLabelText('Puntuación ELO')).toHaveValue('1200');
    });

    it('guarda el nuevo ELO y recarga la lista', async () => {
      await renderLoaded();
      clickRowAction('Luis Pérez', 'edit');
      await screen.findByText('Ajustar Nivel ELO');

      fireEvent.change(screen.getByLabelText('Puntuación ELO'), { target: { value: '1300' } });
      fireEvent.click(screen.getByRole('button', { name: 'Guardar Cambios' }));

      await waitFor(() =>
        expect(api.put).toHaveBeenCalledWith(ENDPOINTS.USERS.BY_ID('p1'), { elo: 1300 }, undefined),
      );
      await waitFor(() => expect(api.get).toHaveBeenCalledTimes(2));
    });
  });

  describe('anadir jugador', () => {
    const openGuestModal = async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Añadir Jugador' }));
      await screen.findByText('Añadir Jugador al Club');
    };
    // El boton de la cabecera y el del modal se llaman igual; el portal del modal
    // se monta antes que la pagina, asi que se busca dentro del dialogo.
    const guestSubmitButton = () =>
      within(screen.getByRole('dialog', { hidden: true })).getByRole('button', {
        name: 'Añadir Jugador',
        hidden: true,
      });
    const submitGuest = () => fireEvent.click(guestSubmitButton());
    const fillGuest = (name: string) => {
      fireEvent.change(screen.getByLabelText(/^Nombre/), { target: { value: name } });
      fireEvent.click(screen.getByLabelText(/Confirmo que tengo el consentimiento/));
    };

    it('el boton de guardar exige nombre y consentimiento', async () => {
      await renderLoaded();
      await openGuestModal();

      expect(guestSubmitButton()).toBeDisabled();

      fillGuest('Nuevo');

      expect(guestSubmitButton()).toBeEnabled();
    });

    it('sin correo crea un jugador invitado con las habilidades base del nivel', async () => {
      await renderLoaded();
      await openGuestModal();
      fillGuest('Nuevo');

      submitGuest();

      await waitFor(() =>
        expect(api.post).toHaveBeenCalledWith(ENDPOINTS.USERS.CREATE_GUEST, {
          email: '',
          name: 'Nuevo',
          surname: '',
          level: 'Iniciacion',
          dominantHand: 'Diestro',
          playstyle: 'Ofensivo',
          rubberForehand: 'LISA',
          rubberBackhand: 'LISA',
          elo: 500,
          skills: skillsAll(0),
        }, undefined),
      );
      await waitFor(() => expect(api.get).toHaveBeenCalledTimes(2));
    });

    it('con correo crea el usuario normal en vez de un invitado', async () => {
      await renderLoaded();
      await openGuestModal();
      fillGuest('Nuevo');
      fireEvent.change(screen.getByLabelText('Correo Electrónico (Opcional)'), {
        target: { value: 'nuevo@test.com' },
      });

      submitGuest();

      await waitFor(() =>
        expect(api.post).toHaveBeenCalledWith(ENDPOINTS.USERS.BASE, {
          email: 'nuevo@test.com',
          name: 'Nuevo',
          surname: undefined,
          level: 'Iniciacion',
          dominantHand: 'Diestro',
          playstyle: 'Ofensivo',
          rubberForehand: 'LISA',
          rubberBackhand: 'LISA',
          elo: 500,
          skills: skillsAll(0),
        }, undefined),
      );
      expect(api.post).toHaveBeenCalledTimes(1);
    });
  });

  describe('resetear cuenta', () => {
    it('a un invitado sin correo real le pide uno y lo guarda antes de enviar el enlace', async () => {
      await renderLoaded();
      clickRowAction('Gus', 'key');
      await screen.findByText('Resetear Cuenta');
      const send = screen.getByRole('button', { name: 'Guardar Correo y Enviar Link' });
      expect(send).toBeDisabled();

      fireEvent.change(screen.getByLabelText(/Asignar Correo Electrónico/), {
        target: { value: 'gus@real.com' },
      });
      fireEvent.click(send);

      await waitFor(() =>
        expect(api.put).toHaveBeenCalledWith(ENDPOINTS.USERS.BY_ID('p5'), {
          email: 'gus@real.com',
        }, undefined),
      );
      await waitFor(() =>
        expect(api.post).toHaveBeenCalledWith(ENDPOINTS.AUTH.FORGOT_PASSWORD, {
          email: 'gus@real.com',
        }, undefined),
      );
      expect(await screen.findByText('Correo Enviado')).toBeInTheDocument();
    });

    it('a un jugador con correo real le envia el enlace sin tocar su cuenta', async () => {
      await renderLoaded();
      clickRowAction('Luis Pérez', 'key');
      await screen.findByText('Resetear Cuenta');
      expect(screen.getByLabelText(/Correo Electrónico de la Cuenta/)).toHaveValue(
        'luis@test.com',
      );

      fireEvent.click(screen.getByRole('button', { name: 'Enviar Enlace de Recuperación' }));

      await waitFor(() =>
        expect(api.post).toHaveBeenCalledWith(ENDPOINTS.AUTH.FORGOT_PASSWORD, {
          email: 'luis@test.com',
        }, undefined),
      );
      expect(api.put).not.toHaveBeenCalled();
    });
  });

  describe('estructura del DOM', () => {
    // Verificador mecanico de la regla de oro del JSX: si una extraccion cambia
    // el HTML renderizado, este snapshot falla. Los ids de Mantine se normalizan
    // porque se generan en cada render.
    it('la pantalla de un AdminClub conserva su estructura', async () => {
      const { container } = await renderLoaded();

      expect(normalizeIds(container.innerHTML)).toMatchSnapshot();
    });

    // El estilo en línea de la raíz del diálogo es el de la transición de Mantine y depende del tiempo.
    const stableDialog = (element: HTMLElement) =>
      normalizeIds(element.outerHTML)
        .replace(/mantine-[a-z0-9]{9,}/g, 'mantine-id')
        .replace(/^(<[^>]*?) style="[^"]*"/, '$1');

    it('el modal de ajustar ELO conserva su estructura', async () => {
      await renderLoaded();
      clickRowAction('Luis Pérez', 'edit');

      expect(stableDialog(await screen.findByRole('dialog'))).toMatchSnapshot();
    });

    it('el modal de aprobación con un nivel elegido conserva su estructura', async () => {
      await renderLoaded();
      await showRequests();
      clickRowAction('Pedro Ruiz', 'check');
      await screen.findByText('Nivel de Entrada Inicial');
      await chooseOption(/Nivel Técnico Base/, 'Intermedio');

      expect(stableDialog(await screen.findByRole('dialog'))).toMatchSnapshot();
    });

    it('el modal de añadir jugador conserva su estructura', async () => {
      await renderLoaded();
      fireEvent.click(screen.getByRole('button', { name: 'Añadir Jugador' }));

      expect(stableDialog(await screen.findByRole('dialog'))).toMatchSnapshot();
    });

    it('el modal de resetear la cuenta de un invitado conserva su estructura', async () => {
      await renderLoaded();
      clickRowAction('Gus', 'key');

      expect(stableDialog(await screen.findByRole('dialog'))).toMatchSnapshot();
    });

    it('el modal de resetear la cuenta de un jugador con correo conserva su estructura', async () => {
      await renderLoaded();
      clickRowAction('Luis Pérez', 'key');

      expect(stableDialog(await screen.findByRole('dialog'))).toMatchSnapshot();
    });
  });
});

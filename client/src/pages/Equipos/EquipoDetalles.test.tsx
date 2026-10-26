import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { screen, fireEvent, waitFor, within } from '@testing-library/react';
import { Routes, Route } from 'react-router-dom';
import { api } from '../../api/axios';
import { ENDPOINTS } from '../../api/endpoints';
import { APP_ROUTES } from '../../constants/routes';
import { chooseOption, loginAs, normalizeIds, renderWithProviders } from '../../test/utils';
import { useAuthStore } from '../../store/authStore';
import { EquipoDetalles } from './EquipoDetalles';

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

// Mantine genera ids y `name` con mayusculas que normalizeIds no cubre.
const stableHtml = (html: string) =>
  normalizeIds(html).replace(/mantine-[a-z0-9]{9,}/g, 'mantine-id');

// El estilo en línea de la raíz del diálogo es el de la transición de Mantine y depende del tiempo.
const stableDialog = (element: HTMLElement) =>
  stableHtml(element.outerHTML).replace(/^(<[^>]*?) style="[^"]*"/, '$1');

const NOW = '2026-10-15T12:00:00.000Z';
const envelope = <T,>(data: T) => ({ data: { success: true, data } });

const ANA = { id: 'p1', name: 'Ana', surname: 'López', level: 'Avanzado', avatarUrl: null, stats: [{ elo: 1200 }] };
const LUIS = { id: 'p2', name: 'Luis', surname: 'Gil', level: 'Intermedio', avatarUrl: null, stats: null };

const MATCHES = [
  {
    id: 'm1',
    rivalName: 'CTM Rival',
    date: '2026-10-20T17:00:00.000Z',
    isHome: true,
    location: 'Pabellón Norte',
    status: 'Programado',
    ourScore: null,
    rivalScore: null,
    availabilities: [{ playerId: 'p1', player: { name: 'Ana', avatarUrl: null } }],
  },
  {
    id: 'm2',
    rivalName: 'Club Sur',
    date: '2026-11-05T17:00:00.000Z',
    isHome: false,
    location: null,
    status: 'Programado',
    ourScore: null,
    rivalScore: null,
    availabilities: [],
  },
  {
    id: 'm3',
    rivalName: 'Club Este',
    date: '2026-10-01T18:00:00.000Z',
    isHome: true,
    location: null,
    status: 'Completado',
    ourScore: 6,
    rivalScore: 4,
    availabilities: [],
  },
  {
    id: 'm4',
    rivalName: 'Club Oeste',
    date: '2026-09-20T18:00:00.000Z',
    isHome: false,
    location: null,
    status: 'Completado',
    ourScore: 3,
    rivalScore: 5,
    availabilities: [],
  },
  {
    id: 'm5',
    rivalName: 'Club Centro',
    date: '2026-09-10T18:00:00.000Z',
    isHome: true,
    location: null,
    status: 'Completado',
    ourScore: 5,
    rivalScore: 5,
    availabilities: [],
  },
  {
    id: 'm6',
    rivalName: 'Club Fantasma',
    date: '2026-09-01T18:00:00.000Z',
    isHome: true,
    location: null,
    status: 'Cancelado',
    ourScore: null,
    rivalScore: null,
    availabilities: [],
  },
];

const TEAM = {
  id: 't1',
  name: 'Equipo A',
  category: '1ª Autonómica',
  level: 'Intermedio',
  players: [ANA, LUIS],
  matches: MATCHES,
};

const CLUB_USERS = [
  { ...ANA, clubStatus: 'Aprobado' },
  { ...LUIS, clubStatus: 'Aprobado' },
  { id: 'p3', name: 'Marta', surname: 'Ruiz', level: 'Principiante', clubStatus: 'Pendiente' },
];

const serve = ({ team = TEAM as unknown } = {}) => {
  vi.mocked(api.get).mockImplementation((async (url: string) => {
    if (url === ENDPOINTS.TEAMS.BY_CLUB('club-1')) return envelope(team ? [team] : []);
    if (url === ENDPOINTS.USERS.BASE) return envelope(CLUB_USERS);
    throw new Error(`Peticion no esperada: ${url}`);
  }) as never);
};

const renderPage = () =>
  renderWithProviders(
    <Routes>
      <Route path={APP_ROUTES.EQUIPOS.DETAILS_PATH} element={<EquipoDetalles />} />
      <Route path={APP_ROUTES.EQUIPOS.LIST} element={<div>Pantalla de equipos</div>} />
      <Route path={APP_ROUTES.JUGADORES.PROFILE_PATH} element={<div>Pantalla de jugador</div>} />
    </Routes>,
    { initialEntries: [APP_ROUTES.EQUIPOS.DETAILS('t1')] },
  );

const renderLoaded = async () => {
  const view = renderPage();
  await screen.findByRole('heading', { name: 'Equipo A' });
  return view;
};

const dialog = () => screen.getByRole('dialog');

// El panel «Calendario» solo se monta al activar su pestaña.
const renderCalendar = async () => {
  const view = await renderLoaded();
  fireEvent.click(screen.getByRole('tab', { name: /Calendario y Resultados/ }));
  await waitFor(() =>
    expect(screen.getByRole('tab', { name: /Calendario y Resultados/ })).toHaveAttribute(
      'aria-selected',
      'true',
    ),
  );
  return view;
};

describe('EquipoDetalles', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Los partidos «próximos» dependen de la fecha actual: se congela solo Date.
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date(NOW));
    useAuthStore.setState({ token: null, user: null, isAuthenticated: false });
    loginAs({ id: 'u1', role: 'AdminClub' });
    serve();
    vi.mocked(api.put).mockResolvedValue({ data: { success: true } } as never);
    vi.mocked(api.post).mockResolvedValue({ data: { success: true } } as never);
    vi.mocked(api.delete).mockResolvedValue({ data: { success: true } } as never);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('carga', () => {
    it('pide los equipos del club y los jugadores', async () => {
      await renderLoaded();

      expect(api.get).toHaveBeenCalledWith(ENDPOINTS.TEAMS.BY_CLUB('club-1'), undefined);
      expect(api.get).toHaveBeenCalledWith(ENDPOINTS.USERS.BASE, undefined);
    });

    it('muestra un loader mientras carga', () => {
      renderPage();

      expect(screen.queryByRole('heading', { name: 'Equipo A' })).not.toBeInTheDocument();
      expect(screen.queryByText('Equipo no encontrado')).not.toBeInTheDocument();
    });

    it('si el equipo no está en el club avisa de que no se encuentra', async () => {
      serve({ team: null });
      renderPage();

      expect(await screen.findByText('Equipo no encontrado')).toBeInTheDocument();
    });

    it('si la carga falla avisa de que no se encuentra', async () => {
      vi.spyOn(console, 'error').mockImplementation(() => undefined);
      vi.mocked(api.get).mockRejectedValue(new Error('500'));
      renderPage();

      expect(await screen.findByText('Equipo no encontrado')).toBeInTheDocument();
    });

    it('«Volver a Equipos» regresa al listado', async () => {
      await renderLoaded();

      fireEvent.click(screen.getByRole('button', { name: 'Volver a Equipos' }));

      expect(await screen.findByText('Pantalla de equipos')).toBeInTheDocument();
    });
  });

  describe('cabecera y permisos', () => {
    it('muestra nombre, categoría, nivel y tamaño de la plantilla', async () => {
      await renderLoaded();

      expect(screen.getByText('1ª Autonómica')).toBeInTheDocument();
      expect(screen.getByText('Nivel: Intermedio')).toBeInTheDocument();
      expect(screen.getByText('Plantilla actual: 2 Jugadores')).toBeInTheDocument();
    });

    it.each(['AdminClub', 'SuperAdmin'])('un %s ve las acciones de gestión', async (role) => {
      loginAs({ id: 'u1', role });

      await renderLoaded();

      expect(screen.getByRole('button', { name: 'Editar Info' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Ajustar Plantilla' })).toBeInTheDocument();
      expect(screen.getAllByRole('button', { name: 'Añadir Partido' })).toHaveLength(1);
    });

    it('un Player no ve las acciones de gestión', async () => {
      loginAs({ id: 'u1', role: 'Player' });

      await renderLoaded();

      expect(screen.queryByRole('button', { name: 'Editar Info' })).not.toBeInTheDocument();
      expect(screen.queryByRole('button', { name: 'Ajustar Plantilla' })).not.toBeInTheDocument();
      expect(screen.queryByRole('button', { name: 'Añadir Partido' })).not.toBeInTheDocument();
    });
  });

  describe('pestaña Plantilla', () => {
    it('lista los jugadores con su nivel y ELO (500 por defecto)', async () => {
      await renderLoaded();

      expect(screen.getByText('Plantilla (2)')).toBeInTheDocument();
      expect(screen.getByText('Ana López')).toBeInTheDocument();
      expect(screen.getByText('1200 ELO')).toBeInTheDocument();
      expect(screen.getByText('Luis Gil')).toBeInTheDocument();
      expect(screen.getByText('500 ELO')).toBeInTheDocument();
    });

    it('con la plantilla vacía lo avisa', async () => {
      serve({ team: { ...TEAM, players: [] } });
      await renderLoaded();

      expect(screen.getByText('No hay jugadores asignados a este equipo.')).toBeInTheDocument();
    });

    it('pulsar un jugador lleva a su perfil', async () => {
      await renderLoaded();

      fireEvent.click(screen.getByText('Ana López'));

      expect(await screen.findByText('Pantalla de jugador')).toBeInTheDocument();
    });
  });

  describe('pestaña Calendario', () => {
    it('destaca el siguiente compromiso: el primer partido programado futuro', async () => {
      await renderCalendar();

      expect(screen.getByText('🔥 Siguiente Compromiso')).toBeInTheDocument();
      expect(screen.getAllByText(/CTM Rival/)).toHaveLength(1);
      expect(screen.getByText(/octubre de 2026/)).toBeInTheDocument();
      expect(screen.getByText('Pabellón Norte')).toBeInTheDocument();
    });

    it('el resto de partidos va debajo, sin repetir el destacado', async () => {
      await renderCalendar();

      expect(screen.getAllByText(/Club Sur/).length).toBeGreaterThan(0);
      expect(screen.getByText(/Club Este/)).toBeInTheDocument();
      expect(screen.getByText(/Club Oeste/)).toBeInTheDocument();
      expect(screen.getAllByText('vs')).toHaveLength(5);
    });

    it('muestra victoria, derrota y empate con el marcador en orden local-visitante', async () => {
      await renderCalendar();

      expect(screen.getByText('🏆 VICTORIA')).toBeInTheDocument();
      expect(screen.getByText('6 - 4')).toBeInTheDocument();
      expect(screen.getByText('❌ DERROTA')).toBeInTheDocument();
      // Fuera de casa el marcador se invierte: 3-5 nuestro es «5 - 3».
      expect(screen.getByText('5 - 3')).toBeInTheDocument();
      expect(screen.getByText('🤝 EMPATE')).toBeInTheDocument();
      expect(screen.getByText('5 - 5')).toBeInTheDocument();
    });

    it('sin partidos avisa de que el calendario está vacío', async () => {
      serve({ team: { ...TEAM, matches: [] } });
      await renderCalendar();

      expect(screen.getByText('No hay partidos en el calendario.')).toBeInTheDocument();
    });

    it('sin partidos futuros no hay «Siguiente Compromiso»', async () => {
      serve({ team: { ...TEAM, matches: MATCHES.slice(2) } });
      await renderCalendar();

      expect(screen.queryByText('🔥 Siguiente Compromiso')).not.toBeInTheDocument();
    });
  });

  describe('asistencia', () => {
    it('un jugador del equipo puede confirmar y se vuelve a cargar', async () => {
      loginAs({ id: 'p2', role: 'Player' });
      await renderCalendar();
      const calls = vi.mocked(api.get).mock.calls.length;

      fireEvent.click(screen.getAllByRole('checkbox', { name: 'Voy a ir' })[0]);

      await waitFor(() =>
        expect(api.post).toHaveBeenCalledWith(
          ENDPOINTS.TEAMS.TOGGLE_AVAILABILITY('m1'),
          undefined,
          undefined,
        ),
      );
      await waitFor(() => expect(vi.mocked(api.get).mock.calls.length).toBeGreaterThan(calls));
    });

    it('quien no es del equipo no puede marcar asistencia', async () => {
      loginAs({ id: 'u9', role: 'Player' });
      await renderCalendar();

      for (const checkbox of screen.getAllByRole('checkbox', { name: 'Voy a ir' })) {
        expect(checkbox).toBeDisabled();
      }
    });

    it('en un partido ya jugado la asistencia está deshabilitada aunque seas del equipo', async () => {
      loginAs({ id: 'p1', role: 'Player' });
      await renderCalendar();

      const boxes = screen.getAllByRole('checkbox', { name: 'Voy a ir' });
      expect(boxes[0]).toBeEnabled();
      expect(boxes[boxes.length - 1]).toBeDisabled();
    });

    it('marca como confirmado al jugador que ya había confirmado', async () => {
      loginAs({ id: 'p1', role: 'Player' });
      await renderCalendar();

      expect(screen.getAllByRole('checkbox', { name: 'Voy a ir' })[0]).toBeChecked();
    });

    it('un partido sin confirmaciones muestra «Sin confirmar»', async () => {
      await renderCalendar();

      expect(screen.getAllByText('Sin confirmar').length).toBeGreaterThan(0);
    });
  });

  describe('permiso para actualizar partidos', () => {
    it('un admin ve «Actualizar» en todos los partidos', async () => {
      await renderCalendar();

      expect(screen.getAllByRole('button', { name: 'Actualizar' })).toHaveLength(6);
    });

    it('un jugador del equipo también puede actualizar', async () => {
      loginAs({ id: 'p2', role: 'Player' });
      await renderCalendar();

      expect(screen.getAllByRole('button', { name: 'Actualizar' })).toHaveLength(6);
    });

    it('quien no es del equipo no ve «Actualizar»', async () => {
      loginAs({ id: 'u9', role: 'Player' });
      await renderCalendar();

      expect(screen.queryByRole('button', { name: 'Actualizar' })).not.toBeInTheDocument();
    });
  });

  describe('editar el equipo', () => {
    it('abre el modal con los datos actuales', async () => {
      await renderLoaded();

      fireEvent.click(screen.getByRole('button', { name: 'Editar Info' }));
      await screen.findByRole('dialog');

      expect(within(dialog()).getByLabelText(/Nombre del Equipo/)).toHaveValue('Equipo A');
      expect(within(dialog()).getByRole('combobox', { name: /Categoría de Liga/ })).toHaveValue(
        '1ª Autonómica',
      );
      expect(within(dialog()).getByRole('combobox', { name: /Nivel Base Inicial/ })).toHaveValue(
        'Intermedio',
      );
    });

    it('guarda los cambios y vuelve a cargar', async () => {
      await renderLoaded();
      const calls = vi.mocked(api.get).mock.calls.length;
      fireEvent.click(screen.getByRole('button', { name: 'Editar Info' }));
      await screen.findByRole('dialog');
      fireEvent.change(within(dialog()).getByLabelText(/Nombre del Equipo/), {
        target: { value: 'Equipo B' },
      });
      chooseOption(/Nivel Base Inicial/, 'Avanzado');

      fireEvent.click(within(dialog()).getByRole('button', { name: 'Guardar Cambios' }));

      await waitFor(() =>
        expect(api.put).toHaveBeenCalledWith(
          ENDPOINTS.TEAMS.UPDATE('t1'),
          { name: 'Equipo B', category: '1ª Autonómica', level: 'Avanzado' },
          undefined,
        ),
      );
      await waitFor(() => expect(vi.mocked(api.get).mock.calls.length).toBeGreaterThan(calls));
    });

    it('con el nombre vacío no se puede guardar', async () => {
      await renderLoaded();
      fireEvent.click(screen.getByRole('button', { name: 'Editar Info' }));
      await screen.findByRole('dialog');

      fireEvent.change(within(dialog()).getByLabelText(/Nombre del Equipo/), { target: { value: '' } });

      expect(within(dialog()).getByRole('button', { name: 'Guardar Cambios' })).toBeDisabled();
    });

    it('si el guardado falla el modal sigue abierto', async () => {
      vi.spyOn(console, 'error').mockImplementation(() => undefined);
      vi.mocked(api.put).mockRejectedValue(new Error('400'));
      await renderLoaded();
      fireEvent.click(screen.getByRole('button', { name: 'Editar Info' }));
      await screen.findByRole('dialog');

      fireEvent.click(within(dialog()).getByRole('button', { name: 'Guardar Cambios' }));

      await waitFor(() => expect(api.put).toHaveBeenCalledTimes(1));
      await waitFor(() =>
        expect(within(dialog()).getByRole('button', { name: 'Guardar Cambios' })).toBeEnabled(),
      );
      expect(screen.getByText('Editar Información del Equipo')).toBeInTheDocument();
    });
  });

  describe('ajustar la plantilla', () => {
    it('lista solo a los jugadores aprobados del club, con la plantilla marcada', async () => {
      await renderLoaded();

      fireEvent.click(screen.getByRole('button', { name: 'Ajustar Plantilla' }));
      await screen.findByRole('dialog');

      const modal = within(dialog());
      expect(modal.getByText('Ana López')).toBeInTheDocument();
      expect(modal.getByText('Luis Gil')).toBeInTheDocument();
      expect(modal.queryByText('Marta Ruiz')).not.toBeInTheDocument();
      for (const checkbox of modal.getAllByRole('checkbox')) {
        expect(checkbox).toBeChecked();
      }
    });

    it('al desmarcar a un jugador envía solo los que quedan', async () => {
      await renderLoaded();
      fireEvent.click(screen.getByRole('button', { name: 'Ajustar Plantilla' }));
      await screen.findByRole('dialog');

      fireEvent.click(within(dialog()).getByText('Ana López'));
      fireEvent.click(within(dialog()).getByRole('button', { name: 'Sincronizar Plantilla' }));

      await waitFor(() =>
        expect(api.put).toHaveBeenCalledWith(
          ENDPOINTS.TEAMS.UPDATE_PLAYERS('t1'),
          { playerIds: ['p2'] },
          undefined,
        ),
      );
    });
  });

  describe('añadir un partido', () => {
    it('envía rival, fecha, localía y lugar', async () => {
      await renderCalendar();
      fireEvent.click(screen.getAllByRole('button', { name: 'Añadir Partido' })[0]);
      await screen.findByRole('dialog');
      fireEvent.change(within(dialog()).getByLabelText(/Nombre del Club Rival/), {
        target: { value: 'CTM Visitante' },
      });
      fireEvent.click(within(dialog()).getByRole('button', { name: 'Jugamos Fuera' }));
      fireEvent.change(within(dialog()).getByLabelText(/Dirección del local/), {
        target: { value: 'Pabellón Sur' },
      });

      fireEvent.click(within(dialog()).getByRole('button', { name: 'Añadir al Calendario' }));

      await waitFor(() =>
        expect(api.post).toHaveBeenCalledWith(
          ENDPOINTS.TEAMS.MATCHES('t1'),
          { rivalName: 'CTM Visitante', date: NOW, isHome: false, location: 'Pabellón Sur' },
          undefined,
        ),
      );
    });

    it('sin rival no se puede añadir', async () => {
      await renderCalendar();
      fireEvent.click(screen.getAllByRole('button', { name: 'Añadir Partido' })[0]);
      await screen.findByRole('dialog');

      expect(within(dialog()).getByRole('button', { name: 'Añadir al Calendario' })).toBeDisabled();
    });
  });

  describe('actualizar un partido', () => {
    const openMatch = async (rival: string) => {
      const card = screen.getByText(new RegExp(rival)).closest('.mantine-Card-root') as HTMLElement;
      fireEvent.click(within(card).getByRole('button', { name: 'Actualizar' }));
      return screen.findByRole('dialog');
    };

    it('abre el modal con los datos del partido', async () => {
      await renderCalendar();

      await openMatch('Club Este');

      expect(within(dialog()).getByLabelText('Rival')).toHaveValue('Club Este');
      expect(within(dialog()).getByLabelText(/Puntos: Equipo A/)).toHaveValue('6');
      expect(within(dialog()).getByLabelText(/Puntos: Club Este/)).toHaveValue('4');
    });

    it('guarda el nuevo resultado', async () => {
      await renderCalendar();
      await openMatch('Club Este');
      fireEvent.change(within(dialog()).getByLabelText(/Puntos: Equipo A/), { target: { value: '7' } });

      fireEvent.click(within(dialog()).getByRole('button', { name: 'Guardar' }));

      await waitFor(() =>
        expect(api.put).toHaveBeenCalledWith(
          ENDPOINTS.TEAMS.UPDATE_MATCH('m3'),
          {
            status: 'Completado',
            ourScore: 7,
            rivalScore: 4,
            rivalName: 'Club Este',
            date: '2026-10-01T18:00:00.000Z',
            isHome: true,
            location: '',
          },
          undefined,
        ),
      );
    });

    it('si se vuelve a «Programado» los marcadores viajan como null', async () => {
      await renderCalendar();
      await openMatch('Club Este');
      chooseOption(/Estado del Encuentro/, 'Programado');

      fireEvent.click(within(dialog()).getByRole('button', { name: 'Guardar' }));

      await waitFor(() => expect(api.put).toHaveBeenCalledTimes(1));
      expect(vi.mocked(api.put).mock.calls[0][1]).toMatchObject({
        status: 'Programado',
        ourScore: null,
        rivalScore: null,
      });
    });

    it('completado sin marcador no se puede guardar', async () => {
      await renderCalendar();
      await openMatch('Club Este');

      fireEvent.change(within(dialog()).getByLabelText(/Puntos: Equipo A/), { target: { value: '' } });

      expect(within(dialog()).getByRole('button', { name: 'Guardar' })).toBeDisabled();
    });

    it('un admin elimina el partido tras confirmar y se vuelve a cargar', async () => {
      await renderCalendar();
      await openMatch('Club Este');
      const calls = vi.mocked(api.get).mock.calls.length;

      fireEvent.click(within(dialog()).getByRole('button', { name: 'Eliminar' }));
      fireEvent.click(await screen.findByRole('button', { name: 'Sí, Eliminar Partido' }));

      await waitFor(() =>
        expect(api.delete).toHaveBeenCalledWith(ENDPOINTS.TEAMS.DELETE_MATCH('m3'), undefined),
      );
      await waitFor(() => expect(vi.mocked(api.get).mock.calls.length).toBeGreaterThan(calls));
    });

    it('un jugador del equipo no ve «Eliminar»', async () => {
      loginAs({ id: 'p2', role: 'Player' });
      await renderCalendar();
      await openMatch('Club Este');

      expect(within(dialog()).queryByRole('button', { name: 'Eliminar' })).not.toBeInTheDocument();
    });
  });

  describe('eliminar el equipo', () => {
    it('tras confirmar borra el equipo y vuelve al listado', async () => {
      const { container } = await renderLoaded();

      fireEvent.click(container.querySelector('.mantine-ActionIcon-root') as HTMLElement);
      fireEvent.click(await screen.findByRole('button', { name: 'Sí, Eliminar Equipo' }));

      await waitFor(() =>
        expect(api.delete).toHaveBeenCalledWith(ENDPOINTS.TEAMS.DELETE('t1'), undefined),
      );
      expect(await screen.findByText('Pantalla de equipos')).toBeInTheDocument();
    });
  });

  describe('snapshots', () => {
    it('el DOM de la pantalla cargada no cambia', async () => {
      const { container } = await renderLoaded();

      expect(stableHtml(container.innerHTML)).toMatchSnapshot();
    });

    it('el DOM de la pantalla con el calendario abierto no cambia', async () => {
      const { container } = await renderCalendar();

      expect(stableHtml(container.innerHTML)).toMatchSnapshot();
    });

    it('el DOM del modal de plantilla no cambia', async () => {
      await renderLoaded();
      fireEvent.click(screen.getByRole('button', { name: 'Ajustar Plantilla' }));
      await screen.findByRole('dialog');

      expect(stableDialog(dialog())).toMatchSnapshot();
    });

    it('el DOM del modal de editar equipo no cambia', async () => {
      await renderLoaded();
      fireEvent.click(screen.getByRole('button', { name: 'Editar Info' }));
      await screen.findByRole('dialog');

      expect(stableDialog(dialog())).toMatchSnapshot();
    });

    it('el DOM del modal de partido nuevo no cambia', async () => {
      await renderLoaded();
      fireEvent.click(screen.getAllByRole('button', { name: 'Añadir Partido' })[0]);
      await screen.findByRole('dialog');

      expect(stableDialog(dialog())).toMatchSnapshot();
    });

    it('el DOM del modal de actualizar partido no cambia', async () => {
      await renderCalendar();
      const card = screen.getByText(/Club Este/).closest('.mantine-Card-root') as HTMLElement;
      fireEvent.click(within(card).getByRole('button', { name: 'Actualizar' }));

      expect(stableDialog(await screen.findByRole('dialog'))).toMatchSnapshot();
    });
  });
});

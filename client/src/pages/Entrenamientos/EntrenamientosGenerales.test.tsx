import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { screen, fireEvent, waitFor, within } from '@testing-library/react';
import { api } from '../../api/axios';
import { ENDPOINTS } from '../../api/endpoints';
import { normalizeIds, renderWithProviders } from '../../test/utils';
import { EntrenamientosGenerales } from './EntrenamientosGenerales';

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

const SCHEDULES_URL = ENDPOINTS.GENERAL_TRAININGS.SCHEDULES;

const ADULTOS = {
  id: 's1',
  name: 'Clase Adultos',
  startTime: '17:00',
  endTime: '19:00',
  daysOfWeek: [1, 3],
};
const NINOS = {
  id: 's2',
  name: 'Clase Niños',
  startTime: '10:00',
  endTime: '11:30',
  daysOfWeek: [6],
};

// "Hoy" es el 15/10/2026: T1, T2 y T4 son pasadas; T3 es futura.
const T1 = {
  id: 't1',
  date: '2026-10-05T17:00:00.000Z',
  description: 'Semana de Saques',
  scheduleId: 's1',
  schedule: ADULTOS,
  templateId: 'tpl1',
  template: { servicio: true, recepcion: true, corte: false },
  attendances: [
    { playerId: 'p1', attended: true },
    { playerId: 'p2', attended: false },
  ],
};
const T2 = {
  id: 't2',
  date: '2026-10-07T17:00:00.000Z',
  description: 'Semana de Saques',
  scheduleId: 's1',
  schedule: ADULTOS,
  templateId: 'tpl1',
  template: { servicio: true, recepcion: true, corte: false },
  attendances: [],
};
const T3 = {
  id: 't3',
  date: '2026-10-20T10:00:00.000Z',
  description: '',
  scheduleId: 's2',
  schedule: NINOS,
  templateId: 'tpl2',
  template: {},
  attendances: [],
};
const T4 = {
  id: 't4',
  date: '2026-10-09T17:00:00.000Z',
  description: 'Viejo',
  scheduleId: null,
  schedule: null,
  templateId: null,
  template: null,
  attendances: [],
};

const ANA = {
  id: 'p1',
  name: 'Ana',
  surname: 'Gil',
  level: 'Avanzado',
  clubStatus: 'Aprobado',
  avatarUrl: null,
};
const LUIS = {
  id: 'p2',
  name: 'Luis',
  surname: 'Pérez',
  level: 'Principiante',
  clubStatus: 'Aprobado',
  avatarUrl: null,
};
const PENDIENTE = {
  id: 'p3',
  name: 'Marta',
  surname: 'Ruiz',
  level: 'Avanzado',
  clubStatus: 'Pendiente',
  avatarUrl: null,
};

const serve = ({
  schedules = [ADULTOS, NINOS] as unknown[],
  trainings = [T1, T2, T3, T4] as unknown[],
  users = [ANA, LUIS, PENDIENTE] as unknown[],
} = {}) => {
  vi.mocked(api.get).mockImplementation(((url: string) => {
    const data =
      url === SCHEDULES_URL
        ? schedules
        : url === ENDPOINTS.GENERAL_TRAININGS.BASE
          ? trainings
          : url === ENDPOINTS.USERS.BASE
            ? users
            : [];
    return Promise.resolve({ data: { success: true, data } });
  }) as never);
};

const renderLoaded = async () => {
  const view = renderWithProviders(<EntrenamientosGenerales />);
  await screen.findByRole('heading', { name: 'Planificación y Grupos' });
  return view;
};

const clickIcon = (scope: HTMLElement | Document, icon: string) => {
  const button = scope.querySelector(`.tabler-icon-${icon}`)?.closest('button');
  if (!button) throw new Error(`No hay botón con el icono ${icon}`);
  fireEvent.click(button);
};

const scheduleCard = (name: string) =>
  screen.getByText(name).closest('[class*="mantine-Paper-root"]') as HTMLElement;

// Los días del calendario son los únicos Paper clicables con el número como texto.
const clickDay = (day: number) => {
  const cell = screen
    .getAllByText(String(day), { selector: 'p' })
    .map((element) => element.closest('[class*="mantine-Paper-root"]'))
    .find((paper) => paper && (paper as HTMLElement).style.cursor === 'pointer');
  fireEvent.click(cell as HTMLElement);
};

// El <section> del modal lleva estilos de la animación de entrada (opacity/transform) que
// cambian entre ejecuciones: el snapshot se limita al cuerpo, que es el JSX de la página.
const modalBody = (dialog: HTMLElement) =>
  (dialog.querySelector('.mantine-Modal-body') as HTMLElement).innerHTML;

const openDay = async (day: number) => {
  clickDay(day);
  await screen.findByText(`Sesiones del ${day}/10/2026`);
};

describe('EntrenamientosGenerales', () => {
  beforeEach(() => {
    // Solo se congela Date: el calendario arranca en el mes actual.
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date('2026-10-15T12:00:00Z'));
    vi.clearAllMocks();
    serve();
    vi.mocked(api.post).mockResolvedValue({ data: { success: true, data: {} } } as never);
    vi.mocked(api.put).mockResolvedValue({ data: { success: true, data: {} } } as never);
    vi.mocked(api.delete).mockResolvedValue({ data: { success: true } } as never);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('carga', () => {
    it('muestra un loader mientras carga', () => {
      renderWithProviders(<EntrenamientosGenerales />);

      expect(document.querySelector('.mantine-Loader-root')).toBeInTheDocument();
    });

    it('pide horarios, entrenamientos y usuarios', async () => {
      await renderLoaded();

      expect(api.get).toHaveBeenCalledWith(ENDPOINTS.GENERAL_TRAININGS.SCHEDULES);
      expect(api.get).toHaveBeenCalledWith(ENDPOINTS.GENERAL_TRAININGS.BASE);
      expect(api.get).toHaveBeenCalledWith(ENDPOINTS.USERS.BASE);
    });

    it('no rompe si falla la carga', async () => {
      const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
      vi.mocked(api.get).mockRejectedValue(new Error('red caida'));

      await renderLoaded();

      expect(screen.getByText('No hay horarios configurados.')).toBeInTheDocument();
      expect(consoleError).toHaveBeenCalled();
    });
  });

  describe('clases fijas', () => {
    it('lista cada horario con su franja y sus días', async () => {
      await renderLoaded();

      const adultos = within(scheduleCard('Clase Adultos'));
      expect(adultos.getByText('17:00 - 19:00')).toBeInTheDocument();
      expect(adultos.getByText('L')).toBeInTheDocument();
      expect(adultos.getByText('X')).toBeInTheDocument();
      expect(adultos.queryByText('M')).not.toBeInTheDocument();
      const ninos = within(scheduleCard('Clase Niños'));
      expect(ninos.getByText('10:00 - 11:30')).toBeInTheDocument();
      expect(ninos.getByText('S')).toBeInTheDocument();
    });

    it('avisa cuando no hay horarios y bloquea "Programar"', async () => {
      serve({ schedules: [] });

      await renderLoaded();

      expect(screen.getByText('No hay horarios configurados.')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Programar' })).toBeDisabled();
    });

    it('con horarios, "Programar" está habilitado', async () => {
      await renderLoaded();

      expect(screen.getByRole('button', { name: 'Programar' })).toBeEnabled();
    });

    // Regresión: el botón + llamaba a handleOpenScheduleModal(true); el `true` se tomaba como un
    // horario existente, dejaba `schedDays` en undefined y la pantalla lanzaba al renderizar.
    const openNewSchedule = async () => {
      const card = screen.getByText('Clases Fijas').closest('[class*="mantine-Card-root"]') as HTMLElement;
      clickIcon(card, 'plus');
      await screen.findByText('Crear Horario Base');
    };

    it('el botón + de Clases Fijas abre el formulario vacío con las horas por defecto', async () => {
      await renderLoaded();

      await openNewSchedule();

      expect(screen.getByLabelText(/Nombre de la Clase/)).toHaveValue('');
      expect(screen.getByLabelText(/Hora Inicio/)).toHaveValue('17:00');
      expect(screen.getByLabelText(/Hora Fin/)).toHaveValue('19:00');
      expect(screen.getByRole('button', { name: 'Guardar Horario' })).toBeDisabled();
    });

    it('un horario nuevo se crea con POST y recarga', async () => {
      await renderLoaded();
      await openNewSchedule();

      fireEvent.change(screen.getByLabelText(/Nombre de la Clase/), { target: { value: 'Clase Pro' } });
      fireEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'M' }));
      fireEvent.click(screen.getByRole('button', { name: 'Guardar Horario' }));

      await waitFor(() =>
        expect(api.post).toHaveBeenCalledWith(SCHEDULES_URL, {
          name: 'Clase Pro',
          startTime: '17:00',
          endTime: '19:00',
          daysOfWeek: [2],
        }),
      );
      expect(api.put).not.toHaveBeenCalled();
      await waitFor(() => expect(api.get).toHaveBeenCalledTimes(6));
    });

    it('tras editar un horario, el + vuelve a abrir el formulario vacío', async () => {
      await renderLoaded();
      clickIcon(scheduleCard('Clase Adultos'), 'edit');
      await screen.findByText('Crear Horario Base');
      fireEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Guardar Horario' }));
      await waitFor(() => expect(api.put).toHaveBeenCalled());
      await waitFor(() => expect(screen.queryByText('Crear Horario Base')).not.toBeInTheDocument());

      await openNewSchedule();

      expect(screen.getByLabelText(/Nombre de la Clase/)).toHaveValue('');
    });

    it('editar un horario abre el formulario con sus datos y guarda con PUT', async () => {
      await renderLoaded();

      clickIcon(scheduleCard('Clase Adultos'), 'edit');

      expect(await screen.findByText('Crear Horario Base')).toBeInTheDocument();
      expect(screen.getByLabelText(/Nombre de la Clase/)).toHaveValue('Clase Adultos');
      expect(screen.getByLabelText(/Hora Inicio/)).toHaveValue('17:00');
      expect(screen.getByLabelText(/Hora Fin/)).toHaveValue('19:00');
      fireEvent.change(screen.getByLabelText(/Nombre de la Clase/), {
        target: { value: 'Clase Adultos B' },
      });
      fireEvent.click(screen.getByRole('button', { name: 'Guardar Horario' }));

      await waitFor(() =>
        expect(api.put).toHaveBeenCalledWith(`${SCHEDULES_URL}/s1`, {
          name: 'Clase Adultos B',
          startTime: '17:00',
          endTime: '19:00',
          daysOfWeek: [1, 3],
        }),
      );
      await waitFor(() => expect(api.get).toHaveBeenCalledTimes(6));
    });

    it('al editar, quitar todos los días bloquea "Guardar Horario"', async () => {
      await renderLoaded();
      clickIcon(scheduleCard('Clase Adultos'), 'edit');
      await screen.findByText('Crear Horario Base');
      const guardar = screen.getByRole('button', { name: 'Guardar Horario' });
      expect(guardar).toBeEnabled();

      const modal = within(screen.getByRole('dialog'));
      fireEvent.click(modal.getByRole('button', { name: 'L' }));
      fireEvent.click(modal.getByRole('button', { name: 'X' }));

      expect(guardar).toBeDisabled();
    });

    it('si falla el guardado no recarga y deja el formulario abierto', async () => {
      vi.mocked(api.put).mockRejectedValue(new Error('red caida'));
      await renderLoaded();
      clickIcon(scheduleCard('Clase Adultos'), 'edit');
      await screen.findByText('Crear Horario Base');

      fireEvent.click(screen.getByRole('button', { name: 'Guardar Horario' }));

      await waitFor(() => expect(api.put).toHaveBeenCalled());
      expect(screen.getByText('Crear Horario Base')).toBeInTheDocument();
      expect(api.get).toHaveBeenCalledTimes(3);
    });

    it('eliminar un horario pide confirmación y borra con DELETE', async () => {
      await renderLoaded();

      clickIcon(scheduleCard('Clase Adultos'), 'trash');
      await screen.findByText('Eliminar Horario Base');
      expect(api.delete).not.toHaveBeenCalled();
      fireEvent.click(screen.getByRole('button', { name: 'Sí, Eliminar' }));

      await waitFor(() => expect(api.delete).toHaveBeenCalledWith(`${SCHEDULES_URL}/s1`));
      await waitFor(() => expect(api.get).toHaveBeenCalledTimes(6));
    });

    it('cancelar la confirmación no borra nada', async () => {
      await renderLoaded();
      clickIcon(scheduleCard('Clase Adultos'), 'trash');
      await screen.findByText('Eliminar Horario Base');

      fireEvent.click(screen.getByRole('button', { name: 'Cancelar' }));

      await waitFor(() =>
        expect(screen.queryByText('Eliminar Horario Base')).not.toBeInTheDocument(),
      );
      expect(api.delete).not.toHaveBeenCalled();
    });
  });

  describe('calendario', () => {
    it('arranca en el mes actual, en mayúsculas', async () => {
      await renderLoaded();

      expect(screen.getByRole('heading', { name: 'OCTUBRE DE 2026' })).toBeInTheDocument();
    });

    it('pinta los 31 días de octubre y las cabeceras desde el lunes', async () => {
      await renderLoaded();

      ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'].forEach((day) => {
        expect(screen.getByText(day)).toBeInTheDocument();
      });
      expect(screen.getByText('31')).toBeInTheDocument();
      expect(screen.queryByText('32')).not.toBeInTheDocument();
    });

    it('cada sesión aparece en su día con la hora del horario o "Antiguo"', async () => {
      await renderLoaded();

      expect(screen.getAllByText('17:00', { selector: '.mantine-Badge-label' })).toHaveLength(2);
      expect(screen.getByText('10:00', { selector: '.mantine-Badge-label' })).toBeInTheDocument();
      expect(screen.getByText('Antiguo')).toBeInTheDocument();
    });

    it('las flechas cambian de mes', async () => {
      await renderLoaded();

      clickIcon(document.body, 'chevron-left');
      expect(screen.getByRole('heading', { name: 'SEPTIEMBRE DE 2026' })).toBeInTheDocument();
      expect(screen.queryByText('31')).not.toBeInTheDocument();

      clickIcon(document.body, 'chevron-right');
      clickIcon(document.body, 'chevron-right');
      expect(screen.getByRole('heading', { name: 'NOVIEMBRE DE 2026' })).toBeInTheDocument();
    });
  });

  describe('sesiones de un día', () => {
    it('un día sin sesiones avisa', async () => {
      await renderLoaded();

      await openDay(2);

      expect(screen.getByText('No hay entrenamientos este día.')).toBeInTheDocument();
    });

    it('una sesión pasada con asistencias ofrece ver asistentes y editar la lista', async () => {
      await renderLoaded();

      await openDay(5);

      expect(screen.getByText('Semana de Saques')).toBeInTheDocument();
      expect(screen.getByText('Clase Adultos (17:00 - 19:00)')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Ver Asistentes (2)' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Editar Lista' })).toBeInTheDocument();
    });

    it('una sesión pasada sin asistencias ofrece pasar lista', async () => {
      await renderLoaded();

      await openDay(7);

      expect(screen.getByRole('button', { name: 'Pasar Lista' })).toBeInTheDocument();
      expect(screen.queryByRole('button', { name: /Ver Asistentes/ })).not.toBeInTheDocument();
    });

    it('una sesión futura usa el texto por defecto y ofrece ver inscritos', async () => {
      await renderLoaded();

      await openDay(20);

      expect(screen.getByText('Entrenamiento Grupal')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Ver Inscritos' })).toBeInTheDocument();
      expect(screen.queryByRole('button', { name: /Ver Asistentes/ })).not.toBeInTheDocument();
    });

    it('una sesión de un horario borrado se marca como antigua y no permite pasar lista', async () => {
      await renderLoaded();

      await openDay(9);

      expect(screen.getByText('Horario Antiguo')).toBeInTheDocument();
      expect(screen.queryByRole('button', { name: 'Pasar Lista' })).not.toBeInTheDocument();
      expect(screen.queryByRole('button', { name: 'Ver Inscritos' })).not.toBeInTheDocument();
    });

    it('"Ver Asistentes" lista solo a quienes asistieron', async () => {
      await renderLoaded();
      await openDay(5);

      fireEvent.click(screen.getByRole('button', { name: 'Ver Asistentes (2)' }));

      await screen.findByText('Jugadores que asistieron');
      expect(screen.getByText('Ana Gil')).toBeInTheDocument();
      expect(screen.queryByText('Luis Pérez')).not.toBeInTheDocument();
    });

    it('"Ver Asistentes" avisa cuando nadie asistió', async () => {
      serve({
        trainings: [{ ...T1, attendances: [{ playerId: 'p2', attended: false }] }],
      });
      await renderLoaded();
      await openDay(5);

      fireEvent.click(screen.getByRole('button', { name: 'Ver Asistentes (1)' }));

      expect(await screen.findByText('No hay registros de asistencia.')).toBeInTheDocument();
    });
  });

  describe('detalles del programa', () => {
    const openProgram = async (day: number) => {
      await openDay(day);
      clickIcon(screen.getByRole('dialog'), 'info-circle');
      await screen.findByText('Detalles del Programa');
    };

    it('resume el bloque: descripción, fechas, horario, sesiones y habilidades', async () => {
      await renderLoaded();

      await openProgram(5);

      expect(screen.getByText('Descripción del Bloque')).toBeInTheDocument();
      expect(screen.getAllByText('Semana de Saques').length).toBeGreaterThanOrEqual(2);
      expect(screen.getByText('5/10/2026')).toBeInTheDocument();
      expect(screen.getByText('7/10/2026')).toBeInTheDocument();
      expect(screen.getByText('2 Sesiones Totales')).toBeInTheDocument();
      expect(screen.getByText('Servicio')).toBeInTheDocument();
      expect(screen.getByText('Recepción')).toBeInTheDocument();
      expect(screen.queryByText('Corte')).not.toBeInTheDocument();
    });

    it('usa textos por defecto sin descripción ni habilidades', async () => {
      await renderLoaded();

      await openProgram(20);

      expect(screen.getByText('Sin descripción especial.')).toBeInTheDocument();
      expect(screen.getByText('No se seleccionó ninguna habilidad específica.')).toBeInTheDocument();
      expect(screen.getByText('1 Sesiones Totales')).toBeInTheDocument();
    });
  });

  describe('lista de asistencia', () => {
    const openAttendance = async (day: number, buttonName: string) => {
      await openDay(day);
      fireEvent.click(screen.getByRole('button', { name: buttonName }));
      await screen.findByText('Lista de Asistencia');
    };

    it('lista solo a los jugadores aprobados y marca a quienes ya constan en la sesión', async () => {
      await renderLoaded();

      await openAttendance(5, 'Editar Lista');

      expect(screen.getByText('Ana Gil')).toBeInTheDocument();
      expect(screen.getByText('Luis Pérez')).toBeInTheDocument();
      expect(screen.queryByText('Marta Ruiz')).not.toBeInTheDocument();
      // Quien consta con attended=false también arranca marcado: se fija el comportamiento actual.
      expect(
        screen.getByRole('button', { name: 'Sincronizar Asistencia (2 Jugadores)' }),
      ).toBeInTheDocument();
    });

    it('al abrirla se cierra el modal del día', async () => {
      await renderLoaded();

      await openAttendance(5, 'Editar Lista');

      await waitFor(() =>
        expect(screen.queryByText('Sesiones del 5/10/2026')).not.toBeInTheDocument(),
      );
    });

    it('pinchar a un jugador lo marca o desmarca', async () => {
      await renderLoaded();
      await openAttendance(7, 'Pasar Lista');
      expect(
        screen.getByRole('button', { name: 'Sincronizar Asistencia (0 Jugadores)' }),
      ).toBeInTheDocument();

      fireEvent.click(screen.getByText('Ana Gil'));
      expect(
        screen.getByRole('button', { name: 'Sincronizar Asistencia (1 Jugadores)' }),
      ).toBeInTheDocument();

      fireEvent.click(screen.getByText('Ana Gil'));
      expect(
        screen.getByRole('button', { name: 'Sincronizar Asistencia (0 Jugadores)' }),
      ).toBeInTheDocument();
    });

    it('filtra por nivel', async () => {
      await renderLoaded();
      await openAttendance(5, 'Editar Lista');

      fireEvent.click(screen.getByRole('combobox', { name: 'Filtrar por Nivel' }));
      fireEvent.click(await screen.findByRole('option', { name: 'Avanzado', hidden: true }));

      expect(screen.getByText('Ana Gil')).toBeInTheDocument();
      expect(screen.queryByText('Luis Pérez')).not.toBeInTheDocument();
    });

    it('sincronizar envía los jugadores marcados y recarga', async () => {
      await renderLoaded();
      await openAttendance(5, 'Editar Lista');
      fireEvent.click(screen.getByText('Luis Pérez'));

      fireEvent.click(screen.getByRole('button', { name: 'Sincronizar Asistencia (1 Jugadores)' }));

      await waitFor(() =>
        expect(api.put).toHaveBeenCalledWith(ENDPOINTS.GENERAL_TRAININGS.BULK_ATTENDANCE('t1'), {
          playerIds: ['p1'],
        }),
      );
      await waitFor(() => expect(api.get).toHaveBeenCalledTimes(6));
    });

    it('si falla la sincronización no recarga y deja la lista abierta', async () => {
      vi.mocked(api.put).mockRejectedValue(new Error('red caida'));
      await renderLoaded();
      await openAttendance(5, 'Editar Lista');

      fireEvent.click(screen.getByRole('button', { name: /Sincronizar Asistencia/ }));

      await waitFor(() => expect(api.put).toHaveBeenCalled());
      expect(screen.getByText('Lista de Asistencia')).toBeInTheDocument();
      expect(api.get).toHaveBeenCalledTimes(3);
    });
  });

  describe('programar fechas', () => {
    const openProgramar = async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Programar' }));
      await screen.findByText('Programar Fechas');
    };

    it('"Agendar Sesiones" está bloqueado hasta tener rango de fechas y horario', async () => {
      await renderLoaded();

      await openProgramar();

      expect(screen.getByRole('button', { name: 'Agendar Sesiones' })).toBeDisabled();
    });

    const fillTraining = async () => {
      const modal = within(screen.getByRole('dialog'));
      fireEvent.change(modal.getByLabelText('Descripción (Opcional)'), {
        target: { value: 'Semana de Saques' },
      });
      fireEvent.click(modal.getByRole('combobox', { name: /Horario Base/ }));
      fireEvent.click(await screen.findByRole('option', { name: 'Clase Adultos', hidden: true }));
      fireEvent.click(modal.getByRole('button', { name: /Rango de Fechas/ }));
      // Mantine etiqueta los días en inglés ("20 October 2026").
      fireEvent.click(await screen.findByRole('button', { name: '20 October 2026', hidden: true }));
      fireEvent.click(await screen.findByRole('button', { name: '22 October 2026', hidden: true }));
      fireEvent.click(modal.getByRole('checkbox', { name: 'Servicio' }));
      fireEvent.click(modal.getByRole('checkbox', { name: 'Corte' }));
    };

    it('agenda las sesiones con el rango, el horario y las habilidades elegidos', async () => {
      await renderLoaded();
      await openProgramar();
      await fillTraining();

      const agendar = screen.getByRole('button', { name: 'Agendar Sesiones' });
      expect(agendar).toBeEnabled();
      fireEvent.click(agendar);

      await waitFor(() =>
        expect(api.post).toHaveBeenCalledWith(ENDPOINTS.GENERAL_TRAININGS.BASE, {
          description: 'Semana de Saques',
          startDate: '2026-10-20T00:00:00.000Z',
          endDate: '2026-10-22T00:00:00.000Z',
          scheduleId: 's1',
          skillsToTrain: { servicio: true, corte: true },
        }),
      );
      await waitFor(() => expect(screen.queryByText('Programar Fechas')).not.toBeInTheDocument());
      expect(api.get).toHaveBeenCalledTimes(6);
    });

    it('si falla el alta no recarga y deja el formulario abierto', async () => {
      vi.mocked(api.post).mockRejectedValue(new Error('red caida'));
      await renderLoaded();
      await openProgramar();
      await fillTraining();

      fireEvent.click(screen.getByRole('button', { name: 'Agendar Sesiones' }));

      await waitFor(() => expect(api.post).toHaveBeenCalled());
      expect(screen.getByText('Programar Fechas')).toBeInTheDocument();
      expect(api.get).toHaveBeenCalledTimes(3);
    });

    it('ofrece las doce habilidades y los horarios existentes', async () => {
      await renderLoaded();

      await openProgramar();

      const modal = within(screen.getByRole('dialog'));
      ['Derecha Plano', 'Revés Plano', 'Topspin Derecha', 'Topspin Revés', 'Corte', 'Bloqueo Derecha',
        'Bloqueo Revés', 'Servicio', 'Recepción', 'Movilidad', 'Fortaleza Mental', 'Experiencia',
      ].forEach((skill) => {
        expect(modal.getByRole('checkbox', { name: skill })).toBeInTheDocument();
      });
      fireEvent.click(modal.getByRole('combobox', { name: /Horario Base/ }));
      expect(await screen.findByRole('option', { name: 'Clase Adultos', hidden: true })).toBeInTheDocument();
      expect(screen.getByRole('option', { name: 'Clase Niños', hidden: true })).toBeInTheDocument();
    });
  });

  describe('estructura del DOM', () => {
    // Verificador mecanico de la regla de oro del JSX: si una extraccion cambia
    // el HTML renderizado, estos snapshots fallan. Los ids de Mantine se
    // normalizan porque se generan en cada render.
    it('el calendario con sus horarios conserva su estructura', async () => {
      const { container } = await renderLoaded();

      expect(normalizeIds(container.innerHTML)).toMatchSnapshot();
    });

    it('el modal de sesiones de un día conserva su estructura', async () => {
      await renderLoaded();
      await openDay(5);

      expect(normalizeIds(modalBody(screen.getByRole('dialog')))).toMatchSnapshot();
    });

    it('el modal de detalles del programa conserva su estructura', async () => {
      await renderLoaded();
      await openDay(5);
      clickIcon(screen.getByRole('dialog'), 'info-circle');
      await screen.findByText('Detalles del Programa');

      const dialogs = screen.getAllByRole('dialog');
      expect(normalizeIds(modalBody(dialogs[dialogs.length - 1]))).toMatchSnapshot();
    });

    it('el modal de lista de asistencia conserva su estructura', async () => {
      await renderLoaded();
      await openDay(5);
      fireEvent.click(screen.getByRole('button', { name: 'Editar Lista' }));
      await screen.findByText('Lista de Asistencia');

      const dialogs = screen.getAllByRole('dialog');
      expect(normalizeIds(modalBody(dialogs[dialogs.length - 1]))).toMatchSnapshot();
    });
  });
});

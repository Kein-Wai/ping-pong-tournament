import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen, fireEvent, waitFor, within } from '@testing-library/react';
import { Routes, Route } from 'react-router-dom';
import { api } from '../../api/axios';
import { ENDPOINTS } from '../../api/endpoints';
import { APP_ROUTES } from '../../constants/routes';
import { useAuthStore } from '../../store/authStore';
import {
  chooseOption as choose,
  loginAs,
  normalizeIds,
  optionsOf,
  renderWithProviders,
} from '../../test/utils';
import { PlanDetalles } from './PlanDetalles';

// Se mockea el `api` de bajo nivel (la frontera del sistema) y no los servicios
// ni los hooks, para que estos tests sigan valiendo cuando la pantalla pase a
// usar `useTrainingPlan` y los componentes de `components/training`.
vi.mock('../../api/axios', () => ({
  api: {
    get: vi.fn(),
    post: vi.fn(),
    delete: vi.fn(),
  },
}));

const envelope = (data: unknown) => ({ data: { success: true, data } });

const makeItem = (id: string, overrides: Record<string, unknown> = {}) => ({
  id,
  completed: false,
  sets: 3,
  reps: 10,
  durationMinutes: null,
  exercise: { code: null, name: `Ejercicio ${id}` },
  ...overrides,
});

const SESSION_1 = {
  id: 's1',
  exercises: [
    makeItem('e1', { exercise: { code: 12, name: 'Top spin de derecha' }, durationMinutes: 15 }),
    makeItem('e2', { completed: true, sets: null, reps: null }),
  ],
};
const SESSION_2 = { id: 's2', exercises: [] };
const SESSION_3 = {
  id: 's3',
  exercises: Array.from({ length: 6 }, (_, index) => makeItem(`f${index + 1}`, { completed: true })),
};

const makePlan = (overrides: Record<string, unknown> = {}) => ({
  id: 'p1',
  playerId: 'pl1',
  strengths: 'Buen servicio',
  weaknesses: 'Movilidad lateral',
  objectives: 'Ganar consistencia',
  sessions: [SESSION_1, SESSION_2, SESSION_3],
  ...overrides,
});

const CATALOG = [
  { id: 'x1', code: 5, name: 'Drive cruzado', category: 'Control_CT' },
  { id: 'x2', code: null, name: 'Bloqueo corto', category: 'Bloqueo_Contraataque' },
];

const PLAN_URL = ENDPOINTS.TRAININGS.PLAN_BY_ID('p1');

interface Served {
  plan?: unknown;
  catalog?: unknown[];
}

const serve = ({ plan = makePlan(), catalog = CATALOG }: Served = {}) => {
  vi.mocked(api.get).mockImplementation((async (url: string) => {
    if (url === PLAN_URL) return envelope(plan);
    if (url === ENDPOINTS.EXERCISES.BASE) return envelope(catalog);
    throw new Error(`Peticion no esperada: ${url}`);
  }) as never);
};

const renderPage = () =>
  renderWithProviders(
    <Routes>
      <Route path="/previa" element={<div>Pantalla anterior</div>} />
      <Route path={APP_ROUTES.ENTRENAMIENTOS.DETAILS_PATH} element={<PlanDetalles />} />
      <Route
        path={APP_ROUTES.ENTRENAMIENTOS.SESSION_PATH}
        element={<div>Pantalla de la sesion</div>}
      />
      <Route path={APP_ROUTES.JUGADORES.PROFILE_PATH} element={<div>Perfil del jugador</div>} />
    </Routes>,
    { initialEntries: ['/previa', APP_ROUTES.ENTRENAMIENTOS.DETAILS('p1')] },
  );

const renderLoaded = async () => {
  const view = renderPage();
  await screen.findByRole('heading', { name: 'Detalles del Macrociclo' });
  return view;
};

const cardOf = (title: string) =>
  screen.getByText(title).closest('[class*="mantine-Card-root"]') as HTMLElement;

// Se compara solo URL y cuerpo: el adaptador `http` añade un `config` final que no importa aqui.
const callsTo = (mock: unknown) =>
  (vi.mocked(mock as typeof api.post).mock.calls as unknown[][]).map(([url, body]) => [url, body]);

const planLoads = () =>
  vi.mocked(api.get).mock.calls.filter(([url]) => url === PLAN_URL).length;

// Mantine duplica la etiqueta en los selects: se normalizan tambien sus ids largos.
const stableHtml = (html: string) =>
  normalizeIds(html).replace(/mantine-[a-z0-9]{9,}/g, 'mantine-id');

describe('PlanDetalles', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useAuthStore.setState({ token: null, user: null, isAuthenticated: false });
    serve();
    vi.mocked(api.post).mockResolvedValue(envelope({}) as never);
    vi.mocked(api.delete).mockResolvedValue(envelope({}) as never);
    loginAs({ role: 'AdminClub' });
  });

  describe('carga', () => {
    it('pide el plan de la URL y el catalogo de ejercicios', async () => {
      await renderLoaded();

      const urls = vi.mocked(api.get).mock.calls.map(([url]) => url);
      expect(urls).toEqual(expect.arrayContaining([PLAN_URL, ENDPOINTS.EXERCISES.BASE]));
      expect(urls).toHaveLength(2);
    });

    it('muestra fortalezas, puntos a mejorar y objetivos del plan', async () => {
      await renderLoaded();

      expect(screen.getByText('Buen servicio')).toBeInTheDocument();
      expect(screen.getByText('Movilidad lateral')).toBeInTheDocument();
      expect(screen.getByText('Ganar consistencia')).toBeInTheDocument();
    });

    it('usa textos alternativos cuando el plan no los especifica', async () => {
      serve({ plan: makePlan({ strengths: '', weaknesses: null, objectives: '' }) });

      await renderLoaded();

      expect(screen.getAllByText('No especificadas')).toHaveLength(2);
      expect(screen.getByText('No especificados')).toBeInTheDocument();
    });

    it('si falla la carga del plan muestra la pantalla sin sesiones', async () => {
      vi.mocked(api.get).mockImplementation((async (url: string) => {
        if (url === PLAN_URL) throw new Error('404');
        return envelope(CATALOG);
      }) as never);

      await renderLoaded();

      expect(screen.queryByText('Fortalezas')).not.toBeInTheDocument();
      expect(screen.queryByText('Sesión 1')).not.toBeInTheDocument();
    });

    it('no espera al catalogo para mostrar el plan', async () => {
      vi.mocked(api.get).mockImplementation((async (url: string) => {
        if (url === PLAN_URL) return envelope(makePlan());
        return new Promise(() => {});
      }) as never);

      await renderLoaded();

      expect(screen.getByText('Sesión 1')).toBeInTheDocument();
    });
  });

  describe('sesiones', () => {
    it('cada tarjeta indica su estado: progreso, vacia o completada', async () => {
      await renderLoaded();

      expect(within(cardOf('Sesión 1')).getByText('Progreso: 1 / 2')).toBeInTheDocument();
      expect(within(cardOf('Sesión 2')).getByText('Vacía')).toBeInTheDocument();
      expect(within(cardOf('Sesión 2')).getByText('Sin ejercicios asignados')).toBeInTheDocument();
      expect(within(cardOf('Sesión 3')).getByText('Completada')).toBeInTheDocument();
    });

    it('lista los ejercicios con codigo, series, repeticiones y duracion', async () => {
      await renderLoaded();

      const session = within(cardOf('Sesión 1'));
      expect(session.getByText('[12] Top spin de derecha')).toBeInTheDocument();
      expect(session.getByText('3x10')).toBeInTheDocument();
      expect(session.getByText('15 min')).toBeInTheDocument();
      expect(session.getByText('Ejercicio e2')).toBeInTheDocument();
    });

    it('«Entrar a la Sesión» lleva a la pantalla de la sesion', async () => {
      await renderLoaded();

      fireEvent.click(within(cardOf('Sesión 1')).getByRole('button', { name: 'Entrar a la Sesión' }));

      expect(await screen.findByText('Pantalla de la sesion')).toBeInTheDocument();
    });

    it('«Volver atrás» lleva al perfil del jugador del plan', async () => {
      await renderLoaded();

      fireEvent.click(screen.getByRole('button', { name: 'Volver atrás' }));

      expect(await screen.findByText('Perfil del jugador')).toBeInTheDocument();
    });

    it('«Volver atrás» regresa a la pantalla anterior si el plan no trae jugador', async () => {
      serve({ plan: makePlan({ playerId: null }) });
      await renderLoaded();

      fireEvent.click(screen.getByRole('button', { name: 'Volver atrás' }));

      expect(await screen.findByText('Pantalla anterior')).toBeInTheDocument();
    });
  });

  describe('segun el rol', () => {
    it.each(['AdminClub', 'SuperAdmin'])('un %s puede añadir, clonar y quitar ejercicios', async (role) => {
      loginAs({ role });

      await renderLoaded();

      expect(screen.getAllByRole('button', { name: 'Clonar' })).toHaveLength(3);
      expect(document.querySelectorAll('.tabler-icon-trash').length).toBeGreaterThan(0);
    });

    it('un jugador solo consulta el plan', async () => {
      loginAs({ role: 'Player' });

      await renderLoaded();

      expect(screen.queryByRole('button', { name: 'Clonar' })).not.toBeInTheDocument();
      expect(screen.queryByRole('button', { name: 'Añadir' })).not.toBeInTheDocument();
      expect(document.querySelector('.tabler-icon-trash')).toBeNull();
    });

    it('una sesion con seis ejercicios no admite mas: «Límite (6)» y sin clonar', async () => {
      await renderLoaded();

      const full = within(cardOf('Sesión 3'));
      expect(full.getByRole('button', { name: 'Límite (6)' })).toBeDisabled();
      expect(full.getByRole('button', { name: 'Clonar' })).toBeDisabled();
    });

    it('no se puede clonar si ninguna sesion tiene ejercicios', async () => {
      serve({ plan: makePlan({ sessions: [SESSION_2, { id: 's4', exercises: [] }] }) });

      await renderLoaded();

      screen.getAllByRole('button', { name: 'Clonar' }).forEach((button) => {
        expect(button).toBeDisabled();
      });
    });
  });

  describe('añadir un ejercicio', () => {
    const openAdd = async () => {
      fireEvent.click(within(cardOf('Sesión 2')).getByRole('button', { name: 'Añadir' }));
      await screen.findByText('Asignar Ejercicio');
    };

    it('el boton queda desactivado hasta elegir un ejercicio', async () => {
      await renderLoaded();

      await openAdd();

      expect(screen.getByRole('button', { name: 'Añadir a la Sesión' })).toBeDisabled();
    });

    it('el filtro de categoria limita los ejercicios que se ofrecen', async () => {
      await renderLoaded();
      await openAdd();
      expect(optionsOf(/Selecciona un ejercicio/)).toEqual(['[5] Drive cruzado', 'Bloqueo corto']);

      choose(/Filtrar por Categoría/, 'Bloqueos y Contraataque');

      expect(optionsOf(/Selecciona un ejercicio/)).toEqual(['Bloqueo corto']);
    });

    it('envia el ejercicio con sus series a la sesion elegida, recarga el plan y cierra el modal', async () => {
      await renderLoaded();
      await openAdd();
      choose(/Selecciona un ejercicio/, '[5] Drive cruzado');
      fireEvent.change(screen.getByLabelText('Series'), { target: { value: '3' } });

      fireEvent.click(screen.getByRole('button', { name: 'Añadir a la Sesión' }));

      await waitFor(() =>
        expect(callsTo(api.post)).toEqual([
          [ENDPOINTS.TRAININGS.SESSIONS('s2'), { exerciseId: 'x1', sets: 3 }],
        ]),
      );
      await waitFor(() => expect(planLoads()).toBe(2));
      await waitFor(() => expect(screen.queryByText('Asignar Ejercicio')).not.toBeInTheDocument());
    });

    it('si falla el envio el modal sigue abierto y no recarga el plan', async () => {
      vi.mocked(api.post).mockRejectedValue(new Error('400'));
      await renderLoaded();
      await openAdd();
      choose(/Selecciona un ejercicio/, 'Bloqueo corto');

      fireEvent.click(screen.getByRole('button', { name: 'Añadir a la Sesión' }));

      await waitFor(() => expect(api.post).toHaveBeenCalled());
      await waitFor(() =>
        expect(screen.getByRole('button', { name: 'Añadir a la Sesión' })).toBeEnabled(),
      );
      expect(screen.getByText('Asignar Ejercicio')).toBeInTheDocument();
      expect(planLoads()).toBe(1);
    });
  });

  describe('clonar una sesion', () => {
    const openClone = async (title: string) => {
      fireEvent.click(within(cardOf(title)).getByRole('button', { name: 'Clonar' }));
      await screen.findByText(/Clonar Ejercicios a Sesión/);
    };

    it('ofrece como origen las sesiones con ejercicios', async () => {
      await renderLoaded();

      await openClone('Sesión 2');

      expect(screen.getByText('Clonar Ejercicios a Sesión 2')).toBeInTheDocument();
      expect(optionsOf(/Sesión Origen/)).toEqual([
        'Sesión 1 (2 ejercicios)',
        'Sesión 3 (6 ejercicios)',
      ]);
    });

    it('no ofrece la propia sesion de destino como origen', async () => {
      await renderLoaded();

      await openClone('Sesión 1');

      expect(optionsOf(/Sesión Origen/)).toEqual(['Sesión 3 (6 ejercicios)']);
    });

    it('copia los ejercicios, recarga el plan y cierra el modal', async () => {
      await renderLoaded();
      await openClone('Sesión 2');
      choose(/Sesión Origen/, 'Sesión 1 (2 ejercicios)');

      fireEvent.click(screen.getByRole('button', { name: 'Copiar Ejercicios' }));

      await waitFor(() =>
        expect(callsTo(api.post)).toEqual([
          [ENDPOINTS.TRAININGS.CLONE_SESSION('s2', 's1'), undefined],
        ]),
      );
      await waitFor(() => expect(planLoads()).toBe(2));
      await waitFor(() =>
        expect(screen.queryByText(/Clonar Ejercicios a Sesión/)).not.toBeInTheDocument(),
      );
    });

    it('si falla la copia el modal sigue abierto y no recarga el plan', async () => {
      vi.mocked(api.post).mockRejectedValue(new Error('400'));
      await renderLoaded();
      await openClone('Sesión 2');
      choose(/Sesión Origen/, 'Sesión 1 (2 ejercicios)');

      fireEvent.click(screen.getByRole('button', { name: 'Copiar Ejercicios' }));

      await waitFor(() => expect(api.post).toHaveBeenCalled());
      await waitFor(() =>
        expect(screen.getByRole('button', { name: 'Copiar Ejercicios' })).toBeEnabled(),
      );
      expect(screen.getByText(/Clonar Ejercicios a Sesión/)).toBeInTheDocument();
      expect(planLoads()).toBe(1);
    });
  });

  describe('quitar un ejercicio', () => {
    const clickTrash = (itemName: string) =>
      fireEvent.click(
        screen
          .getByText(itemName)
          .closest('[class*="mantine-Paper-root"]')
          ?.querySelector('.tabler-icon-trash')
          ?.closest('button') as HTMLElement,
      );

    it('pide confirmacion, borra el ejercicio y recarga el plan', async () => {
      await renderLoaded();

      clickTrash('[12] Top spin de derecha');
      expect(await screen.findByText('Quitar Ejercicio')).toBeInTheDocument();
      fireEvent.click(screen.getByRole('button', { name: 'Sí, quitar' }));

      await waitFor(() =>
        expect(vi.mocked(api.delete).mock.calls.map(([url]) => url)).toEqual([
          ENDPOINTS.TRAININGS.DELETE_EXERCISE('e1'),
        ]),
      );
      await waitFor(() => expect(planLoads()).toBe(2));
    });

    it('cancelar no borra nada', async () => {
      await renderLoaded();
      clickTrash('[12] Top spin de derecha');

      fireEvent.click(await screen.findByRole('button', { name: 'Cancelar' }));

      await waitFor(() => expect(screen.queryByText('Quitar Ejercicio')).not.toBeInTheDocument());
      expect(api.delete).not.toHaveBeenCalled();
    });

    it('durante la recarga la pantalla sigue visible, sin volver al cargador', async () => {
      await renderLoaded();
      let loads = 0;
      vi.mocked(api.get).mockImplementation((async (url: string) => {
        if (url === PLAN_URL) {
          loads += 1;
          return loads === 1 ? envelope(makePlan()) : new Promise(() => {});
        }
        return envelope(CATALOG);
      }) as never);

      clickTrash('[12] Top spin de derecha');
      fireEvent.click(await screen.findByRole('button', { name: 'Sí, quitar' }));
      await waitFor(() => expect(api.delete).toHaveBeenCalled());
      await waitFor(() => expect(loads).toBeGreaterThan(0));

      expect(screen.getByRole('heading', { name: 'Detalles del Macrociclo' })).toBeInTheDocument();
      expect(screen.getByText('Sesión 1')).toBeInTheDocument();
    });
  });

  describe('estructura del DOM', () => {
    // Verificador mecanico de la regla de oro del JSX.
    it('el plan de un administrador conserva su estructura', async () => {
      const { container } = await renderLoaded();

      expect(stableHtml(container.innerHTML)).toMatchSnapshot();
    });
  });
});

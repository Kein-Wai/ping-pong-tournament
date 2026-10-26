import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen, fireEvent, waitFor } from '@testing-library/react';
import { Routes, Route } from 'react-router-dom';
import { api } from '../../api/axios';
import { ENDPOINTS } from '../../api/endpoints';
import { APP_ROUTES } from '../../constants/routes';
import { normalizeIds, renderWithProviders } from '../../test/utils';
import { SessionDetalles } from './SessionDetalles';

// Se mockea el `api` de bajo nivel (la frontera del sistema) y no los servicios,
// para que estos tests sigan valiendo cuando el acceso a datos migre a servicios.
vi.mock('../../api/axios', () => ({
  api: {
    get: vi.fn(),
    put: vi.fn(),
  },
}));

const envelope = (data: unknown) => ({ data: { success: true, data } });

const makeExercise = (overrides: Record<string, unknown> = {}) => ({
  id: 'e0',
  completed: false,
  sets: 3,
  reps: 10,
  durationMinutes: null,
  notes: null,
  exercise: { code: null, name: 'Ejercicio', description: 'Descripción del ejercicio' },
  ...overrides,
});

const TOPSPIN = makeExercise({
  id: 'e1',
  notes: 'Ir despacio',
  durationMinutes: 15,
  exercise: { code: 12, name: 'Top spin de derecha', description: 'Repetir sobre la diagonal' },
});
const BLOQUEO = makeExercise({
  id: 'e2',
  completed: true,
  sets: null,
  reps: null,
  exercise: { code: null, name: 'Bloqueo de revés', description: null },
});

const serve = (exercises: unknown[] = [TOPSPIN, BLOQUEO]) => {
  vi.mocked(api.get).mockResolvedValue(envelope({ id: 's1', exercises }) as never);
};

const renderPage = () =>
  renderWithProviders(
    <Routes>
      <Route path="/previa" element={<div>Pantalla anterior</div>} />
      <Route path={APP_ROUTES.ENTRENAMIENTOS.SESSION_PATH} element={<SessionDetalles />} />
    </Routes>,
    { initialEntries: ['/previa', APP_ROUTES.ENTRENAMIENTOS.SESSION('s1')] },
  );

const renderLoaded = async () => {
  const view = renderPage();
  await screen.findByRole('heading', { name: 'Entrenamiento del Día' });
  return view;
};

describe('SessionDetalles', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    serve();
    vi.mocked(api.put).mockResolvedValue(envelope({}) as never);
  });

  describe('carga', () => {
    it('pide la sesion de la URL y lista sus ejercicios', async () => {
      await renderLoaded();

      expect(api.get).toHaveBeenCalledWith(ENDPOINTS.TRAININGS.SESSION_DETAILS('s1'), undefined);
      expect(screen.getByText('[12] Top spin de derecha')).toBeInTheDocument();
      expect(screen.getByText('Bloqueo de revés')).toBeInTheDocument();
    });

    it('muestra series, repeticiones, duracion, descripcion y notas de cada ejercicio', async () => {
      await renderLoaded();

      expect(screen.getByText('3 x 10')).toBeInTheDocument();
      expect(screen.getByText('15 min')).toBeInTheDocument();
      expect(screen.getByText('Repetir sobre la diagonal')).toBeInTheDocument();
      expect(screen.getByText('Sin descripción detallada.')).toBeInTheDocument();
      expect(screen.getAllByLabelText('Mis anotaciones / Feedback')[0]).toHaveValue('Ir despacio');
    });

    it('incluye la tabla de referencia de nomenclaturas', async () => {
      await renderLoaded();

      expect(screen.getByText('Tabla de Referencia (Nomenclaturas)')).toBeInTheDocument();
    });

    it('avisa cuando la sesion no tiene ejercicios', async () => {
      serve([]);

      await renderLoaded();

      expect(screen.getByText('No hay ejercicios asignados a esta sesión.')).toBeInTheDocument();
    });

    it('felicita cuando todos los ejercicios estan completados', async () => {
      serve([makeExercise({ id: 'a', completed: true }), makeExercise({ id: 'b', completed: true })]);

      await renderLoaded();

      expect(screen.getByText('¡Gran trabajo!')).toBeInTheDocument();
    });

    it('no felicita si queda algun ejercicio por hacer', async () => {
      await renderLoaded();

      expect(screen.queryByText('¡Gran trabajo!')).not.toBeInTheDocument();
    });

    it('avisa cuando no se encuentra la sesion', async () => {
      const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
      vi.mocked(api.get).mockRejectedValue(new Error('404'));

      renderPage();

      expect(await screen.findByText('Sesión no encontrada')).toBeInTheDocument();
      expect(consoleError).toHaveBeenCalled();
    });

    it('«Volver al Macrociclo» regresa a la pantalla anterior', async () => {
      await renderLoaded();

      fireEvent.click(screen.getByRole('button', { name: 'Volver al Macrociclo' }));

      expect(await screen.findByText('Pantalla anterior')).toBeInTheDocument();
    });
  });

  describe('completar ejercicios', () => {
    it('marcar como completado envia completed: true y recarga la sesion', async () => {
      await renderLoaded();

      fireEvent.click(screen.getByRole('button', { name: 'Marcar como Completado' }));

      await waitFor(() =>
        expect(api.put).toHaveBeenCalledWith(
          ENDPOINTS.TRAININGS.UPDATE_EXERCISE('e1'),
          { completed: true },
          undefined,
        ),
      );
      await waitFor(() => expect(api.get).toHaveBeenCalledTimes(2));
    });

    it('desmarcar un ejercicio completado envia completed: false', async () => {
      await renderLoaded();

      fireEvent.click(screen.getByRole('button', { name: 'Desmarcar Ejercicio' }));

      await waitFor(() =>
        expect(api.put).toHaveBeenCalledWith(
          ENDPOINTS.TRAININGS.UPDATE_EXERCISE('e2'),
          { completed: false },
          undefined,
        ),
      );
    });

    it('las notas de un ejercicio completado no se pueden editar', async () => {
      await renderLoaded();

      const notes = screen.getAllByLabelText('Mis anotaciones / Feedback');
      expect(notes[0]).toBeEnabled();
      expect(notes[1]).toBeDisabled();
    });

    it('si falla el cambio no recarga la sesion', async () => {
      vi.mocked(api.put).mockRejectedValue(new Error('403'));
      await renderLoaded();

      fireEvent.click(screen.getByRole('button', { name: 'Marcar como Completado' }));

      await waitFor(() => expect(api.put).toHaveBeenCalled());
      expect(api.get).toHaveBeenCalledTimes(1);
    });
  });

  describe('anotaciones', () => {
    it('al salir del campo guarda solo las notas y no recarga la sesion', async () => {
      await renderLoaded();
      const notes = screen.getAllByLabelText('Mis anotaciones / Feedback')[0];

      fireEvent.change(notes, { target: { value: 'Subir la velocidad' } });
      fireEvent.blur(notes);

      await waitFor(() =>
        expect(api.put).toHaveBeenCalledWith(
          ENDPOINTS.TRAININGS.UPDATE_EXERCISE('e1'),
          { notes: 'Subir la velocidad' },
          undefined,
        ),
      );
      expect(api.get).toHaveBeenCalledTimes(1);
    });
  });

  describe('estructura del DOM', () => {
    // Verificador mecanico de la regla de oro del JSX.
    it('la sesion con ejercicios conserva su estructura', async () => {
      const { container } = await renderLoaded();

      expect(normalizeIds(container.innerHTML)).toMatchSnapshot();
    });
  });
});

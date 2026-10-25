import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen, fireEvent, waitFor } from '@testing-library/react';
import { Routes, Route } from 'react-router-dom';
import { api } from '../../api/axios';
import { ENDPOINTS } from '../../api/endpoints';
import { APP_ROUTES } from '../../constants/routes';
import { useAuthStore } from '../../store/authStore';
import { loginAs, renderWithProviders } from '../../test/utils';
import { WidgetEntrenamientos } from './WidgetEntrenamientos';

// Se mockea el `api` de bajo nivel (la frontera del sistema) y no los servicios,
// para que estos tests sigan valiendo cuando el acceso a datos migre a servicios.
vi.mock('../../api/axios', () => ({
  api: {
    get: vi.fn(),
  },
}));

const makeSession = (id: string, done: number, total: number) => ({
  id,
  exercises: Array.from({ length: total }, (_, index) => ({ completed: index < done })),
  _count: { exercises: total },
});

const serve = (sessions: unknown[] = [makeSession('s1', 1, 2)]) => {
  vi.mocked(api.get).mockResolvedValue({ data: { success: true, data: sessions } } as never);
};

const renderWidget = () =>
  renderWithProviders(
    <Routes>
      <Route path={APP_ROUTES.HOME} element={<WidgetEntrenamientos />} />
      <Route
        path={APP_ROUTES.ENTRENAMIENTOS.SESSION_PATH}
        element={<div>Pantalla de la sesion</div>}
      />
    </Routes>,
  );

describe('WidgetEntrenamientos', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useAuthStore.setState({ token: null, user: null, isAuthenticated: false });
    serve();
    loginAs({ id: 'p1', role: 'Player' });
  });

  it('pide las proximas sesiones del jugador', async () => {
    renderWidget();
    await screen.findByText('Entrenamientos Pendientes');

    expect(api.get).toHaveBeenCalledWith(ENDPOINTS.TRAININGS.UPCOMING('p1'), undefined);
  });

  it('muestra el progreso de cada sesion y distingue la siguiente de las que esperan', async () => {
    serve([makeSession('s1', 1, 2), makeSession('s2', 0, 3)]);

    renderWidget();

    expect(await screen.findByText('Siguiente Sesión')).toBeInTheDocument();
    expect(screen.getByText('Sesión en Cola')).toBeInTheDocument();
    expect(screen.getByText('Progreso: 1 / 2 ejercicios')).toBeInTheDocument();
    expect(screen.getByText('Progreso: 0 / 3 ejercicios')).toBeInTheDocument();
  });

  it('ofrece «Continuar» si ya hay ejercicios hechos y «Empezar» si no', async () => {
    serve([makeSession('s1', 1, 2), makeSession('s2', 0, 3)]);

    renderWidget();

    expect(await screen.findByRole('button', { name: 'Continuar' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Empezar' })).toBeInTheDocument();
  });

  it('cuenta cero ejercicios hechos si la sesion no trae la lista', async () => {
    serve([{ id: 's1', _count: { exercises: 4 } }]);

    renderWidget();

    expect(await screen.findByText('Progreso: 0 / 4 ejercicios')).toBeInTheDocument();
  });

  it('el boton de una sesion lleva a su pantalla', async () => {
    renderWidget();

    fireEvent.click(await screen.findByRole('button', { name: 'Continuar' }));

    expect(await screen.findByText('Pantalla de la sesion')).toBeInTheDocument();
  });

  it('no se muestra cuando no hay sesiones pendientes', async () => {
    serve([]);

    renderWidget();
    await waitFor(() => expect(api.get).toHaveBeenCalled());

    expect(screen.queryByText('Entrenamientos Pendientes')).not.toBeInTheDocument();
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });

  it('no se muestra si falla la carga', async () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.mocked(api.get).mockRejectedValue(new Error('red caida'));

    renderWidget();

    await waitFor(() => expect(consoleError).toHaveBeenCalled());
    expect(screen.queryByText('Entrenamientos Pendientes')).not.toBeInTheDocument();
  });

  it.each(['AdminClub', 'SuperAdmin'])('un %s no pide sesiones', async (role) => {
    loginAs({ id: 'p1', role });

    renderWidget();

    expect(api.get).not.toHaveBeenCalled();
    expect(screen.queryByText('Entrenamientos Pendientes')).not.toBeInTheDocument();
  });
});

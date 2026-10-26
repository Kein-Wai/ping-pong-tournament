import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { screen, fireEvent, waitFor } from '@testing-library/react';
import { Routes, Route } from 'react-router-dom';
import { api } from '../../api/axios';
import { ENDPOINTS } from '../../api/endpoints';
import { APP_ROUTES } from '../../constants/routes';
import { normalizeIds, renderWithProviders } from '../../test/utils';
import { PlanNuevo } from './PlanNuevo';

// Se mockea el `api` de bajo nivel (la frontera del sistema) y no los servicios,
// para que estos tests sigan valiendo cuando el acceso a datos migre a servicios.
vi.mock('../../api/axios', () => ({
  api: {
    get: vi.fn(),
    post: vi.fn(),
  },
}));

// Mantine genera ids y `name` con mayusculas que normalizeIds no cubre.
const stableHtml = (html: string) =>
  normalizeIds(html).replace(/mantine-[a-z0-9]{9,}/g, 'mantine-id');

const NOW = '2026-10-15T12:00:00.000Z';
const envelope = <T,>(data: T) => ({ data: { success: true, data } });

const renderPage = () =>
  renderWithProviders(
    <Routes>
      <Route path={APP_ROUTES.ENTRENAMIENTOS.NEW_PATH} element={<PlanNuevo />} />
      <Route path={APP_ROUTES.ENTRENAMIENTOS.DETAILS_PATH} element={<div>Pantalla del plan</div>} />
      <Route path={APP_ROUTES.JUGADORES.PROFILE_PATH} element={<div>Pantalla del perfil</div>} />
    </Routes>,
    { initialEntries: [APP_ROUTES.ENTRENAMIENTOS.NEW('p1')] },
  );

const renderLoaded = async () => {
  const view = renderPage();
  await screen.findByRole('heading', { name: 'Planificación (Macrociclo)' });
  return view;
};

const fill = () => {
  fireEvent.change(screen.getByLabelText(/Fortalezas/), { target: { value: 'Saque' } });
  fireEvent.change(screen.getByLabelText(/Debilidades/), { target: { value: 'Revés' } });
  fireEvent.change(screen.getByLabelText(/Objetivos del Macrociclo/), { target: { value: 'Movilidad' } });
};

const submit = () =>
  fireEvent.submit(screen.getByRole('button', { name: 'Generar Plan y Sesiones' }).closest('form')!);

describe('PlanNuevo', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // La fecha de inicio por defecto es «hoy»: se congela solo Date.
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date(NOW));
    vi.mocked(api.get).mockResolvedValue(
      envelope({ id: 'p1', name: 'Ana', surname: 'López' }) as never,
    );
    vi.mocked(api.post).mockResolvedValue(envelope({ id: 'plan9' }) as never);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('carga del jugador', () => {
    it('muestra un loader hasta tener al jugador', () => {
      renderPage();

      expect(screen.queryByRole('heading', { name: 'Planificación (Macrociclo)' })).not.toBeInTheDocument();
    });

    it('pide al jugador de la URL y muestra su nombre', async () => {
      await renderLoaded();

      expect(api.get).toHaveBeenCalledWith(ENDPOINTS.USERS.BY_ID('p1'), undefined);
      expect(screen.getByText('Ana López')).toBeInTheDocument();
    });

    it('si la carga falla, se queda en el loader', async () => {
      vi.spyOn(console, 'error').mockImplementation(() => undefined);
      vi.mocked(api.get).mockRejectedValue(new Error('404'));
      renderPage();

      await waitFor(() => expect(api.get).toHaveBeenCalledTimes(1));

      expect(screen.queryByRole('heading', { name: 'Planificación (Macrociclo)' })).not.toBeInTheDocument();
    });
  });

  describe('crear el plan', () => {
    it('envía el plan con 3 sesiones por semana, 4 semanas y empezando hoy', async () => {
      await renderLoaded();
      fill();

      submit();

      await waitFor(() =>
        expect(api.post).toHaveBeenCalledWith(
          ENDPOINTS.TRAININGS.BASE,
          {
            playerId: 'p1',
            strengths: 'Saque',
            weaknesses: 'Revés',
            objectives: 'Movilidad',
            sessionsPerWeek: 3,
            weeks: 4,
            startDate: NOW,
          },
          undefined,
        ),
      );
    });

    it('envía las semanas y sesiones editadas como números', async () => {
      await renderLoaded();
      fill();
      fireEvent.change(screen.getByLabelText(/Duración \(Semanas\)/), { target: { value: '8' } });
      fireEvent.change(screen.getByLabelText(/Sesiones por Semana/), { target: { value: '5' } });

      submit();

      await waitFor(() => expect(api.post).toHaveBeenCalledTimes(1));
      expect(vi.mocked(api.post).mock.calls[0][1]).toMatchObject({ weeks: 8, sessionsPerWeek: 5 });
    });

    it('al crearlo navega directamente al detalle del plan nuevo', async () => {
      await renderLoaded();
      fill();

      submit();

      expect(await screen.findByText('Pantalla del plan')).toBeInTheDocument();
    });

    it('si el guardado falla, se queda en el formulario y vuelve a habilitar el botón', async () => {
      vi.spyOn(console, 'error').mockImplementation(() => undefined);
      vi.mocked(api.post).mockRejectedValue(new Error('400'));
      await renderLoaded();
      fill();

      submit();

      await waitFor(() => expect(api.post).toHaveBeenCalledTimes(1));
      await waitFor(() =>
        expect(screen.getByRole('button', { name: 'Generar Plan y Sesiones' })).not.toBeDisabled(),
      );
      expect(screen.queryByText('Pantalla del plan')).not.toBeInTheDocument();
    });
  });

  it('«Volver al Perfil» regresa al perfil del jugador', async () => {
    await renderLoaded();

    fireEvent.click(screen.getByRole('button', { name: 'Volver al Perfil' }));

    expect(await screen.findByText('Pantalla del perfil')).toBeInTheDocument();
  });

  it('el DOM del formulario no cambia', async () => {
    const { container } = await renderLoaded();

    expect(stableHtml(container.innerHTML)).toMatchSnapshot();
  });
});

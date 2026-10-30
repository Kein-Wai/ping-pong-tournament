import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { screen, fireEvent, waitFor } from '@testing-library/react';
import { Routes, Route } from 'react-router-dom';
import { api } from '../../api/axios';
import { ENDPOINTS } from '../../api/endpoints';
import { APP_ROUTES } from '../../constants/routes';
import { chooseOption, renderWithProviders } from '../../test/utils';
import { LigaNueva } from './LigaNueva';

vi.mock('../../api/axios', () => ({ api: { post: vi.fn() } }));

const NOW = '2026-10-15T12:00:00.000Z';

const renderPage = () =>
  renderWithProviders(
    <Routes>
      <Route path={APP_ROUTES.LIGAS.NEW} element={<LigaNueva />} />
      <Route path={APP_ROUTES.LIGAS.LIST} element={<div>Pantalla de ligas</div>} />
      <Route path={APP_ROUTES.LIGAS.DETAILS_PATH} element={<div>Pantalla de una liga</div>} />
    </Routes>,
    { initialEntries: [APP_ROUTES.LIGAS.NEW] },
  );

const fillName = (value = 'Liga de invierno') =>
  fireEvent.change(screen.getByLabelText(/Nombre de la Liga/), { target: { value } });

const submit = () =>
  fireEvent.submit(screen.getByRole('button', { name: 'Guardar y Crear Liga' }).closest('form')!);

const sentPayload = () => vi.mocked(api.post).mock.calls[0][1];

describe('LigaNueva', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Sin fecha elegida la liga usa «hoy»: se congela solo Date.
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date(NOW));
    vi.mocked(api.post).mockResolvedValue({
      data: { success: true, data: { id: 'l99' } },
    } as never);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('arranca con mejor de 3 sets y una sola vuelta', () => {
    renderPage();

    expect(screen.getByLabelText(/Nombre de la Liga/)).toHaveValue('');
    expect(screen.getByRole('combobox', { name: /Formato de los partidos/ })).toHaveValue(
      'Mejor de 3 sets',
    );
    expect(screen.getByRole('switch', { name: /Ida y vuelta/ })).not.toBeChecked();
  });

  it('crea la liga con los valores por defecto y abre su detalle', async () => {
    renderPage();
    fillName();

    submit();

    await waitFor(() =>
      expect(api.post).toHaveBeenCalledWith(ENDPOINTS.LEAGUES.BASE, expect.any(Object), undefined),
    );
    expect(sentPayload()).toEqual({
      name: 'Liga de invierno',
      dateStart: NOW,
      setsToWin: 2,
      doubleRound: false,
    });
    expect(await screen.findByText('Pantalla de una liga')).toBeInTheDocument();
  });

  it('envía los sets para ganar y la ida y vuelta elegidos', async () => {
    renderPage();
    fillName('Liga larga');
    chooseOption(/Formato de los partidos/, 'Mejor de 5 sets');
    fireEvent.click(screen.getByRole('switch', { name: /Ida y vuelta/ }));

    submit();

    await waitFor(() => expect(api.post).toHaveBeenCalled());
    expect(sentPayload()).toMatchObject({ name: 'Liga larga', setsToWin: 3, doubleRound: true });
  });

  it('elimina los espacios sobrantes del nombre', async () => {
    renderPage();
    fillName('  Liga con espacios  ');

    submit();

    await waitFor(() => expect(api.post).toHaveBeenCalled());
    expect(sentPayload()).toMatchObject({ name: 'Liga con espacios' });
  });

  it('si la API rechaza la liga, se queda en el formulario', async () => {
    vi.mocked(api.post).mockRejectedValue(new Error('Ya existe una liga con ese nombre'));
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
    renderPage();
    fillName();

    submit();

    await waitFor(() => expect(api.post).toHaveBeenCalled());
    expect(screen.queryByText('Pantalla de una liga')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Guardar y Crear Liga' })).toBeEnabled();
    consoleError.mockRestore();
  });

  it('«Volver a Ligas» regresa al listado', async () => {
    renderPage();

    fireEvent.click(screen.getByRole('button', { name: 'Volver a Ligas' }));

    expect(await screen.findByText('Pantalla de ligas')).toBeInTheDocument();
  });
});

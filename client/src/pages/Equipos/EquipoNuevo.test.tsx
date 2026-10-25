import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen, fireEvent, waitFor } from '@testing-library/react';
import { Routes, Route } from 'react-router-dom';
import { api } from '../../api/axios';
import { ENDPOINTS } from '../../api/endpoints';
import { APP_ROUTES } from '../../constants/routes';
import { chooseOption, normalizeIds, renderWithProviders } from '../../test/utils';
import { EquipoNuevo } from './EquipoNuevo';

// Se mockea el `api` de bajo nivel (la frontera del sistema) y no los servicios,
// para que estos tests sigan valiendo cuando el acceso a datos migre a servicios.
vi.mock('../../api/axios', () => ({
  api: {
    post: vi.fn(),
  },
}));

// Mantine genera ids y `name` con mayusculas que normalizeIds no cubre.
const stableHtml = (html: string) =>
  normalizeIds(html).replace(/mantine-[a-z0-9]{9,}/g, 'mantine-id');

const renderPage = () =>
  renderWithProviders(
    <Routes>
      <Route path={APP_ROUTES.EQUIPOS.NEW} element={<EquipoNuevo />} />
      <Route path={APP_ROUTES.EQUIPOS.LIST} element={<div>Pantalla de equipos</div>} />
    </Routes>,
    { initialEntries: [APP_ROUTES.EQUIPOS.NEW] },
  );

const fillName = (value = 'TM Castellón Promesas') =>
  fireEvent.change(screen.getByLabelText(/Nombre del Equipo/), { target: { value } });

// jsdom bloquea el envio por clic con campos `required` vacios: se envia el formulario.
const submit = () =>
  fireEvent.submit(screen.getByRole('button', { name: 'Guardar Equipo' }).closest('form')!);

describe('EquipoNuevo', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(api.post).mockResolvedValue({ data: { success: true, data: { id: 't9' } } } as never);
  });

  describe('formulario', () => {
    it('arranca con categoría «1ª Autonómica» y nivel «Intermedio»', () => {
      renderPage();

      expect(screen.getByRole('combobox', { name: /Categoría de Liga/ })).toHaveValue('1ª Autonómica');
      expect(screen.getByRole('combobox', { name: /Nivel Base Inicial/ })).toHaveValue('Intermedio');
    });

    it('«Volver a Equipos» regresa al listado', async () => {
      renderPage();

      fireEvent.click(screen.getByRole('button', { name: 'Volver a Equipos' }));

      expect(await screen.findByText('Pantalla de equipos')).toBeInTheDocument();
    });
  });

  describe('crear el equipo', () => {
    it('envía nombre, categoría y nivel por defecto', async () => {
      renderPage();
      fillName();

      submit();

      await waitFor(() =>
        expect(api.post).toHaveBeenCalledWith(
          ENDPOINTS.TEAMS.BASE,
          { name: 'TM Castellón Promesas', category: '1ª Autonómica', level: 'Intermedio' },
          undefined,
        ),
      );
    });

    it('envía la categoría y el nivel elegidos', async () => {
      renderPage();
      fillName();
      chooseOption(/Categoría de Liga/, 'Superdivisión');
      chooseOption(/Nivel Base Inicial/, 'Profesional');

      submit();

      await waitFor(() =>
        expect(api.post).toHaveBeenCalledWith(
          ENDPOINTS.TEAMS.BASE,
          { name: 'TM Castellón Promesas', category: 'Superdivisión', level: 'Profesional' },
          undefined,
        ),
      );
    });

    it('al guardar con éxito vuelve al listado', async () => {
      renderPage();
      fillName();

      submit();

      expect(await screen.findByText('Pantalla de equipos')).toBeInTheDocument();
    });

    it('si el guardado falla, se queda en el formulario y vuelve a habilitar el botón', async () => {
      vi.spyOn(console, 'error').mockImplementation(() => undefined);
      vi.mocked(api.post).mockRejectedValue(new Error('400'));
      renderPage();
      fillName();

      submit();

      await waitFor(() => expect(api.post).toHaveBeenCalledTimes(1));
      await waitFor(() =>
        expect(screen.getByRole('button', { name: 'Guardar Equipo' })).not.toBeDisabled(),
      );
      expect(screen.queryByText('Pantalla de equipos')).not.toBeInTheDocument();
      expect(screen.getByLabelText(/Nombre del Equipo/)).toHaveValue('TM Castellón Promesas');
    });
  });

  it('el DOM del formulario no cambia', () => {
    const { container } = renderPage();

    expect(stableHtml(container.innerHTML)).toMatchSnapshot();
  });
});

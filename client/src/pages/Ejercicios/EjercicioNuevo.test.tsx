import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen, fireEvent, waitFor } from '@testing-library/react';
import { Routes, Route } from 'react-router-dom';
import { api } from '../../api/axios';
import { ENDPOINTS } from '../../api/endpoints';
import { APP_ROUTES } from '../../constants/routes';
import { chooseOption, normalizeIds, renderWithProviders } from '../../test/utils';
import { EjercicioNuevo } from './EjercicioNuevo';

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
      <Route path={APP_ROUTES.EJERCICIOS.NEW} element={<EjercicioNuevo />} />
      <Route path={APP_ROUTES.EJERCICIOS.LIST} element={<div>Pantalla del catálogo</div>} />
    </Routes>,
    { initialEntries: [APP_ROUTES.EJERCICIOS.NEW] },
  );

const fillName = (value = 'Saque lateral corto') =>
  fireEvent.change(screen.getByLabelText(/Nombre del Ejercicio/), { target: { value } });

const fillDescription = (value = 'Paso 1, paso 2') =>
  fireEvent.change(screen.getByLabelText(/Descripción detallada/), { target: { value } });

// jsdom bloquea el envio por clic con campos `required` vacios: se envia el formulario.
const submit = () =>
  fireEvent.submit(screen.getByRole('button', { name: 'Guardar Ejercicio' }).closest('form')!);

const sentPayload = () => vi.mocked(api.post).mock.calls[0][1];

describe('EjercicioNuevo', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(api.post).mockResolvedValue({ data: { success: true, data: { id: 'e9' } } } as never);
  });

  describe('formulario', () => {
    it('arranca con la primera categoría seleccionada y sin código', () => {
      renderPage();

      expect(screen.getByRole('combobox', { name: /Categoría/ })).toHaveValue(
        'Control de Contra Top Spin',
      );
      expect(screen.getByLabelText(/Código de Referencia/)).toHaveValue('');
    });

    it('«Volver al Catálogo» regresa al listado', async () => {
      renderPage();

      fireEvent.click(screen.getByRole('button', { name: 'Volver al Catálogo' }));

      expect(await screen.findByText('Pantalla del catálogo')).toBeInTheDocument();
    });
  });

  describe('crear el ejercicio', () => {
    it('sin código: envía nombre, descripción y la categoría por defecto', async () => {
      renderPage();
      fillName();
      fillDescription();

      submit();

      await waitFor(() =>
        expect(api.post).toHaveBeenCalledWith(ENDPOINTS.EXERCISES.BASE, expect.any(Object), undefined),
      );
      expect(sentPayload()).toEqual({
        name: 'Saque lateral corto',
        description: 'Paso 1, paso 2',
        category: 'Control_CT',
      });
    });

    it('con código: lo envía como número', async () => {
      renderPage();
      fillName();
      fillDescription();
      fireEvent.change(screen.getByLabelText(/Código de Referencia/), { target: { value: '14' } });

      submit();

      await waitFor(() => expect(api.post).toHaveBeenCalledTimes(1));
      expect(sentPayload()).toEqual({
        name: 'Saque lateral corto',
        description: 'Paso 1, paso 2',
        category: 'Control_CT',
        code: 14,
      });
    });

    it('envía la categoría elegida', async () => {
      renderPage();
      fillName();
      fillDescription();
      chooseOption(/Categoría/, 'Movilidad Lateral');

      submit();

      await waitFor(() => expect(api.post).toHaveBeenCalledTimes(1));
      expect(sentPayload()).toMatchObject({ category: 'Movilidad_Lateral' });
    });

    it('al guardar con éxito vuelve al catálogo', async () => {
      renderPage();
      fillName();
      fillDescription();

      submit();

      expect(await screen.findByText('Pantalla del catálogo')).toBeInTheDocument();
    });

    it('si el guardado falla, se queda en el formulario y vuelve a habilitar el botón', async () => {
      vi.spyOn(console, 'error').mockImplementation(() => undefined);
      vi.mocked(api.post).mockRejectedValue(new Error('400'));
      renderPage();
      fillName();
      fillDescription();

      submit();

      await waitFor(() => expect(api.post).toHaveBeenCalledTimes(1));
      await waitFor(() =>
        expect(screen.getByRole('button', { name: 'Guardar Ejercicio' })).not.toBeDisabled(),
      );
      expect(screen.queryByText('Pantalla del catálogo')).not.toBeInTheDocument();
      expect(screen.getByLabelText(/Nombre del Ejercicio/)).toHaveValue('Saque lateral corto');
    });
  });

  describe('snapshot', () => {
    it('el DOM del formulario no cambia', () => {
      const { container } = renderPage();

      expect(stableHtml(container.innerHTML)).toMatchSnapshot();
    });
  });
});

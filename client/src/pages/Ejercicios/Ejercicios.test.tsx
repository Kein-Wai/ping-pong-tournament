import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen, fireEvent, waitFor, within } from '@testing-library/react';
import { Routes, Route } from 'react-router-dom';
import { api } from '../../api/axios';
import { ENDPOINTS } from '../../api/endpoints';
import { APP_ROUTES } from '../../constants/routes';
import { chooseOption, normalizeIds, renderWithProviders } from '../../test/utils';
import { Ejercicios } from './Ejercicios';

// Se mockea el `api` de bajo nivel (la frontera del sistema) y no los servicios,
// para que estos tests sigan valiendo cuando el acceso a datos migre a servicios.
vi.mock('../../api/axios', () => ({
  api: {
    get: vi.fn(),
  },
}));

// Mantine genera ids y `name` con mayusculas que normalizeIds no cubre.
const stableHtml = (html: string) =>
  normalizeIds(html).replace(/mantine-[a-z0-9]{9,}/g, 'mantine-id');

const renderPage = () =>
  renderWithProviders(
    <Routes>
      <Route path={APP_ROUTES.EJERCICIOS.LIST} element={<Ejercicios />} />
      <Route path={APP_ROUTES.EJERCICIOS.NEW} element={<div>Pantalla de nuevo ejercicio</div>} />
    </Routes>,
    { initialEntries: [APP_ROUTES.EJERCICIOS.LIST] },
  );

const envelope = <T,>(data: T) => ({ data: { success: true, data } });

const EXERCISES = [
  {
    id: 'e1',
    name: 'Saque lateral corto',
    code: 14,
    description: 'Paso 1\nPaso 2',
    category: 'Saques_Largos',
    clubId: null,
  },
  {
    id: 'e2',
    name: 'Bloqueo cruzado',
    code: null,
    description: 'Bloquear a la diagonal',
    category: 'Bloqueo_Contraataque',
    clubId: 'club-1',
  },
  {
    id: 'e3',
    name: 'Ejercicio raro',
    description: 'Con categoría fuera del catálogo',
    category: 'Categoria_Desconocida',
    clubId: 'club-1',
  },
];

describe('Ejercicios', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(api.get).mockResolvedValue(envelope(EXERCISES) as never);
  });

  describe('catálogo', () => {
    it('pide todo el catálogo al montar, sin filtro', async () => {
      renderPage();

      await screen.findByText('Saque lateral corto');

      expect(api.get).toHaveBeenCalledTimes(1);
      expect(api.get).toHaveBeenCalledWith(ENDPOINTS.EXERCISES.BASE, undefined);
    });

    it('muestra cada ejercicio con su nombre, descripción y etiqueta de categoría', async () => {
      renderPage();

      expect(await screen.findByText('Saque lateral corto')).toBeInTheDocument();
      expect(screen.getByText('Bloqueo cruzado')).toBeInTheDocument();
      // Cada etiqueta aparece también como opción del filtro (lista montada).
      const card = screen.getByText('Saque lateral corto').closest('.mantine-Card-root') as HTMLElement;
      expect(within(card).getByText('Sacar o Recibir Saques Largos')).toBeInTheDocument();
      expect(screen.getAllByText('Bloqueos y Contraataque').length).toBeGreaterThanOrEqual(2);
      expect(screen.getByText('Bloquear a la diagonal')).toBeInTheDocument();
    });

    it('muestra la referencia solo cuando el ejercicio tiene código', async () => {
      renderPage();

      await screen.findByText('Saque lateral corto');

      expect(screen.getByText('Ref: 14')).toBeInTheDocument();
      expect(screen.getAllByText(/^Ref:/)).toHaveLength(1);
    });

    it('marca como global oficial solo los ejercicios sin club', async () => {
      renderPage();

      await screen.findByText('Saque lateral corto');

      expect(screen.getAllByText('🌐 Ejercicio Global Oficial')).toHaveLength(1);
    });

    it('si la categoría no está en el catálogo, muestra el valor tal cual', async () => {
      renderPage();

      expect(await screen.findByText('Categoria_Desconocida')).toBeInTheDocument();
    });

    it('con el catálogo vacío avisa de que no hay ejercicios', async () => {
      vi.mocked(api.get).mockResolvedValue(envelope([]) as never);
      renderPage();

      expect(await screen.findByText('No se encontraron ejercicios.')).toBeInTheDocument();
    });

    it('si la carga falla, deja de cargar y muestra el catálogo vacío', async () => {
      vi.spyOn(console, 'error').mockImplementation(() => undefined);
      vi.mocked(api.get).mockRejectedValue(new Error('500'));
      renderPage();

      expect(await screen.findByText('No se encontraron ejercicios.')).toBeInTheDocument();
    });
  });

  describe('filtro por categoría', () => {
    it('al elegir una categoría vuelve a pedir el catálogo filtrado', async () => {
      renderPage();
      await screen.findByText('Saque lateral corto');
      vi.mocked(api.get).mockResolvedValue(envelope([EXERCISES[1]]) as never);

      chooseOption(/Filtrar por Categoría/, 'Bloqueos y Contraataque');

      await waitFor(() =>
        expect(api.get).toHaveBeenLastCalledWith(ENDPOINTS.EXERCISES.BASE, {
          params: { category: 'Bloqueo_Contraataque' },
        }),
      );
      await waitFor(() => expect(screen.queryByText('Saque lateral corto')).not.toBeInTheDocument());
      expect(screen.getByText('Bloqueo cruzado')).toBeInTheDocument();
    });

    it('al borrar el filtro vuelve a pedir todo el catálogo', async () => {
      const { container } = renderPage();
      await screen.findByText('Saque lateral corto');
      chooseOption(/Filtrar por Categoría/, 'Bloqueos y Contraataque');
      await waitFor(() => expect(api.get).toHaveBeenCalledTimes(2));

      // El botón de limpiar de Mantine es aria-hidden: solo se localiza por su clase.
      fireEvent.click(container.querySelector('button[aria-hidden="true"]') as HTMLElement);

      await waitFor(() => expect(api.get).toHaveBeenCalledTimes(3));
      expect(api.get).toHaveBeenLastCalledWith(ENDPOINTS.EXERCISES.BASE, undefined);
    });
  });

  describe('navegación', () => {
    it('«Crear Ejercicio» lleva al formulario de alta', async () => {
      renderPage();
      await screen.findByText('Saque lateral corto');

      fireEvent.click(screen.getByRole('button', { name: 'Crear Ejercicio' }));

      expect(await screen.findByText('Pantalla de nuevo ejercicio')).toBeInTheDocument();
    });
  });

  describe('snapshot', () => {
    it('el DOM del catálogo cargado no cambia', async () => {
      const { container } = renderPage();
      await screen.findByText('Saque lateral corto');

      expect(stableHtml(container.innerHTML)).toMatchSnapshot();
    });
  });
});

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen, fireEvent, waitFor, within } from '@testing-library/react';
import { api } from '../../api/axios';
import { ENDPOINTS } from '../../api/endpoints';
import { normalizeIds, renderWithProviders } from '../../test/utils';
import { AdminPanel } from './AdminPanel';

// Se mockea el `api` de bajo nivel (la frontera del sistema) y no los servicios,
// para que estos tests sigan valiendo cuando el acceso a datos migre a servicios.
vi.mock('../../api/axios', () => ({
  api: {
    get: vi.fn(),
    put: vi.fn(),
  },
}));

const envelope = (data: unknown) => ({ data: { success: true, data } });

const makeClub = (overrides: Record<string, unknown> = {}) => ({
  id: 'c0',
  name: 'Club',
  city: 'Valencia',
  status: 'Aprobado',
  createdAt: '2026-01-01T10:00:00.000Z',
  _count: { users: 10 },
  users: [{ name: 'Ana', surname: 'Gil', email: 'ana@club.com' }],
  ...overrides,
});

const PENDING = makeClub({ id: 'c1', name: 'Club Norte', status: 'Pendiente', _count: { users: 3 } });
const APPROVED = makeClub({ id: 'c2', name: 'Club Sur', city: 'Sevilla', status: 'Aprobado' });
const INACTIVE = makeClub({ id: 'c3', name: 'Club Este', status: 'Inactivo', users: [] });

const serve = (clubs: unknown[] = [PENDING, APPROVED, INACTIVE]) => {
  vi.mocked(api.get).mockResolvedValue(envelope(clubs) as never);
};

const renderLoaded = async () => {
  const view = renderWithProviders(<AdminPanel />);
  await screen.findByText('Panel de Sistema Global');
  return view;
};

const rowOf = (clubName: string) => screen.getByText(clubName).closest('tr') as HTMLElement;

const actionButtons = (clubName: string) => within(rowOf(clubName)).queryAllByRole('button');

const clickIcon = (clubName: string, icon: 'check' | 'x') =>
  fireEvent.click(
    rowOf(clubName).querySelector(`.tabler-icon-${icon}`)?.closest('button') as HTMLElement,
  );

describe('AdminPanel', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    serve();
    vi.mocked(api.put).mockResolvedValue(envelope({}) as never);
  });

  describe('listado', () => {
    it('pide todos los clubes y muestra sede, presidente, estado y miembros', async () => {
      await renderLoaded();

      expect(api.get).toHaveBeenCalledWith(ENDPOINTS.CLUBS.ADMIN_ALL, undefined);
      const row = within(rowOf('Club Norte'));
      expect(row.getByText('📍 Valencia')).toBeInTheDocument();
      expect(row.getByText('Ana Gil')).toBeInTheDocument();
      expect(row.getByText('ana@club.com')).toBeInTheDocument();
      expect(row.getByText('Pendiente')).toBeInTheDocument();
      expect(row.getByText('3')).toBeInTheDocument();
    });

    it('indica «Sin asignar» cuando el club no tiene administrador', async () => {
      await renderLoaded();

      expect(within(rowOf('Club Este')).getByText('Sin asignar')).toBeInTheDocument();
    });

    it('avisa cuando no hay clubes', async () => {
      serve([]);

      await renderLoaded();

      expect(screen.getByText('No hay clubes registrados en el sistema.')).toBeInTheDocument();
    });

    it('si falla la carga muestra la tabla vacia', async () => {
      const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
      vi.mocked(api.get).mockRejectedValue(new Error('red caida'));

      await renderLoaded();

      expect(screen.getByText('No hay clubes registrados en el sistema.')).toBeInTheDocument();
      expect(consoleError).toHaveBeenCalled();
    });
  });

  describe('acciones segun el estado', () => {
    it('un club pendiente se puede aprobar o suspender', async () => {
      await renderLoaded();

      expect(actionButtons('Club Norte')).toHaveLength(2);
    });

    it('un club aprobado solo se puede suspender', async () => {
      await renderLoaded();

      expect(actionButtons('Club Sur')).toHaveLength(1);
      expect(rowOf('Club Sur').querySelector('.tabler-icon-x')).not.toBeNull();
    });

    it('un club inactivo no ofrece acciones', async () => {
      await renderLoaded();

      expect(actionButtons('Club Este')).toHaveLength(0);
    });
  });

  describe('cambiar el estado de un club', () => {
    it('aprobar pide confirmacion, envia el estado Aprobado y recarga la lista', async () => {
      await renderLoaded();

      clickIcon('Club Norte', 'check');
      expect(await screen.findByText('Aprobar Nueva Sede')).toBeInTheDocument();
      fireEvent.click(screen.getByRole('button', { name: 'Sí, Aprobar Club' }));

      await waitFor(() =>
        expect(api.put).toHaveBeenCalledWith(
          ENDPOINTS.CLUBS.UPDATE('c1'),
          { status: 'Aprobado' },
          undefined,
        ),
      );
      await waitFor(() => expect(api.get).toHaveBeenCalledTimes(2));
    });

    it('suspender pide confirmacion y envia el estado Inactivo', async () => {
      await renderLoaded();

      clickIcon('Club Sur', 'x');
      expect(await screen.findByText('Rechazar / Suspender Sede')).toBeInTheDocument();
      fireEvent.click(screen.getByRole('button', { name: 'Suspender Club' }));

      await waitFor(() =>
        expect(api.put).toHaveBeenCalledWith(
          ENDPOINTS.CLUBS.UPDATE('c2'),
          { status: 'Inactivo' },
          undefined,
        ),
      );
    });

    it('el modal muestra el nombre del club afectado', async () => {
      await renderLoaded();

      clickIcon('Club Norte', 'check');

      const modal = await screen.findByRole('dialog');
      expect(within(modal).getByText('Club Norte')).toBeInTheDocument();
    });

    it('cancelar no llama a la API', async () => {
      await renderLoaded();
      clickIcon('Club Norte', 'check');

      fireEvent.click(await screen.findByRole('button', { name: 'Cancelar' }));

      await waitFor(() => expect(screen.queryByText('Aprobar Nueva Sede')).not.toBeInTheDocument());
      expect(api.put).not.toHaveBeenCalled();
    });

    it('si falla el cambio no recarga la lista', async () => {
      const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
      vi.mocked(api.put).mockRejectedValue(new Error('403'));
      await renderLoaded();
      clickIcon('Club Norte', 'check');

      fireEvent.click(await screen.findByRole('button', { name: 'Sí, Aprobar Club' }));

      await waitFor(() => expect(consoleError).toHaveBeenCalled());
      expect(api.get).toHaveBeenCalledTimes(1);
    });
  });

  describe('estructura del DOM', () => {
    // Verificador mecanico de la regla de oro del JSX.
    it('la tabla de clubes conserva su estructura', async () => {
      const { container } = await renderLoaded();

      expect(normalizeIds(container.innerHTML)).toMatchSnapshot();
    });
  });
});

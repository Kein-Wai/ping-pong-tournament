import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithProviders } from '../../test/utils';
import { useConnectivityStore } from '../../store/connectivityStore';
import { useSyncStore } from '../../store/syncStore';
import { ConnectivityBar } from './ConnectivityBar';

const syncNow = vi.fn();
const nativeMock = vi.hoisted(() => ({ native: true }));

vi.mock('../../utils/platform', () => ({ isNativeApp: () => nativeMock.native }));
vi.mock('../../offline/appSync', () => ({ getAppSync: () => ({ syncNow }) }));
vi.mock('./PendingItemsModal', () => ({
  PendingItemsModal: ({ opened }: { opened: boolean }) => (opened ? <div>Lista de pendientes</div> : null),
}));

describe('ConnectivityBar', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    nativeMock.native = true;
    useConnectivityStore.setState({ networkOnline: true, workOffline: false });
    useSyncStore.setState({ pending: 0, needsAttention: 0, syncing: false, openMatches: 0 });
  });

  it('con red y sin pendientes no se ve', () => {
    renderWithProviders(<ConnectivityBar />);

    expect(screen.queryByRole('button', { name: 'Sincronizar' })).not.toBeInTheDocument();
    expect(screen.queryByText(/pendiente|conexión|offline/i)).not.toBeInTheDocument();
  });

  it('en el navegador no se ve nunca', () => {
    nativeMock.native = false;
    useConnectivityStore.setState({ networkOnline: false });

    renderWithProviders(<ConnectivityBar />);

    expect(screen.queryByText('Sin conexión')).not.toBeInTheDocument();
  });

  it('sin red avisa con «Sin conexión»', () => {
    useConnectivityStore.setState({ networkOnline: false });

    renderWithProviders(<ConnectivityBar />);

    expect(screen.getByText('Sin conexión')).toBeInTheDocument();
  });

  it('con «Trabajar offline» activado avisa con «Modo offline activado»', () => {
    useConnectivityStore.setState({ workOffline: true });

    renderWithProviders(<ConnectivityBar />);

    expect(screen.getByText('Modo offline activado')).toBeInTheDocument();
  });

  it('con pendientes y red muestra el contador y «Sincronizar» envía', async () => {
    useSyncStore.setState({ pending: 3 });

    renderWithProviders(<ConnectivityBar />);
    await userEvent.click(screen.getByRole('button', { name: 'Sincronizar' }));

    expect(screen.getByText('3 pendientes')).toBeInTheDocument();
    expect(syncNow).toHaveBeenCalledTimes(1);
  });

  it('sin red «Sincronizar» está desactivado', () => {
    useConnectivityStore.setState({ networkOnline: false });
    useSyncStore.setState({ pending: 1 });

    renderWithProviders(<ConnectivityBar />);

    expect(screen.getByRole('button', { name: 'Sincronizar' })).toBeDisabled();
  });

  it('con un partido abierto «Sincronizar» está desactivado', () => {
    useSyncStore.setState({ pending: 1, openMatches: 1 });

    renderWithProviders(<ConnectivityBar />);

    expect(screen.getByRole('button', { name: 'Sincronizar' })).toBeDisabled();
  });

  it('señala los que requieren atención y abre la lista al pulsar el contador', async () => {
    useSyncStore.setState({ pending: 1, needsAttention: 2 });

    renderWithProviders(<ConnectivityBar />);
    await userEvent.click(screen.getByText(/3 pendientes/));

    expect(screen.getByText(/2 requieren atención/)).toBeInTheDocument();
    expect(screen.getByText('Lista de pendientes')).toBeInTheDocument();
  });
});

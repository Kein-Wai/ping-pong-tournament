import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { resetAppLocalStore, setAppLocalStore } from '../../offline/appLocalStore';
import { createMemoryLocalStore } from '../../offline/memoryLocalStore';
import { enqueueOperation, listOutbox } from '../../offline/outbox';
import { useConnectivityStore } from '../../store/connectivityStore';
import { useSyncStore } from '../../store/syncStore';
import { loginAs, renderWithProviders } from '../../test/utils';
import { LogoutWithPendingModal } from './LogoutWithPendingModal';

const syncNow = vi.fn();
vi.mock('../../offline/appSync', () => ({ getAppSync: () => ({ syncNow }) }));

const setup = async () => {
  const store = createMemoryLocalStore();
  setAppLocalStore(store);
  loginAs({ id: 'u1' });
  await store.apply('u1', [enqueueOperation({ id: 'a', kind: 'Rutina', payload: 1 }, 1)]);
  useSyncStore.setState({ pending: 1, needsAttention: 0 });
  const onLogout = vi.fn();
  const onClose = vi.fn();
  renderWithProviders(<LogoutWithPendingModal opened onClose={onClose} onLogout={onLogout} />);
  return { store, onLogout, onClose };
};

describe('LogoutWithPendingModal', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resetAppLocalStore();
    syncNow.mockResolvedValue(undefined);
    useConnectivityStore.setState({ networkOnline: true, workOffline: false });
  });

  it('avisa de cuántos pendientes hay y de que no se pierden al salir', async () => {
    await setup();

    expect(screen.getByText(/Hay 1 elemento pendiente/)).toBeInTheDocument();
    expect(screen.getByText(/no se pierden/)).toBeInTheDocument();
  });

  it('«Salir igualmente» cierra la sesión sin borrar nada', async () => {
    const { store, onLogout } = await setup();

    await userEvent.click(screen.getByRole('button', { name: 'Salir igualmente' }));

    expect(onLogout).toHaveBeenCalledTimes(1);
    expect(await listOutbox(store, 'u1')).toHaveLength(1);
  });

  it('«Sincronizar y salir» envía y, si no queda nada, cierra la sesión', async () => {
    const { onLogout } = await setup();
    syncNow.mockImplementation(async () => useSyncStore.setState({ pending: 0 }));

    await userEvent.click(screen.getByRole('button', { name: 'Sincronizar y salir' }));

    await waitFor(() => expect(onLogout).toHaveBeenCalledTimes(1));
  });

  it('si tras sincronizar queda algo, no cierra y lo avisa', async () => {
    const { onLogout } = await setup();

    await userEvent.click(screen.getByRole('button', { name: 'Sincronizar y salir' }));

    expect(await screen.findByText(/No se pudo enviar todo/)).toBeInTheDocument();
    expect(onLogout).not.toHaveBeenCalled();
  });

  it('sin conexión no se puede sincronizar', async () => {
    useConnectivityStore.setState({ networkOnline: false });
    await setup();

    expect(screen.getByRole('button', { name: 'Sincronizar y salir' })).toBeDisabled();
  });

  it('«Descartar pendientes y salir» borra la cola y cierra la sesión', async () => {
    const { store, onLogout } = await setup();

    await userEvent.click(screen.getByRole('button', { name: 'Descartar pendientes y salir' }));

    await waitFor(() => expect(onLogout).toHaveBeenCalledTimes(1));
    expect(await listOutbox(store, 'u1')).toEqual([]);
  });

  it('«Cancelar» cierra el aviso sin salir', async () => {
    const { onClose, onLogout } = await setup();

    await userEvent.click(screen.getByRole('button', { name: 'Cancelar' }));

    expect(onClose).toHaveBeenCalled();
    expect(onLogout).not.toHaveBeenCalled();
  });
});

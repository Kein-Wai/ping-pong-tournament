import { describe, it, expect, beforeEach } from 'vitest';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Route, Routes } from 'react-router-dom';
import { useSyncStore } from '../../store/syncStore';
import { loginAs, renderWithProviders } from '../../test/utils';
import { OfflineHome } from './OfflineHome';

const renderHome = () =>
  renderWithProviders(
    <Routes>
      <Route path="/" element={<OfflineHome />} />
      <Route path="/calentamiento" element={<div>Pantalla de calentamiento</div>} />
    </Routes>,
  );

describe('OfflineHome', () => {
  beforeEach(() => {
    useSyncStore.setState({ pending: 0, needsAttention: 0, syncing: false, openMatches: 0 });
  });

  it('un jugador ve Análisis Pro, Calentamiento y Juegos de Reflejo', () => {
    loginAs({ role: 'Player' });

    renderHome();

    expect(screen.getAllByRole('button').map((b) => b.getAttribute('aria-label'))).toEqual([
      'Análisis Pro',
      'Calentamiento',
      'Juegos de Reflejo',
    ]);
  });

  it('un AdminClub solo ve Análisis Pro', () => {
    loginAs({ role: 'AdminClub' });

    renderHome();

    expect(screen.getAllByRole('button').map((b) => b.getAttribute('aria-label'))).toEqual([
      'Análisis Pro',
    ]);
  });

  it('muestra cuántos pendientes hay por enviar', () => {
    loginAs({ role: 'Player' });
    useSyncStore.setState({ pending: 2, needsAttention: 1 });

    renderHome();

    expect(screen.getByText(/tienes 3 pendientes de enviar/)).toBeInTheDocument();
  });

  it('pulsar un acceso navega a su pantalla', async () => {
    loginAs({ role: 'Player' });

    renderHome();
    await userEvent.click(screen.getByRole('button', { name: 'Calentamiento' }));

    expect(screen.getByText('Pantalla de calentamiento')).toBeInTheDocument();
  });
});

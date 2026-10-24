import { describe, it, expect, beforeEach } from 'vitest';
import { screen } from '@testing-library/react';
import { Routes, Route } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';
import { loginAs, renderWithProviders } from '../../test/utils';
import { RequireClubSetup } from './RequireClubSetup';

const renderGuard = () =>
  renderWithProviders(
    <Routes>
      <Route element={<RequireClubSetup />}>
        <Route path="/" element={<div>Contenido protegido</div>} />
      </Route>
      <Route path="/setup-club" element={<div>Alta de club</div>} />
    </Routes>,
  );

describe('RequireClubSetup', () => {
  beforeEach(() => {
    useAuthStore.setState({ token: null, user: null, isAuthenticated: false });
  });

  it('manda al alta de club a un AdminClub que todavia no tiene club', () => {
    loginAs({ role: 'AdminClub', clubId: null });

    renderGuard();

    expect(screen.getByText('Alta de club')).toBeInTheDocument();
    expect(screen.queryByText('Contenido protegido')).not.toBeInTheDocument();
  });

  it('deja pasar a un AdminClub que ya tiene club', () => {
    loginAs({ role: 'AdminClub', clubId: 'club-1' });

    renderGuard();

    expect(screen.getByText('Contenido protegido')).toBeInTheDocument();
  });

  it.each(['Player', 'SuperAdmin'])('deja pasar a un %s aunque no tenga club', (role) => {
    loginAs({ role, clubId: null });

    renderGuard();

    expect(screen.getByText('Contenido protegido')).toBeInTheDocument();
  });

  it('deja pasar mientras no hay usuario cargado (de eso se ocupa ProtectedRoute)', () => {
    renderGuard();

    expect(screen.getByText('Contenido protegido')).toBeInTheDocument();
  });
});

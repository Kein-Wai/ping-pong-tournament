import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { screen, fireEvent, within } from '@testing-library/react';
import { renderWithProviders } from '../../test/utils';
import type { TeamMatch } from '../../types/api';
import { TeamCalendarTab } from './TeamCalendarTab';

const NOW = '2026-10-15T12:00:00.000Z';

const match = (overrides: Partial<TeamMatch>): TeamMatch => ({
  id: 'm',
  rivalName: 'Rival',
  date: '2026-10-20T17:00:00.000Z',
  isHome: true,
  status: 'Programado',
  availabilities: [],
  ...overrides,
});

const NEXT = match({ id: 'm1', rivalName: 'CTM Próximo', availabilities: [{ id: 'a1', playerId: 'u1', player: { id: 'u1', name: 'Ana', avatarUrl: null } }] });
const LATER = match({ id: 'm2', rivalName: 'Club Lejano', date: '2026-11-05T17:00:00.000Z' });
const PLAYED = match({
  id: 'm3',
  rivalName: 'Club Pasado',
  date: '2026-10-01T18:00:00.000Z',
  status: 'Completado',
  ourScore: 6,
  rivalScore: 4,
});

const renderTab = (props: Partial<React.ComponentProps<typeof TeamCalendarTab>> = {}) => {
  const handlers = { onAddMatch: vi.fn(), onEditMatch: vi.fn(), onToggleAttendance: vi.fn() };
  const view = renderWithProviders(
    <TeamCalendarTab
      matches={[PLAYED, LATER, NEXT]}
      teamName="Equipo A"
      currentUserId="u1"
      isAdmin
      canEditMatch
      isTeamMember
      {...handlers}
      {...props}
    />,
  );
  return { ...view, ...handlers };
};

describe('TeamCalendarTab', () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date(NOW));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('sin partidos avisa de que el calendario está vacío', () => {
    renderTab({ matches: [] });

    expect(screen.getByText('No hay partidos en el calendario.')).toBeInTheDocument();
  });

  it('destaca el siguiente compromiso y deja el resto debajo', () => {
    renderTab();

    expect(screen.getAllByText('🔥 Siguiente Compromiso')).toHaveLength(1);
    expect(screen.getByText(/CTM Próximo/)).toBeInTheDocument();
    expect(screen.getByText(/Club Lejano/)).toBeInTheDocument();
    expect(screen.getByText(/Club Pasado/)).toBeInTheDocument();
    // El destacado no se repite en la lista del resto.
    expect(screen.getAllByText(/CTM Próximo/)).toHaveLength(1);
  });

  it('sin partidos futuros no hay «Siguiente Compromiso»', () => {
    renderTab({ matches: [PLAYED] });

    expect(screen.queryByText('🔥 Siguiente Compromiso')).not.toBeInTheDocument();
  });

  it('un administrador puede añadir partidos', () => {
    const { onAddMatch } = renderTab();

    fireEvent.click(screen.getByRole('button', { name: 'Añadir Partido' }));

    expect(onAddMatch).toHaveBeenCalledTimes(1);
  });

  it('quien no es administrador no ve «Añadir Partido»', () => {
    renderTab({ isAdmin: false });

    expect(screen.queryByRole('button', { name: 'Añadir Partido' })).not.toBeInTheDocument();
  });

  it('«Actualizar» avisa con el partido de su tarjeta', () => {
    const { onEditMatch } = renderTab();
    const card = screen.getByText(/Club Lejano/).closest('.mantine-Card-root') as HTMLElement;

    fireEvent.click(within(card).getByRole('button', { name: 'Actualizar' }));

    expect(onEditMatch).toHaveBeenCalledWith(LATER);
  });

  it('sin permiso de edición no hay botones «Actualizar»', () => {
    renderTab({ canEditMatch: false });

    expect(screen.queryByRole('button', { name: 'Actualizar' })).not.toBeInTheDocument();
  });

  it('la casilla de asistencia avisa con el id del partido', () => {
    const { onToggleAttendance } = renderTab();
    const card = screen.getByText(/Club Lejano/).closest('.mantine-Card-root') as HTMLElement;

    fireEvent.click(within(card).getByRole('checkbox', { name: 'Voy a ir' }));

    expect(onToggleAttendance).toHaveBeenCalledWith('m2');
  });

  it('marca como confirmado el partido en el que figura el usuario actual', () => {
    renderTab();
    const next = screen.getByText(/CTM Próximo/).closest('.mantine-Card-root') as HTMLElement;
    const later = screen.getByText(/Club Lejano/).closest('.mantine-Card-root') as HTMLElement;

    expect(within(next).getByRole('checkbox', { name: 'Voy a ir' })).toBeChecked();
    expect(within(later).getByRole('checkbox', { name: 'Voy a ir' })).not.toBeChecked();
  });

  it('quien no es del equipo no puede marcar asistencia', () => {
    renderTab({ isTeamMember: false });

    for (const checkbox of screen.getAllByRole('checkbox', { name: 'Voy a ir' })) {
      expect(checkbox).toBeDisabled();
    }
  });
});

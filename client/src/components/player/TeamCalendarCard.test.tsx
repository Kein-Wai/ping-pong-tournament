import { describe, it, expect } from 'vitest';
import { screen, fireEvent, within } from '@testing-library/react';
import { renderWithProviders } from '../../test/utils';
import type { TeamCalendarMatch } from '../../utils/player-profile';
import { TeamCalendarCard } from './TeamCalendarCard';

const m = (overrides: Partial<TeamCalendarMatch>): TeamCalendarMatch => ({
  id: 'm',
  rivalName: 'Rival',
  teamName: 'Equipo A',
  date: '2026-09-10T18:00:00.000Z',
  isHome: true,
  location: null,
  status: 'Completado',
  ourScore: null,
  rivalScore: null,
  ...overrides,
});

const NEXT = m({
  id: 'next',
  rivalName: 'Rival Próximo',
  date: '2026-11-20T18:00:00.000Z',
  location: 'Pabellón Norte',
  status: 'Programado',
});

const history = (count: number) =>
  Array.from({ length: count }, (_, i) =>
    m({ id: `h${i}`, rivalName: `Rival ${i}`, date: `2026-09-${String(20 - i).padStart(2, '0')}T18:00:00.000Z` }),
  );

describe('TeamCalendarCard', () => {
  it('muestra el siguiente compromiso destacado con su lugar y su estado', () => {
    renderWithProviders(<TeamCalendarCard nextMatch={NEXT} otherMatches={[]} />);

    expect(screen.getByText('Calendario de Equipos')).toBeInTheDocument();
    expect(screen.getByText('🔥 Siguiente Compromiso')).toBeInTheDocument();
    expect(screen.getByText(/Rival Próximo/)).toBeInTheDocument();
    expect(screen.getByText('Pabellón Norte')).toBeInTheDocument();
    expect(screen.getByText('Programado')).toBeInTheDocument();
    expect(screen.queryByText('Historial y Resto del Calendario')).not.toBeInTheDocument();
  });

  it('en casa pone primero a nuestro equipo y fuera al rival', () => {
    renderWithProviders(
      <TeamCalendarCard
        nextMatch={null}
        otherMatches={[m({ id: 'a', rivalName: 'Rival Casa', isHome: true }), m({ id: 'b', rivalName: 'Rival Fuera', isHome: false })]}
      />,
    );

    expect(screen.getByText(/Equipo A.*Rival Casa/)).toBeInTheDocument();
    expect(screen.getByText(/Rival Fuera.*Equipo A/)).toBeInTheDocument();
  });

  it('muestra el marcador solo en partidos completados con resultado, según la localía', () => {
    renderWithProviders(
      <TeamCalendarCard
        nextMatch={null}
        otherMatches={[
          m({ id: 'a', rivalName: 'Gana', ourScore: 3, rivalScore: 1 }),
          m({ id: 'b', rivalName: 'Pierde', isHome: false, ourScore: 2, rivalScore: 3 }),
          m({ id: 'c', rivalName: 'Cancelado', status: 'Cancelado' }),
        ]}
      />,
    );

    expect(screen.getByText('3 - 1')).toBeInTheDocument();
    expect(screen.getByText('3 - 2')).toBeInTheDocument();
    expect(screen.getByText('Cancelado')).toBeInTheDocument();
    expect(screen.getAllByText('Completado')).toHaveLength(2);
  });

  it('pagina el resto del calendario de cuatro en cuatro', () => {
    renderWithProviders(<TeamCalendarCard nextMatch={null} otherMatches={history(6)} />);

    expect(screen.getAllByText(/^Equipo A/)).toHaveLength(4);
    expect(screen.getByText(/Rival 0/)).toBeInTheDocument();
    expect(screen.queryByText(/Rival 4/)).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: '2' }));

    expect(screen.getAllByText(/^Equipo A/)).toHaveLength(2);
    expect(screen.getByText(/Rival 4/)).toBeInTheDocument();
    expect(screen.queryByText(/Rival 0/)).not.toBeInTheDocument();
  });

  it('con cuatro partidos o menos no hay paginación', () => {
    renderWithProviders(<TeamCalendarCard nextMatch={null} otherMatches={history(4)} />);

    expect(screen.queryByRole('button', { name: '2' })).not.toBeInTheDocument();
  });

  it('el destacado no entra en la paginación', () => {
    const { container } = renderWithProviders(<TeamCalendarCard nextMatch={NEXT} otherMatches={history(2)} />);

    expect(within(container).getAllByText(/Rival/).length).toBeGreaterThan(0);
    expect(screen.getByText('Historial y Resto del Calendario')).toBeInTheDocument();
  });
});

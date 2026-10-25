import { describe, it, expect, vi } from 'vitest';
import { screen, fireEvent } from '@testing-library/react';
import { renderWithProviders } from '../../test/utils';
import type { TeamPlayer } from '../../types/api';
import { TeamRosterTab } from './TeamRosterTab';

const ANA = {
  id: 'p1',
  name: 'Ana',
  surname: 'López',
  level: 'Avanzado',
  stats: [{ id: 's1', elo: 1200 }],
} as unknown as TeamPlayer;
const LUIS = {
  id: 'p2',
  name: 'Luis',
  surname: 'Gil',
  level: 'Intermedio',
  stats: { id: 's2', elo: 900 },
} as unknown as TeamPlayer;
const MARTA = { id: 'p3', name: 'Marta', surname: 'Ruiz', level: 'Principiante', stats: null } as unknown as TeamPlayer;

describe('TeamRosterTab', () => {
  it('con la plantilla vacía lo avisa', () => {
    renderWithProviders(<TeamRosterTab players={[]} onPlayerClick={vi.fn()} />);

    expect(screen.getByText('No hay jugadores asignados a este equipo.')).toBeInTheDocument();
  });

  it('lista cada jugador con su nombre y nivel', () => {
    renderWithProviders(<TeamRosterTab players={[ANA, LUIS]} onPlayerClick={vi.fn()} />);

    expect(screen.getByText('Ana López')).toBeInTheDocument();
    expect(screen.getByText('Avanzado')).toBeInTheDocument();
    expect(screen.getByText('Luis Gil')).toBeInTheDocument();
    expect(screen.getByText('Intermedio')).toBeInTheDocument();
  });

  it('el ELO sale de las estadísticas, sean una lista o un objeto', () => {
    renderWithProviders(<TeamRosterTab players={[ANA, LUIS]} onPlayerClick={vi.fn()} />);

    expect(screen.getByText('1200 ELO')).toBeInTheDocument();
    expect(screen.getByText('900 ELO')).toBeInTheDocument();
  });

  it('sin estadísticas muestra el ELO inicial de 500', () => {
    renderWithProviders(<TeamRosterTab players={[MARTA]} onPlayerClick={vi.fn()} />);

    expect(screen.getByText('500 ELO')).toBeInTheDocument();
  });

  it('pulsar un jugador avisa con su id', () => {
    const onPlayerClick = vi.fn();
    renderWithProviders(<TeamRosterTab players={[ANA, LUIS]} onPlayerClick={onPlayerClick} />);

    fireEvent.click(screen.getByText('Luis Gil'));

    expect(onPlayerClick).toHaveBeenCalledWith('p2');
  });
});

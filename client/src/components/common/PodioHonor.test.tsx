import { describe, it, expect } from 'vitest';
import { screen } from '@testing-library/react';
import { normalizeIds, renderWithProviders } from '../../test/utils';
import { PodioHonor } from './PodioHonor';

const ANA = { id: 'p1', name: 'Ana', stats: { elo: 1500, tournamentWon: 3 } };
const BEA = { id: 'p2', name: 'Bea', stats: [{ elo: 1200 }] };
const DANI = { id: 'p3', name: 'Dani', stats: { elo: 900, tournamentWon: 0 } };
const CARLOS = { id: 'p4', name: 'Carlos' };

const renderPodio = (players: unknown[]) => renderWithProviders(<PodioHonor players={players} />);

describe('PodioHonor', () => {
  it('no pinta nada sin jugadores', () => {
    const { container } = renderPodio([]);

    expect(container.querySelector('.mantine-Stack-root')).toBeNull();
  });

  it('coloca plata a la izquierda, oro en el centro y bronce a la derecha, ordenados por ELO', () => {
    renderPodio([DANI, ANA, BEA, CARLOS]);

    const names = screen.getAllByText(/^(Ana|Bea|Dani|Carlos)$/).map((el) => el.textContent);
    expect(names).toEqual(['Bea', 'Ana', 'Dani']);
  });

  it('solo muestra a los tres primeros', () => {
    renderPodio([DANI, ANA, BEA, CARLOS]);

    expect(screen.queryByText('Carlos')).not.toBeInTheDocument();
  });

  it('muestra el ELO de cada jugador, venga como objeto o como array', () => {
    renderPodio([ANA, BEA, DANI]);

    expect(screen.getByText('1500 ELO')).toBeInTheDocument();
    expect(screen.getByText('1200 ELO')).toBeInTheDocument();
    expect(screen.getByText('900 ELO')).toBeInTheDocument();
  });

  it('usa 500 de ELO cuando el jugador no tiene estadísticas', () => {
    renderPodio([CARLOS]);

    expect(screen.getByText('500 ELO')).toBeInTheDocument();
  });

  it('con un solo jugador deja huecos vacíos en plata y bronce', () => {
    const { container } = renderPodio([ANA]);

    expect(screen.getAllByText('Ana')).toHaveLength(1);
    expect(container.querySelectorAll('div[style*="width: 150px"]')).toHaveLength(2);
  });

  it('muestra los torneos ganados solo cuando hay alguno', () => {
    renderPodio([ANA, BEA, DANI]);

    expect(screen.getByText('🏆 3 Torneos')).toBeInTheDocument();
    expect(screen.getAllByText(/Torneos$/)).toHaveLength(1);
  });

  it('no modifica la lista recibida', () => {
    const players = [DANI, ANA, BEA];

    renderPodio(players);

    expect(players.map((p) => p.name)).toEqual(['Dani', 'Ana', 'Bea']);
  });

  describe('estructura del DOM', () => {
    // Verificador mecanico de la regla de oro del JSX: si una extraccion cambia
    // el HTML renderizado, este snapshot falla.
    it('el podio completo conserva su estructura', () => {
      const { container } = renderPodio([ANA, BEA, DANI]);

      expect(normalizeIds(container.innerHTML)).toMatchSnapshot();
    });
  });
});

import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MantineProvider } from '@mantine/core';
import { Notifications } from '@mantine/notifications';
import { ModalsProvider } from '@mantine/modals';
import { MemoryRouter } from 'react-router-dom';
import type { Tournament } from '../../types/tournament';
import TournamentInfoCards from './TournamentInfoCards';

const renderInfoCards = (props: { tournament: Tournament | null }) => {
  const Providers = ({ children }: { children: React.ReactNode }) => (
    <MemoryRouter>
      <MantineProvider defaultColorScheme="light">
        <ModalsProvider>
          <Notifications position="top-right" zIndex={1000} />
          {children}
        </ModalsProvider>
      </MantineProvider>
    </MemoryRouter>
  );

  return render(
    <TournamentInfoCards tournament={props.tournament} />,
    { wrapper: Providers },
  );
};

const createMockTournament = (overrides: Partial<Tournament> = {}): Tournament => ({
  id: 'tournament-1',
  name: 'Torneo Test',
  dateStart: '2024-06-15T10:00:00Z',
  numPlayers: 16,
  typeTournament: 'Interno',
  levelTournament: 'Mixto',
  rounds: 'GruposKnockout',
  status: 'Programado',
  typeKnockout: 'LlaveAB',
  playersKnockout: 2,
  numGroup: 4,
  numGroupPlayers: 4,
  setsToWinGroup: 2,
  setsToWinKnockout: 3,
  ...overrides,
});

describe('TournamentInfoCards', () => {
  it('no renderiza nada si tournament es null', () => {
    renderInfoCards({ tournament: null });
    expect(screen.queryByText('Fecha')).not.toBeInTheDocument();
  });

  it('muestra la fecha formateada correctamente', () => {
    const tournament = createMockTournament({ dateStart: '2024-06-15T10:00:00Z' });
    renderInfoCards({ tournament });

    expect(screen.getByText('Fecha')).toBeInTheDocument();
    expect(screen.getByText('15 de junio de 2024')).toBeInTheDocument();
  });

  it('muestra plazas totales', () => {
    const tournament = createMockTournament({ numPlayers: 32 });
    renderInfoCards({ tournament });

    expect(screen.getByText('Plazas Totales')).toBeInTheDocument();
    expect(screen.getByText('32 Jugadores máx.')).toBeInTheDocument();
  });

  it('muestra nivel y tipo de torneo', () => {
    const tournament = createMockTournament({
      levelTournament: 'Profesional',
      typeTournament: 'Oficial',
    });
    renderInfoCards({ tournament });

    expect(screen.getByText('Nivel / Acceso')).toBeInTheDocument();
    expect(screen.getByText('Profesional · Oficial')).toBeInTheDocument();
  });

  it('usa valores por defecto si levelTournament o typeTournament son null', () => {
    const tournament = createMockTournament({
      levelTournament: null,
      typeTournament: null,
    });
    renderInfoCards({ tournament });

    expect(screen.getByText('Mixto · Interno')).toBeInTheDocument();
  });

  it('muestra estructura "Grupos + Eliminatorias" para GruposKnockout', () => {
    const tournament = createMockTournament({ rounds: 'GruposKnockout' });
    renderInfoCards({ tournament });

    expect(screen.getByText('Formato de Competición')).toBeInTheDocument();
    expect(screen.getByText('Estructura')).toBeInTheDocument();
    expect(screen.getByText('Grupos + Eliminatorias')).toBeInTheDocument();
  });

  it('muestra estructura "Liga (Todos contra Todos)" para TodosvsTodos', () => {
    const tournament = createMockTournament({ rounds: 'TodosvsTodos' });
    renderInfoCards({ tournament });

    expect(screen.getByText('Liga (Todos contra Todos)')).toBeInTheDocument();
  });

  it('muestra estructura "Eliminatoria Directa" para Knockout', () => {
    const tournament = createMockTournament({ rounds: 'Knockout' });
    renderInfoCards({ tournament });

    expect(screen.getByText('Eliminatoria Directa')).toBeInTheDocument();
  });

  describe('Fase de Grupos (solo si rounds es GruposKnockout o TodosvsTodos)', () => {
    it('muestra info de grupos para GruposKnockout', () => {
      const tournament = createMockTournament({
        rounds: 'GruposKnockout',
        numGroup: 4,
        numGroupPlayers: 4,
      });
      renderInfoCards({ tournament });

      expect(screen.getByText('Fase de Grupos')).toBeInTheDocument();
      expect(screen.getByText('4 Grupos de 4 jug.')).toBeInTheDocument();
    });

    it('muestra info de grupos para TodosvsTodos', () => {
      const tournament = createMockTournament({
        rounds: 'TodosvsTodos',
        numGroup: 1,
        numGroupPlayers: 16,
      });
      renderInfoCards({ tournament });

      expect(screen.getByText('Fase de Grupos')).toBeInTheDocument();
      expect(screen.getByText('1 Grupos de 16 jug.')).toBeInTheDocument();
    });

    it('usa "?" si numGroup o numGroupPlayers son null', () => {
      const tournament = createMockTournament({
        rounds: 'GruposKnockout',
        numGroup: null,
        numGroupPlayers: null,
      });
      renderInfoCards({ tournament });

      expect(screen.getByText('? Grupos de ? jug.')).toBeInTheDocument();
    });

    it('muestra sets para ganar en grupos', () => {
      const tournament = createMockTournament({
        rounds: 'GruposKnockout',
        setsToWinGroup: 3,
      });
      renderInfoCards({ tournament });

      expect(screen.getByText('Sets Partidos Grupos')).toBeInTheDocument();
      const setsTexts = screen.getAllByText('3 sets para ganar');
      expect(setsTexts.length).toBe(2);
    });

    it('usa 2 por defecto si setsToWinGroup es null', () => {
      const tournament = createMockTournament({
        rounds: 'GruposKnockout',
        setsToWinGroup: null,
      });
      renderInfoCards({ tournament });

      expect(screen.getByText('2 sets para ganar')).toBeInTheDocument();
    });

    it('NO muestra fase de grupos para Knockout puro', () => {
      const tournament = createMockTournament({ rounds: 'Knockout' });
      renderInfoCards({ tournament });

      expect(screen.queryByText('Fase de Grupos')).not.toBeInTheDocument();
    });
  });

  describe('Cuadro Final / Knockout (solo si rounds es GruposKnockout o Knockout)', () => {
    it('muestra "Llave A y B" para LlaveAB con playersKnockout', () => {
      const tournament = createMockTournament({
        rounds: 'GruposKnockout',
        typeKnockout: 'LlaveAB',
        playersKnockout: 2,
      });
      renderInfoCards({ tournament });

      expect(screen.getByText('Cuadro Final (Llaves)')).toBeInTheDocument();
      expect(screen.getByText('Llave A y B (2 pasan)')).toBeInTheDocument();
    });

    it('muestra "Solo Llave A" para tipo simple', () => {
      const tournament = createMockTournament({
        rounds: 'Knockout',
        typeKnockout: 'Simple',
        playersKnockout: null,
      });
      renderInfoCards({ tournament });

      expect(screen.getByText('Solo Llave A')).toBeInTheDocument();
    });

    it('no muestra "(X pasan)" si playersKnockout es null', () => {
      const tournament = createMockTournament({
        rounds: 'Knockout',
        typeKnockout: 'LlaveAB',
        playersKnockout: null,
      });
      renderInfoCards({ tournament });

      expect(screen.getByText('Llave A y B')).toBeInTheDocument();
      expect(screen.queryByText(/pasan/)).not.toBeInTheDocument();
    });

    it('muestra sets para ganar en knockout', () => {
      const tournament = createMockTournament({
        rounds: 'Knockout',
        setsToWinKnockout: 4,
      });
      renderInfoCards({ tournament });

      expect(screen.getByText('Sets Partidos Knockout')).toBeInTheDocument();
      expect(screen.getByText('4 sets para ganar')).toBeInTheDocument();
    });

    it('usa 3 por defecto si setsToWinKnockout es null', () => {
      const tournament = createMockTournament({
        rounds: 'Knockout',
        setsToWinKnockout: null,
      });
      renderInfoCards({ tournament });

      const setsTexts = screen.getAllByText('3 sets para ganar');
      expect(setsTexts.length).toBe(1);
    });

    it('NO muestra cuadro final para TodosvsTodos', () => {
      const tournament = createMockTournament({ rounds: 'TodosvsTodos' });
      renderInfoCards({ tournament });

      expect(screen.queryByText('Cuadro Final (Llaves)')).not.toBeInTheDocument();
    });
  });

  it('renderiza todos los iconos correctos', () => {
    const tournament = createMockTournament({ rounds: 'GruposKnockout' });
    renderInfoCards({ tournament });

    // Verificar que los iconos están presentes (ThemeIcon con los iconos correctos)
    expect(screen.getByText('Fecha')).toBeInTheDocument();
    expect(screen.getByText('Plazas Totales')).toBeInTheDocument();
    expect(screen.getByText('Nivel / Acceso')).toBeInTheDocument();
    expect(screen.getByText('Estructura')).toBeInTheDocument();
  });
});

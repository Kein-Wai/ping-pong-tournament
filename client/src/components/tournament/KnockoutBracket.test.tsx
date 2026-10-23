import React from 'react';
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react';
import { MantineProvider } from '@mantine/core';
import { Notifications } from '@mantine/notifications';
import { ModalsProvider } from '@mantine/modals';
import { MemoryRouter } from 'react-router-dom';
import type { KnockoutRound, BracketMatch, BracketPlayer } from '../../types/tournament';
import KnockoutBracket from './KnockoutBracket';

vi.mock('@mantine/notifications', async () => {
  const actual = await vi.importActual('@mantine/notifications');
  return {
    ...actual,
    useNotifications: () => ({
      show: vi.fn(),
    }),
  };
});

const createMockPlayer = (overrides: Partial<BracketPlayer> = {}): BracketPlayer => ({
  id: 'player-1',
  name: 'Juan',
  surname: 'Pérez',
  stats: { elo: 1500, matchWon: 5, matchLost: 2 },
  ...overrides,
});

const createMockMatch = (overrides: Partial<BracketMatch> = {}): BracketMatch => ({
  id: 'match-1',
  status: 'Programado',
  playerOne: createMockPlayer({ id: 'player-1', name: 'Juan', surname: 'Pérez' }),
  playerTwo: createMockPlayer({ id: 'player-2', name: 'María', surname: 'García' }),
  setOnePlayerOne: null,
  setOnePlayerTwo: null,
  setTwoPlayerOne: null,
  setTwoPlayerTwo: null,
  setThreePlayerOne: null,
  setThreePlayerTwo: null,
  setFourPlayerOne: null,
  setFourPlayerTwo: null,
  setFivePlayerOne: null,
  setFivePlayerTwo: null,
  ...overrides,
});

const createMockRound = (overrides: Partial<KnockoutRound> = {}): KnockoutRound => ({
  id: 'round-1',
  round: 'Octavos',
  type: 'Main',
  positions: '1-16',
  matches: [createMockMatch()],
  ...overrides,
});

const renderBracket = (props: {
  bracketData: KnockoutRound[] | null;
  activeSubKey?: string | null;
  onSubKeyChange?: (key: string | null) => void;
  isAdmin?: boolean;
  onEditMatch?: (match: BracketMatch) => void;
  onViewMatch?: (match: BracketMatch) => void;
}) => {
  const onSubKeyChange = props.onSubKeyChange || vi.fn();
  const onEditMatch = props.onEditMatch || vi.fn();
  const onViewMatch = props.onViewMatch || vi.fn();

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
    <KnockoutBracket
      bracketData={props.bracketData}
      activeSubKey={props.activeSubKey ?? null}
      onSubKeyChange={onSubKeyChange}
      isAdmin={props.isAdmin ?? false}
      onEditMatch={onEditMatch}
      onViewMatch={onViewMatch}
    />,
    { wrapper: Providers },
  );
};

describe('KnockoutBracket', () => {
  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it('muestra loader cuando bracketData es null', () => {
    renderBracket({ bracketData: null });
    const loader = document.querySelector('.mantine-Loader-root');
    expect(loader).toBeInTheDocument();
  });

  it('muestra mensaje cuando bracketData está vacío', () => {
    renderBracket({ bracketData: [] });
    expect(screen.getByText('El cuadro aún no ha sido generado.')).toBeInTheDocument();
  });

  it('renderiza el cuadro con una ronda y un partido', () => {
    const round = createMockRound({ round: 'Octavos', positions: '1-16' });
    renderBracket({ bracketData: [round], isAdmin: true });

    // tt="uppercase" es CSS, en jsdom el texto es "Octavos"
    expect(screen.getByText('Octavos')).toBeInTheDocument();
    expect(screen.getByText('Juan Pérez')).toBeInTheDocument();
    expect(screen.getByText('María García')).toBeInTheDocument();
    const elos = screen.getAllByText('1500');
    expect(elos.length).toBeGreaterThanOrEqual(1);
  });

  it('muestra el estado del partido cuando no está completado', () => {
    const match = createMockMatch({ status: 'Programado' });
    const round = createMockRound({ matches: [match] });
    renderBracket({ bracketData: [round], isAdmin: true });

    expect(screen.getByText('Programado')).toBeInTheDocument();
  });

  it('muestra los sets cuando el partido está completado', () => {
    const match = createMockMatch({
      status: 'Completado',
      setOnePlayerOne: 11,
      setOnePlayerTwo: 9,
      setTwoPlayerOne: 11,
      setTwoPlayerTwo: 7,
    });
    const round = createMockRound({ matches: [match] });
    renderBracket({ bracketData: [round], isAdmin: true });

    expect(screen.getByText('11-9 | 11-7')).toBeInTheDocument();
  });

  it('no muestra el desplegable de sub-cuadros cuando solo hay una llave', () => {
    const round = createMockRound();
    renderBracket({ bracketData: [round] });

    expect(screen.queryByLabelText('Selecciona la Fase del Cuadro a visualizar:')).not.toBeInTheDocument();
  });

  it('muestra el desplegable de sub-cuadros cuando hay más de una llave', () => {
    const round1 = createMockRound({ id: 'round-1', round: 'Octavos', positions: '1-16' });
    const round2 = createMockRound({ id: 'round-2', round: 'Octavos', positions: '17-32' });
    renderBracket({ bracketData: [round1, round2] });

    const select = document.querySelector('.mantine-Select-input');
    expect(select).toBeInTheDocument();
  });

  it('muestra "TBD" cuando falta el nombre del jugador', () => {
    const match = createMockMatch({
      playerOne: createMockPlayer({ name: '', surname: null }),
      playerTwo: createMockPlayer({ name: 'María', surname: 'García' }),
    });
    const round = createMockRound({ matches: [match] });
    renderBracket({ bracketData: [round] });

    expect(screen.getByText('TBD')).toBeInTheDocument();
  });

  it('llama a onEditMatch al hacer click en partido completado siendo admin', async () => {
    const onEditMatch = vi.fn();
    const match = createMockMatch({ status: 'Completado', id: 'match-completed' });
    const round = createMockRound({ matches: [match] });
    renderBracket({ bracketData: [round], isAdmin: true, onEditMatch });

    const paper = screen.getByText('Juan Pérez').closest('[style*="cursor: pointer"]');
    fireEvent.click(paper);

    await waitFor(() => {
      expect(onEditMatch).toHaveBeenCalledWith(match, true);
    });
  });

  it('llama a onViewMatch al hacer click en partido completado sin ser admin', async () => {
    const onViewMatch = vi.fn();
    const match = createMockMatch({ status: 'Completado', id: 'match-completed' });
    const round = createMockRound({ matches: [match] });
    renderBracket({ bracketData: [round], isAdmin: false, onViewMatch });

    const paper = screen.getByText('Juan Pérez').closest('[style*="cursor: pointer"]');
    fireEvent.click(paper);

    await waitFor(() => {
      expect(onViewMatch).toHaveBeenCalledWith(match);
    });
  });

  it('llama a onEditMatch al hacer click en partido pendiente siendo admin', async () => {
    const onEditMatch = vi.fn();
    const match = createMockMatch({ status: 'Programado', id: 'match-pending' });
    const round = createMockRound({ matches: [match] });
    renderBracket({ bracketData: [round], isAdmin: true, onEditMatch });

    const paper = screen.getByText('Juan Pérez').closest('[style*="cursor: pointer"]');
    fireEvent.click(paper);

    await waitFor(() => {
      expect(onEditMatch).toHaveBeenCalledWith(match, true);
    });
  });

  it('no hace nada al hacer click en partido con BYE siendo admin', async () => {
    const onEditMatch = vi.fn();
    const match = createMockMatch({
      id: 'match-bye',
      playerTwo: createMockPlayer({ name: 'EXENTO', surname: null }),
    });
    const round = createMockRound({ matches: [match] });
    renderBracket({ bracketData: [round], isAdmin: true, onEditMatch });

    const paper = screen.getByText('Juan Pérez').closest('[style*="cursor: pointer"]');
    fireEvent.click(paper);

    await waitFor(() => {
      expect(onEditMatch).not.toHaveBeenCalled();
    });
  });

  it('no hace nada al hacer click en partido con TBD siendo admin', async () => {
    const onEditMatch = vi.fn();
    const match = createMockMatch({
      id: 'match-tbd',
      playerTwo: createMockPlayer({ name: 'Por', surname: 'Definir' }),
    });
    const round = createMockRound({ matches: [match] });
    renderBracket({ bracketData: [round], isAdmin: true, onEditMatch });

    const paper = screen.getByText('Juan Pérez').closest('[style*="cursor: pointer"]');
    fireEvent.click(paper);

    await waitFor(() => {
      expect(onEditMatch).not.toHaveBeenCalled();
    });
  });

  it('renderiza múltiples rondas en orden (misma llave)', () => {
    const round1 = createMockRound({ id: 'r1', round: 'Octavos', positions: '1-16' });
    const round2 = createMockRound({ id: 'r2', round: 'Cuartos', positions: '1-8' });
    const round3 = createMockRound({ id: 'r3', round: 'Semifinales', positions: '1-4' });
    renderBracket({ bracketData: [round1, round2, round3] });

    expect(screen.getByText('Octavos')).toBeInTheDocument();
    expect(screen.getByText('Cuartos')).toBeInTheDocument();
    expect(screen.getByText('Semifinales')).toBeInTheDocument();
  });

  it('muestra título "Final (1 y 2)" para la ronda final', () => {
    const round = createMockRound({ round: 'Final', positions: '1-2' });
    renderBracket({ bracketData: [round] });

    expect(screen.getByText('Final (1 y 2)')).toBeInTheDocument();
  });

  it('muestra título "Puestos 3 y 4" para partido de tercer puesto', () => {
    const round = createMockRound({ round: 'Tercer Puesto', positions: '3-4' });
    renderBracket({ bracketData: [round] });

    expect(screen.getByText('Puestos 3 y 4')).toBeInTheDocument();
  });
});

import { describe, it, expect, vi } from 'vitest';
import { renderWithProviders } from '../../test/utils';
import { MatchResultViewModal } from './MatchResultViewModal';
import type { BracketMatch } from '../../types/tournament';

const mockMatch: BracketMatch = {
  id: 'match-1',
  status: 'Completado',
  playerOne: { id: 'p1', name: 'Ana', surname: 'García' },
  playerTwo: { id: 'p2', name: 'Luis', surname: 'Pérez' },
  setOnePlayerOne: 11,
  setOnePlayerTwo: 5,
  setTwoPlayerOne: 11,
  setTwoPlayerTwo: 9,
  setThreePlayerOne: null,
  setThreePlayerTwo: null,
  setFourPlayerOne: null,
  setFourPlayerTwo: null,
  setFivePlayerOne: null,
  setFivePlayerTwo: null,
};

describe('MatchResultViewModal', () => {
  it('muestra el titulo "Resultado del Partido"', () => {
    const { getByText } = renderWithProviders(
      <MatchResultViewModal
        opened
        onClose={vi.fn()}
        selectedMatch={mockMatch}
      />,
    );
    expect(getByText('Resultado del Partido')).toBeInTheDocument();
  });

  it('muestra los nombres de los jugadores con vs en el centro', () => {
    const { getByText } = renderWithProviders(
      <MatchResultViewModal
        opened
        onClose={vi.fn()}
        selectedMatch={mockMatch}
      />,
    );
    expect(getByText('Ana García')).toBeInTheDocument();
    expect(getByText('Luis Pérez')).toBeInTheDocument();
    expect(getByText('vs')).toBeInTheDocument();
  });

  it('muestra los sets completados y oculta los nulos', () => {
    const { getByText, queryByText } = renderWithProviders(
      <MatchResultViewModal
        opened
        onClose={vi.fn()}
        selectedMatch={mockMatch}
      />,
    );
    expect(getByText('Set 1: 11 - 5')).toBeInTheDocument();
    expect(getByText('Set 2: 11 - 9')).toBeInTheDocument();
    expect(queryByText(/Set 3:/)).not.toBeInTheDocument();
    expect(queryByText(/Set 4:/)).not.toBeInTheDocument();
    expect(queryByText(/Set 5:/)).not.toBeInTheDocument();
  });

  it('no muestra nada cuando selectedMatch es null', () => {
    const { queryByText } = renderWithProviders(
      <MatchResultViewModal
        opened
        onClose={vi.fn()}
        selectedMatch={null}
      />,
    );
    expect(queryByText(/Set/)).not.toBeInTheDocument();
    expect(queryByText('vs')).not.toBeInTheDocument();
  });

  it('muestra Set 3 cuando la puntuacion del tercer set esta disponible', () => {
    const matchWithSet3 = {
      ...mockMatch,
      setThreePlayerOne: 11,
      setThreePlayerTwo: 7,
    };
    const { getByText } = renderWithProviders(
      <MatchResultViewModal
        opened
        onClose={vi.fn()}
        selectedMatch={matchWithSet3}
      />,
    );
    expect(getByText('Set 3: 11 - 7')).toBeInTheDocument();
  });
});

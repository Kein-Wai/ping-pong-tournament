import { describe, it, expect } from 'vitest';
import { renderWithProviders } from '../../test/utils';
import { Podium } from './Podium';
import type { TournamentClas } from '../../types/tournament';

const buildClas = (overrides: Partial<TournamentClas> = {}): TournamentClas =>
  ({
    id: 'clas-1',
    position: 1,
    lastRound: null,
    player: {
      id: 'player-1',
      name: 'Ana',
      surname: 'García',
      avatarUrl: null,
      stats: { elo: 1200 },
    },
    ...overrides,
  });

describe('Podium', () => {
  it('muestra el loader cuando results es null', () => {
    const { container, queryByText } = renderWithProviders(
      <Podium
        results={null}
        firstPlace={null}
        secondPlace={null}
        thirdPlace={null}
        otherResults={[]}
      />,
    );
    expect(queryByText('Clasificación General')).not.toBeInTheDocument();
    expect(container.innerHTML).toContain('mantine-Loader');
  });

  it('muestra los tres podios con nombres de jugadores', () => {
    const { getByText } = renderWithProviders(
      <Podium
        results={[buildClas()]}
        firstPlace={buildClas({
          id: 'first',
          player: {
            id: 'pl1', name: 'Ana', surname: 'García', avatarUrl: null,
            stats: { elo: 1200 },
          },
        })}
        secondPlace={buildClas({
          id: 'second',
          player: {
            id: 'pl2', name: 'Luis', surname: 'Pérez', avatarUrl: null,
            stats: { elo: 1100 },
          },
        })}
        thirdPlace={buildClas({
          id: 'third',
          player: {
            id: 'pl3', name: 'Carlos', surname: 'López', avatarUrl: null,
            stats: { elo: 1000 },
          },
        })}
        otherResults={[]}
      />,
    );
    expect(getByText('1º')).toBeInTheDocument();
    expect(getByText('2º')).toBeInTheDocument();
    expect(getByText('3º')).toBeInTheDocument();
    expect(getByText('Ana García')).toBeInTheDocument();
    expect(getByText('Luis Pérez')).toBeInTheDocument();
    expect(getByText('Carlos López')).toBeInTheDocument();
  });

  it('no muestra el podio de 1º cuando firstPlace es null', () => {
    const { queryByText } = renderWithProviders(
      <Podium
        results={[buildClas({ position: 2 })]}
        firstPlace={null}
        secondPlace={buildClas({
          id: 'second',
          player: {
            id: 'pl2', name: 'Luis', surname: 'Pérez', avatarUrl: null,
            stats: { elo: 1100 },
          },
        })}
        thirdPlace={buildClas({
          id: 'third',
          player: {
            id: 'pl3', name: 'Carlos', surname: 'López', avatarUrl: null,
            stats: { elo: 1000 },
          },
        })}
        otherResults={[]}
      />,
    );
    expect(queryByText('1º')).not.toBeInTheDocument();
    expect(queryByText('2º')).toBeInTheDocument();
    expect(queryByText('3º')).toBeInTheDocument();
  });

  it('muestra la tabla de clasificación cuando otherResults tiene elementos', () => {
    const { getByText } = renderWithProviders(
      <Podium
        results={[buildClas({ position: 4 })]}
        firstPlace={null}
        secondPlace={null}
        thirdPlace={null}
        otherResults={[
          buildClas({
            id: 'r1', position: 4,
            player: {
              id: 'pl4', name: 'Diana', surname: 'Rojas', avatarUrl: null,
              stats: { elo: 900 },
            },
          }),
          buildClas({
            id: 'r2', position: 5,
            player: {
              id: 'pl5', name: 'Eduardo', surname: 'Silva', avatarUrl: null,
              stats: { elo: 800 },
            },
          }),
        ]}
      />,
    );
    expect(getByText('Clasificación General')).toBeInTheDocument();
    expect(getByText('4º')).toBeInTheDocument();
    expect(getByText('5º')).toBeInTheDocument();
    expect(getByText('Diana Rojas')).toBeInTheDocument();
    expect(getByText('Eduardo Silva')).toBeInTheDocument();
  });

  it('no muestra la tabla de clasificación cuando otherResults esta vacio', () => {
    const { queryByText } = renderWithProviders(
      <Podium
        results={[buildClas({ position: 1 })]}
        firstPlace={buildClas({
          id: 'first',
          player: {
            id: 'pl1', name: 'Ana', surname: 'García', avatarUrl: null,
            stats: { elo: 1200 },
          },
        })}
        secondPlace={null}
        thirdPlace={null}
        otherResults={[]}
      />,
    );
    expect(queryByText('Clasificación General')).not.toBeInTheDocument();
  });
});

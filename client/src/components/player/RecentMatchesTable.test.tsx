import { describe, it, expect } from 'vitest';
import { screen, within } from '@testing-library/react';
import { renderWithProviders } from '../../test/utils';
import type { User } from '../../types/api';
import type { ProfileMatch } from '../../types/playerProfile';
import { RecentMatchesTable } from './RecentMatchesTable';

const ME = { id: 'p1', name: 'Luis' } as User;
const ZOE = { id: 'r1', name: 'Zoe', surname: 'Zurda' } as User;
const DANI = { id: 'r2', name: 'Dani', surname: null } as User;

const base = {
  status: 'Completado',
  setFourPlayerOne: null,
  setFourPlayerTwo: null,
  setFivePlayerOne: null,
  setFivePlayerTwo: null,
};

const WIN = {
  ...base,
  id: 'm1',
  dateStart: '2026-10-01T10:00:00.000Z',
  playerOneId: 'p1',
  playerTwoId: 'r1',
  playerOne: ME,
  playerTwo: ZOE,
  tournament: { id: 't', name: 'Liga Local' },
  setOnePlayerOne: 11,
  setOnePlayerTwo: 5,
  setTwoPlayerOne: 11,
  setTwoPlayerTwo: 6,
  setThreePlayerOne: 11,
  setThreePlayerTwo: 7,
} as unknown as ProfileMatch;

const LOSS = {
  ...base,
  id: 'm2',
  dateStart: '2026-09-20T10:00:00.000Z',
  playerOneId: 'r2',
  playerTwoId: 'p1',
  playerOne: DANI,
  playerTwo: ME,
  tournament: null,
  setOnePlayerOne: 11,
  setOnePlayerTwo: 5,
  setTwoPlayerOne: 11,
  setTwoPlayerTwo: 6,
  setThreePlayerOne: 9,
  setThreePlayerTwo: 11,
  setFourPlayerOne: 11,
  setFourPlayerTwo: 8,
} as unknown as ProfileMatch;

const rows = () => screen.getAllByRole('row').slice(1);

describe('RecentMatchesTable', () => {
  it('muestra las cabeceras de la tabla', () => {
    renderWithProviders(<RecentMatchesTable matches={[WIN]} playerId="p1" />);

    expect(screen.getByText('Últimos Partidos Jugados')).toBeInTheDocument();
    for (const header of ['Fecha', 'Torneo', 'Resultado', 'Oponente', 'Marcador (Sets)']) {
      expect(screen.getByRole('columnheader', { name: header })).toBeInTheDocument();
    }
  });

  it('una victoria como jugador uno: fecha, torneo, resultado, rival y marcador', () => {
    renderWithProviders(<RecentMatchesTable matches={[WIN]} playerId="p1" />);

    const row = within(rows()[0]);
    expect(row.getByText(/oct/i)).toBeInTheDocument();
    expect(row.getByText('Liga Local')).toBeInTheDocument();
    expect(row.getByText('Victoria')).toBeInTheDocument();
    expect(row.getByText('Zoe Zurda')).toBeInTheDocument();
    expect(row.getByText('3 - 0')).toBeInTheDocument();
  });

  it('una derrota como jugador dos: marcador desde su punto de vista, rival sin apellido y partido amistoso', () => {
    renderWithProviders(<RecentMatchesTable matches={[LOSS]} playerId="p1" />);

    const row = within(rows()[0]);
    expect(row.getByText('Derrota')).toBeInTheDocument();
    expect(row.getByText('1 - 3')).toBeInTheDocument();
    expect(row.getByText('Dani')).toBeInTheDocument();
    expect(row.getByText('Amistoso')).toBeInTheDocument();
  });

  it('muestra una fila por partido en el orden recibido', () => {
    renderWithProviders(<RecentMatchesTable matches={[WIN, LOSS]} playerId="p1" />);

    expect(rows()).toHaveLength(2);
    expect(rows()[0]).toHaveTextContent('Liga Local');
    expect(rows()[1]).toHaveTextContent('Amistoso');
  });

  it('sin partidos avisa de que no hay historial', () => {
    renderWithProviders(<RecentMatchesTable matches={[]} playerId="p1" />);

    expect(screen.getByText('No hay historial de partidos registrados.')).toBeInTheDocument();
  });
});

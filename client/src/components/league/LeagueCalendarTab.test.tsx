import { describe, it, expect, vi } from 'vitest';
import { screen, fireEvent, within } from '@testing-library/react';
import { renderWithProviders } from '../../test/utils';
import { LeagueCalendarTab } from './LeagueCalendarTab';
import type { LeagueMatch } from '../../types/league';

const match = (overrides: Record<string, unknown> = {}): LeagueMatch =>
  ({
    id: 'm1',
    leagueId: 'l1',
    round: 1,
    matchOrder: 1,
    walkover: false,
    status: 'Programado',
    playerOneId: 'a',
    playerTwoId: 'b',
    playerOne: { id: 'a', name: 'Ana', surname: 'Ruiz' },
    playerTwo: { id: 'b', name: 'Luis', surname: 'Gil' },
    dateStart: '2026-11-01',
    ...overrides,
  }) as LeagueMatch;

const MATCHES = [
  match({ id: 'm1', round: 1, matchOrder: 1 }),
  match({
    id: 'm2',
    round: 1,
    matchOrder: 2,
    status: 'Completado',
    playerOne: { id: 'c', name: 'Eva', surname: 'Sanz' },
    playerTwo: { id: 'd', name: 'Pau', surname: 'Mora' },
    setOnePlayerOne: 11,
    setOnePlayerTwo: 5,
    setTwoPlayerOne: 11,
    setTwoPlayerTwo: 7,
  }),
  match({
    id: 'm3',
    round: 2,
    matchOrder: 3,
    status: 'Completado',
    walkover: true,
    playerOne: { id: 'a', name: 'Teo', surname: 'Vega' },
    playerTwo: { id: 'd', name: 'Pau', surname: 'Mora' },
  }),
];

const renderTab = (props: Partial<React.ComponentProps<typeof LeagueCalendarTab>> = {}) => {
  const onEditMatch = vi.fn();
  renderWithProviders(
    <LeagueCalendarTab
      matches={MATCHES}
      leagueStatus="Iniciado"
      isAdmin
      onEditMatch={onEditMatch}
      {...props}
    />,
  );
  return { onEditMatch };
};

describe('LeagueCalendarTab', () => {
  it('agrupa los partidos por jornada', () => {
    renderTab();

    expect(screen.getByText('Jornada 1')).toBeInTheDocument();
    expect(screen.getByText('Jornada 2')).toBeInTheDocument();
  });

  it('muestra los jugadores y el resultado de cada partido', () => {
    renderTab();

    const jugado = screen.getByText(/Eva Sanz/).closest('tr') as HTMLElement;
    expect(within(jugado).getByText(/Pau Mora/)).toBeInTheDocument();
    expect(within(jugado).getByText('2 - 0')).toBeInTheDocument();
  });

  it('marca el W.O. y un partido sin jugar no tiene marcador', () => {
    renderTab();

    expect(screen.getByText('W.O.')).toBeInTheDocument();
    const pendiente = screen.getByText(/Ana Ruiz/).closest('tr') as HTMLElement;
    expect(within(pendiente).getByText('—')).toBeInTheDocument();
  });

  it('explica que el calendario se genera al iniciar la liga', () => {
    renderTab({ matches: [], leagueStatus: 'Programado' });

    expect(screen.getByText('El calendario se generará al iniciar la liga.')).toBeInTheDocument();
  });

  it('el administrador registra el resultado de un partido pendiente', () => {
    const { onEditMatch } = renderTab();

    const pendiente = screen.getByText(/Ana Ruiz/).closest('tr') as HTMLElement;
    fireEvent.click(within(pendiente).getByRole('button', { name: 'Resultado' }));

    expect(onEditMatch).toHaveBeenCalledWith(expect.objectContaining({ id: 'm1' }));
  });

  it('un partido completado se puede corregir', () => {
    renderTab();

    const jugado = screen.getByText(/Eva Sanz/).closest('tr') as HTMLElement;

    expect(within(jugado).getByRole('button', { name: 'Resultado' })).toBeInTheDocument();
  });

  it('un W.O. no tiene botón de resultado', () => {
    renderTab();

    const wo = screen.getByText(/Teo Vega/).closest('tr') as HTMLElement;

    expect(within(wo).queryByRole('button')).not.toBeInTheDocument();
  });

  it('un jugador solo ve el calendario, sin botones', () => {
    renderTab({ isAdmin: false });

    expect(screen.queryByRole('button', { name: 'Resultado' })).not.toBeInTheDocument();
  });

  it.each(['Completado', 'Cancelado'] as const)('con la liga %s no se registran resultados', (leagueStatus) => {
    renderTab({ leagueStatus });

    expect(screen.queryByRole('button', { name: 'Resultado' })).not.toBeInTheDocument();
  });
});

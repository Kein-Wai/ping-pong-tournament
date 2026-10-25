import { describe, it, expect, vi } from 'vitest';
import { Table } from '@mantine/core';
import { screen, fireEvent, within } from '@testing-library/react';
import { renderWithProviders } from '../../test/utils';
import type { PlayerListItem } from '../../types/players';
import { PlayerRow } from './PlayerRow';

const LUIS: PlayerListItem = {
  id: 'p1',
  email: 'luis@test.com',
  name: 'Luis',
  surname: 'Pérez',
  nickname: 'Luchi',
  clubId: 'club-1',
  clubStatus: 'Aprobado',
  club: { name: 'Club Norte' },
  stats: { elo: 1200, matchWon: 3, matchLost: 1, setWon: 9, setLost: 4 },
};
const PEDRO: PlayerListItem = {
  id: 'p3',
  email: 'pedro@test.com',
  name: 'Pedro',
  clubStatus: 'Pendiente',
};

const renderRow = (
  player: PlayerListItem,
  props: Partial<React.ComponentProps<typeof PlayerRow>> = {},
) => {
  const handlers = {
    onProcessRequest: vi.fn(),
    onEditElo: vi.fn(),
    onResetAccount: vi.fn(),
    onViewProfile: vi.fn(),
  };
  const view = renderWithProviders(
    <Table>
      <Table.Tbody>
        <PlayerRow player={player} canManage isSuperAdmin={false} {...handlers} {...props} />
      </Table.Tbody>
    </Table>,
  );
  return { ...view, ...handlers };
};

const clickAction = (container: HTMLElement, icon: string) =>
  fireEvent.click(container.querySelector(`.tabler-icon-${icon}`)?.closest('button') as HTMLElement);

describe('PlayerRow', () => {
  it('muestra nombre completo, mote, ELO y récord con su porcentaje', () => {
    renderRow(LUIS);

    expect(screen.getByText('Luis Pérez')).toBeInTheDocument();
    expect(screen.getByText('Luchi')).toBeInTheDocument();
    expect(screen.getByText('1200 ELO')).toBeInTheDocument();
    expect(screen.getByText('3V')).toBeInTheDocument();
    expect(screen.getByText('1D')).toBeInTheDocument();
    expect(screen.getByText('75% Win Rate')).toBeInTheDocument();
  });

  it('sin mote ni estadísticas usa los valores por defecto', () => {
    renderRow(PEDRO);

    expect(screen.getByText('Sin mote')).toBeInTheDocument();
    expect(screen.getByText('500 ELO')).toBeInTheDocument();
    expect(screen.getByText('0% Win Rate')).toBeInTheDocument();
  });

  it('acepta las estadísticas como array y usa el primer elemento', () => {
    const asArray = [{ elo: 900, matchWon: 1, matchLost: 1 }] as unknown as PlayerListItem['stats'];

    renderRow({ ...LUIS, stats: asArray });

    expect(screen.getByText('900 ELO')).toBeInTheDocument();
  });

  it('quien gestiona ve el estado; quien no, no', () => {
    const { unmount } = renderRow(LUIS);
    expect(screen.getByText('Aprobado')).toBeInTheDocument();
    unmount();

    renderRow(LUIS, { canManage: false });
    expect(screen.queryByText('Aprobado')).not.toBeInTheDocument();
  });

  it('un SuperAdmin ve el club del jugador, o «Sin club»', () => {
    const { unmount } = renderRow(LUIS, { isSuperAdmin: true });
    expect(screen.getByText('Club Norte')).toBeInTheDocument();
    unmount();

    renderRow({ ...LUIS, club: null }, { isSuperAdmin: true });
    expect(screen.getByText('Sin club')).toBeInTheDocument();
  });

  it('un jugador sin club no muestra la línea del club al SuperAdmin', () => {
    renderRow({ ...LUIS, clubId: undefined }, { isSuperAdmin: true });

    expect(screen.queryByText('Club Norte')).not.toBeInTheDocument();
    expect(screen.queryByText('Sin club')).not.toBeInTheDocument();
  });

  it('una solicitud pendiente ofrece aprobar y rechazar con el nombre completo', () => {
    const { container, onProcessRequest } = renderRow(PEDRO);

    clickAction(container, 'check');
    clickAction(container, 'x');

    expect(onProcessRequest).toHaveBeenNthCalledWith(1, 'p3', 'Pedro ', 'Aprobado');
    expect(onProcessRequest).toHaveBeenNthCalledWith(2, 'p3', 'Pedro ', 'Rechazado');
    expect(container.querySelector('.tabler-icon-edit')).toBeNull();
  });

  it('un jugador aprobado ofrece ajustar el ELO y resetear la cuenta', () => {
    const { container, onEditElo, onResetAccount } = renderRow(LUIS);

    clickAction(container, 'edit');
    clickAction(container, 'key');

    expect(onEditElo).toHaveBeenCalledWith(LUIS);
    expect(onResetAccount).toHaveBeenCalledWith(LUIS);
    expect(container.querySelector('.tabler-icon-check')).toBeNull();
  });

  it('ver el perfil avisa con el id y siempre está disponible', () => {
    const { container, onViewProfile } = renderRow(LUIS, { canManage: false });

    clickAction(container, 'eye');

    expect(onViewProfile).toHaveBeenCalledWith('p1');
    expect(container.querySelector('.tabler-icon-edit')).toBeNull();
    expect(container.querySelector('.tabler-icon-key')).toBeNull();
    expect(within(container).queryByText('Aprobado')).not.toBeInTheDocument();
  });
});

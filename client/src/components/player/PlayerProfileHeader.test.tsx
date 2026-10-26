import { describe, it, expect, vi } from 'vitest';
import { screen, fireEvent } from '@testing-library/react';
import { renderWithProviders } from '../../test/utils';
import type { PlayerProfile } from '../../types/playerProfile';
import { PlayerProfileHeader } from './PlayerProfileHeader';

const PLAYER = {
  id: 'p1',
  email: 'luis@test.com',
  name: 'Luis',
  surname: 'Pérez',
  nickname: 'Luchi',
  avatarUrl: null,
  level: 'Intermedio',
  dominantHand: 'Diestro',
  playstyle: 'Ofensivo',
  rubberForehand: 'PICOS_CORTOS',
  rubberBackhand: 'LISA',
  teams: [
    { id: 't1', name: 'Equipo A', category: 'Senior', matches: [] },
    { id: 't2', name: 'Equipo B', category: 'Sub-18', matches: [] },
  ],
} as unknown as PlayerProfile;

const renderHeader = (props: Partial<React.ComponentProps<typeof PlayerProfileHeader>> = {}) => {
  const handlers = { onKick: vi.fn(), onEdit: vi.fn(), onConsolidate: vi.fn() };
  const view = renderWithProviders(
    <PlayerProfileHeader
      player={PLAYER}
      season="Temporada 2026/2027"
      elo={1200}
      showEmail
      canKick
      canEdit
      canConsolidate
      {...handlers}
      {...props}
    />,
  );
  return { ...view, ...handlers };
};

describe('PlayerProfileHeader', () => {
  it('muestra nombre, mote, temporada, ELO y nivel', () => {
    renderHeader();

    expect(screen.getByRole('heading', { name: 'Luis Pérez' })).toBeInTheDocument();
    expect(screen.getByText('"Luchi"')).toBeInTheDocument();
    expect(screen.getByText('Temporada 2026/2027')).toBeInTheDocument();
    expect(screen.getByText('1200 ELO')).toBeInTheDocument();
    expect(screen.getByText('Intermedio')).toBeInTheDocument();
  });

  it('sin ELO muestra el inicial de 500', () => {
    renderHeader({ elo: undefined });

    expect(screen.getByText('500 ELO')).toBeInTheDocument();
  });

  it('muestra mano, estilo y gomas sin guiones bajos, y los equipos', () => {
    renderHeader();

    expect(screen.getByText('🖐️ Diestro')).toBeInTheDocument();
    expect(screen.getByText('⚔️ Ofensivo')).toBeInTheDocument();
    expect(screen.getByText('🔴 Der: PICOS CORTOS')).toBeInTheDocument();
    expect(screen.getByText('⚫ Rev: LISA')).toBeInTheDocument();
    expect(screen.getByText('Equipo A / Equipo B')).toBeInTheDocument();
  });

  it('omite lo que el jugador no tiene registrado', () => {
    renderHeader({
      player: {
        id: 'p1',
        email: 'x@test.com',
        name: 'Ana',
        teams: [],
      } as unknown as PlayerProfile,
    });

    expect(screen.queryByText(/Diestro|Zurdo|Ofensivo|Defensivo/)).not.toBeInTheDocument();
    expect(screen.queryByText(/Der:|Rev:/)).not.toBeInTheDocument();
    expect(screen.queryByText(/Equipos:/)).not.toBeInTheDocument();
    expect(screen.queryByText(/"/)).not.toBeInTheDocument();
  });

  it('el correo solo se muestra cuando corresponde', () => {
    const { unmount } = renderHeader();
    expect(screen.getByText('luis@test.com')).toBeInTheDocument();
    unmount();

    renderHeader({ showEmail: false });
    expect(screen.queryByText('luis@test.com')).not.toBeInTheDocument();
  });

  it('cada botón aparece según el permiso y avisa al pulsarlo', () => {
    const { onKick, onEdit, onConsolidate } = renderHeader();

    fireEvent.click(screen.getByRole('button', { name: 'Dar de Baja' }));
    fireEvent.click(screen.getByRole('button', { name: 'Editar Perfil' }));
    fireEvent.click(screen.getByRole('button', { name: 'Consolidar Mejoras' }));

    expect(onKick).toHaveBeenCalledTimes(1);
    expect(onEdit).toHaveBeenCalledTimes(1);
    expect(onConsolidate).toHaveBeenCalledTimes(1);
  });

  it('sin permisos no hay botones', () => {
    renderHeader({ canKick: false, canEdit: false, canConsolidate: false });

    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });
});

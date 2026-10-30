import { describe, it, expect, vi } from 'vitest';
import { screen, fireEvent } from '@testing-library/react';
import { renderWithProviders } from '../../test/utils';
import { LeagueHeader } from './LeagueHeader';
import type { LeagueDetail } from '../../types/league';

const league = (overrides: Partial<LeagueDetail> = {}): LeagueDetail => ({
  id: 'l1',
  clubId: 'club-1',
  seasonId: 's1',
  name: 'Liga de invierno',
  dateStart: '2026-11-20T10:00:00.000Z',
  numPlayers: 0,
  status: 'Programado',
  setsToWin: 2,
  doubleRound: false,
  participants: [],
  ...overrides,
});

const renderHeader = (props: Partial<React.ComponentProps<typeof LeagueHeader>> = {}) => {
  const actions = {
    onStart: vi.fn(),
    onCancel: vi.fn(),
    onFinish: vi.fn(),
    onDelete: vi.fn(),
    onRegister: vi.fn(),
    onUnregister: vi.fn(),
  };
  renderWithProviders(
    <LeagueHeader
      league={league()}
      progress={{ played: 0, total: 0 }}
      confirmedCount={4}
      isAdmin
      myStatus={null}
      acting={false}
      {...actions}
      {...props}
    />,
  );
  return actions;
};

describe('LeagueHeader', () => {
  it('muestra nombre, estado, fecha, formato y vueltas', () => {
    renderHeader({ league: league({ setsToWin: 3, doubleRound: true }) });

    expect(screen.getByRole('heading', { name: 'Liga de invierno' })).toBeInTheDocument();
    expect(screen.getByText('Programado')).toBeInTheDocument();
    expect(screen.getByText('20 nov 2026')).toBeInTheDocument();
    expect(screen.getByText('Mejor de 5 sets · Ida y vuelta')).toBeInTheDocument();
  });

  it('en una liga iniciada muestra los partidos jugados', () => {
    renderHeader({ league: league({ status: 'Iniciado' }), progress: { played: 3, total: 6 } });

    expect(screen.getByText('3 de 6 partidos jugados')).toBeInTheDocument();
  });

  describe('administrador con la liga Programada', () => {
    it('inicia, cancela y elimina', () => {
      const { onStart, onCancel, onDelete } = renderHeader();

      fireEvent.click(screen.getByRole('button', { name: 'Iniciar Liga' }));
      fireEvent.click(screen.getByRole('button', { name: 'Cancelar Liga' }));
      fireEvent.click(screen.getByRole('button', { name: 'Eliminar' }));

      expect(onStart).toHaveBeenCalled();
      expect(onCancel).toHaveBeenCalled();
      expect(onDelete).toHaveBeenCalled();
    });

    it('no deja iniciar con menos de 3 jugadores confirmados y lo explica', () => {
      const { onStart } = renderHeader({ confirmedCount: 2 });

      const button = screen.getByRole('button', { name: 'Iniciar Liga' });
      expect(button).toBeDisabled();
      fireEvent.click(button);

      expect(onStart).not.toHaveBeenCalled();
      expect(screen.getByText('Se necesitan al menos 3 jugadores confirmados para iniciar.')).toBeInTheDocument();
    });
  });

  it('administrador con la liga Iniciada: finaliza y cancela, pero no inicia ni elimina', () => {
    const { onFinish } = renderHeader({ league: league({ status: 'Iniciado' }) });

    fireEvent.click(screen.getByRole('button', { name: 'Finalizar Liga' }));

    expect(onFinish).toHaveBeenCalled();
    expect(screen.getByRole('button', { name: 'Cancelar Liga' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Iniciar Liga' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Eliminar' })).not.toBeInTheDocument();
  });

  it.each(['Completado', 'Cancelado'] as const)('con la liga %s no hay acciones de administrador', (status) => {
    renderHeader({ league: league({ status }) });

    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });

  describe('jugador', () => {
    it('se inscribe si aún no lo está y la liga está Programada', () => {
      const { onRegister } = renderHeader({ isAdmin: false });

      fireEvent.click(screen.getByRole('button', { name: 'Inscribirme' }));

      expect(onRegister).toHaveBeenCalled();
      expect(screen.queryByRole('button', { name: 'Iniciar Liga' })).not.toBeInTheDocument();
    });

    it.each(['Pendiente', 'Confirmado'] as const)('inscrito como %s puede darse de baja', (myStatus) => {
      const { onUnregister } = renderHeader({ isAdmin: false, myStatus });

      fireEvent.click(screen.getByRole('button', { name: 'Darme de Baja' }));

      expect(onUnregister).toHaveBeenCalled();
      expect(screen.getByText(myStatus === 'Pendiente' ? 'Tu inscripción está pendiente de confirmación.' : 'Estás inscrito en esta liga.')).toBeInTheDocument();
    });

    it('con la liga ya iniciada no puede inscribirse ni darse de baja', () => {
      renderHeader({ isAdmin: false, league: league({ status: 'Iniciado' }), myStatus: 'Confirmado' });

      expect(screen.queryByRole('button')).not.toBeInTheDocument();
    });
  });
});

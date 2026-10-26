import { describe, it, expect, vi } from 'vitest';
import { screen, fireEvent } from '@testing-library/react';
import { renderWithProviders } from '../../test/utils';
import type { TeamMatch } from '../../types/api';
import { TeamMatchCard } from './TeamMatchCard';

const MATCH: TeamMatch = {
  id: 'm1',
  rivalName: 'CTM Rival',
  date: '2026-10-20T17:00:00.000Z',
  isHome: true,
  location: 'Pabellón Norte',
  status: 'Programado',
  ourScore: null,
  rivalScore: null,
  availabilities: [{ id: 'a1', playerId: 'p1', player: { id: 'p1', name: 'Ana', avatarUrl: null } }],
};

const renderCard = (
  match: Partial<TeamMatch> = {},
  props: Partial<React.ComponentProps<typeof TeamMatchCard>> = {},
) => {
  const onEdit = vi.fn();
  const onToggleAttendance = vi.fn();
  const view = renderWithProviders(
    <TeamMatchCard
      match={{ ...MATCH, ...match }}
      teamName="Equipo A"
      amIConfirmed={false}
      canEdit
      canToggleAttendance
      onEdit={onEdit}
      onToggleAttendance={onToggleAttendance}
      {...props}
    />,
  );
  return { ...view, onEdit, onToggleAttendance };
};

describe('TeamMatchCard', () => {
  describe('enfrentamiento', () => {
    it('en casa pone a nuestro equipo primero', () => {
      renderCard({ isHome: true });

      expect(screen.getByText(/Equipo A.*CTM Rival/)).toBeInTheDocument();
    });

    it('fuera de casa pone al rival primero', () => {
      renderCard({ isHome: false });

      expect(screen.getByText(/CTM Rival.*Equipo A/)).toBeInTheDocument();
    });

    it('muestra el lugar solo cuando existe', () => {
      const { unmount } = renderCard();
      expect(screen.getByText('Pabellón Norte')).toBeInTheDocument();
      unmount();

      renderCard({ location: null });
      expect(screen.queryByText('Pabellón Norte')).not.toBeInTheDocument();
    });
  });

  describe('variante regular', () => {
    it('separa los equipos con «vs», muestra la fecha corta y no lleva etiqueta', () => {
      renderCard();

      expect(screen.getByText('vs')).toBeInTheDocument();
      expect(screen.getByText(/^20\/10\/26/)).toBeInTheDocument();
      expect(screen.queryByText('🔥 Siguiente Compromiso')).not.toBeInTheDocument();
    });

    it('un partido ganado muestra victoria y el marcador', () => {
      renderCard({ status: 'Completado', ourScore: 6, rivalScore: 4 });

      expect(screen.getByText('🏆 VICTORIA')).toBeInTheDocument();
      expect(screen.getByText('6 - 4')).toBeInTheDocument();
    });

    it('un partido perdido muestra derrota', () => {
      renderCard({ status: 'Completado', ourScore: 3, rivalScore: 5 });

      expect(screen.getByText('❌ DERROTA')).toBeInTheDocument();
    });

    it('un empate muestra empate', () => {
      renderCard({ status: 'Completado', ourScore: 5, rivalScore: 5 });

      expect(screen.getByText('🤝 EMPATE')).toBeInTheDocument();
    });

    it('fuera de casa el marcador se muestra como local-visitante', () => {
      renderCard({ isHome: false, status: 'Completado', ourScore: 3, rivalScore: 5 });

      expect(screen.getByText('5 - 3')).toBeInTheDocument();
    });

    it('un partido completado sin marcador no muestra resultado', () => {
      renderCard({ status: 'Completado', ourScore: null, rivalScore: null });

      expect(screen.queryByText(/VICTORIA|DERROTA|EMPATE/)).not.toBeInTheDocument();
      expect(screen.getByText('Completado')).toBeInTheDocument();
    });

    it('un partido programado o cancelado muestra su estado sin resultado', () => {
      const { unmount } = renderCard({ status: 'Programado' });
      expect(screen.getByText('Programado')).toBeInTheDocument();
      unmount();

      renderCard({ status: 'Cancelado' });
      expect(screen.getByText('Cancelado')).toBeInTheDocument();
      expect(screen.queryByText(/VICTORIA|DERROTA|EMPATE/)).not.toBeInTheDocument();
    });
  });

  describe('variante destacada', () => {
    it('lleva la etiqueta «Siguiente Compromiso», separa con «VS» y muestra la fecha larga', () => {
      renderCard({}, { featured: true });

      expect(screen.getByText('🔥 Siguiente Compromiso')).toBeInTheDocument();
      expect(screen.getByText('VS')).toBeInTheDocument();
      expect(screen.getByText(/octubre de 2026/)).toBeInTheDocument();
      expect(screen.getByText('Programado')).toBeInTheDocument();
    });
  });

  describe('acciones', () => {
    it('«Actualizar» avisa a la pantalla', () => {
      const { onEdit } = renderCard();

      fireEvent.click(screen.getByRole('button', { name: 'Actualizar' }));

      expect(onEdit).toHaveBeenCalledTimes(1);
    });

    it('sin permiso de edición no hay botón «Actualizar»', () => {
      renderCard({}, { canEdit: false });

      expect(screen.queryByRole('button', { name: 'Actualizar' })).not.toBeInTheDocument();
    });

    it('la asistencia se puede marcar en un partido programado si eres del equipo', () => {
      const { onToggleAttendance } = renderCard();

      fireEvent.click(screen.getByRole('checkbox', { name: 'Voy a ir' }));

      expect(onToggleAttendance).toHaveBeenCalledTimes(1);
    });

    it('la asistencia está deshabilitada si no eres del equipo', () => {
      renderCard({}, { canToggleAttendance: false });

      expect(screen.getByRole('checkbox', { name: 'Voy a ir' })).toBeDisabled();
    });

    it('la asistencia está deshabilitada en un partido que ya no está programado', () => {
      renderCard({ status: 'Completado', ourScore: 1, rivalScore: 0 });

      expect(screen.getByRole('checkbox', { name: 'Voy a ir' })).toBeDisabled();
    });

    it('refleja si ya has confirmado', () => {
      renderCard({}, { amIConfirmed: true });

      expect(screen.getByRole('checkbox', { name: 'Voy a ir' })).toBeChecked();
    });
  });
});

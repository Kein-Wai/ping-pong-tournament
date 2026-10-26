import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import { MantineProvider } from '@mantine/core';
import { APP_ROUTES } from '../../constants/routes';

// Estado compartido con las factorias de vi.mock (que se elevan al inicio).
const h = vi.hoisted(() => ({
  navigate: vi.fn(),
  confirm: vi.fn(),
  details: {} as Record<string, unknown>,
  inscripcionArgs: {} as { onInscribirseSuccess: () => Promise<void>; onBulkEnrollSuccess: () => Promise<void> },
  header: {} as Record<string, (...args: unknown[]) => unknown>,
  tabs: {} as { actions: Record<string, (...args: unknown[]) => unknown> },
  swap: {} as Record<string, (...args: unknown[]) => unknown>,
}));

vi.mock('react-router-dom', () => ({
  useParams: () => ({ id: 't1' }),
  useNavigate: () => h.navigate,
}));
vi.mock('../../store/authStore', () => ({
  useAuthStore: () => ({ user: { id: 'u1', role: 'AdminClub' } }),
}));
vi.mock('../../utils/modals', () => ({ openAppConfirmModal: h.confirm }));
vi.mock('../../api/services/tournaments', () => ({
  tournamentsService: {
    participants: vi.fn(),
    updateParticipantStatus: vi.fn(),
    swapPlayers: vi.fn(),
    generateGroups: vi.fn(),
    remove: vi.fn(),
  },
}));
vi.mock('../../hooks/useTournamentDetails', () => ({
  useTournamentDetails: () => h.details,
}));
vi.mock('../../hooks/useTorneoFormato', () => ({
  useTorneoFormato: () => ({ saveFormat: vi.fn(), openEditFormat: vi.fn() }),
}));
vi.mock('../../hooks/useTorneoPartido', () => ({
  useTorneoPartido: () => ({ editMatch: null, openEditMatchModal: vi.fn() }),
}));
vi.mock('../../hooks/useTorneoInscripcion', () => ({
  useTorneoInscripcion: (args: typeof h.inscripcionArgs) => {
    h.inscripcionArgs = args;
    return { clubPlayers: [], checkedToEnroll: [] };
  },
}));
vi.mock('../../components/tournament/TournamentHeader', () => ({
  TournamentHeader: (props: typeof h.header) => {
    Object.assign(h.header, props);
    return null;
  },
}));
vi.mock('../../components/tournament/TournamentTabsContainer', () => ({
  TournamentTabsContainer: (props: typeof h.tabs) => {
    Object.assign(h.tabs, props);
    return null;
  },
}));
vi.mock('../../components/tournament/SwapPlayersModal', () => ({
  SwapPlayersModal: (props: typeof h.swap) => {
    Object.assign(h.swap, props);
    return null;
  },
}));
vi.mock('../../components/tournament/EditFormatModal', () => ({ EditFormatModal: () => null }));
vi.mock('../../components/tournament/MatchResultModal', () => ({ MatchResultModal: () => null }));
vi.mock('../../components/tournament/EnrollModal', () => ({ EnrollModal: () => null }));
vi.mock('../../components/tournament/MatchResultViewModal', () => ({ MatchResultViewModal: () => null }));

import { tournamentsService } from '../../api/services/tournaments';
import { TorneoDetalles } from './TorneoDetalles';

const participantes = [
  { player: { id: 'p1', name: 'Ana', surname: 'Pérez' }, status: 'Confirmado' },
];

const renderPage = () =>
  render(
    <MantineProvider>
      <TorneoDetalles />
    </MantineProvider>,
  );

/** Pulsa "confirmar" en el ultimo modal de confirmacion abierto. */
const confirmLastModal = async () => {
  const { onConfirm } = h.confirm.mock.calls.at(-1)![0] as { onConfirm: () => Promise<void> };
  await act(async () => {
    await onConfirm();
  });
};

describe('TorneoDetalles', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    h.details = {
      tournament: { id: 't1', name: 'Torneo Test', numPlayers: 8, rounds: 'GruposKnockout' },
      loading: false,
      activeTab: 'info',
      setActiveTab: vi.fn(),
      participants: participantes,
      setParticipants: vi.fn(),
      results: null,
      groupsClas: null,
      groupMatches: null,
      bracketA: null,
      bracketB: null,
      confirmedPlayersCount: 1,
      reloadTournament: vi.fn().mockResolvedValue(undefined),
      reloadParticipants: vi.fn().mockResolvedValue(undefined),
      reloadActiveTab: vi.fn().mockResolvedValue(undefined),
    };
  });

  describe('estados de carga', () => {
    it('no muestra el torneo mientras carga', () => {
      h.details.loading = true;
      renderPage();
      expect(screen.queryByText('Torneo no encontrado.')).not.toBeInTheDocument();
    });

    it('muestra el aviso cuando el torneo no existe', () => {
      h.details.tournament = null;
      renderPage();
      expect(screen.getByText('Torneo no encontrado.')).toBeInTheDocument();
    });
  });

  describe('estado de un participante', () => {
    it('actualiza el estado en el servidor y refresca la lista de participantes', async () => {
      const nuevaLista = [{ player: { id: 'p1' }, status: 'NoPresentado' }];
      vi.mocked(tournamentsService.participants).mockResolvedValue(nuevaLista as never);
      renderPage();

      h.tabs.actions.onParticipantStatusChange('p1', 'Ana', 'Pérez', 'NoPresentado');
      expect(h.confirm).toHaveBeenCalledWith(
        expect.objectContaining({ title: 'Sancionar Jugador', highlightText: 'Ana Pérez' }),
      );
      await confirmLastModal();

      expect(tournamentsService.updateParticipantStatus).toHaveBeenCalledWith('t1', 'p1', 'NoPresentado');
      expect(h.details.setParticipants).toHaveBeenCalledWith(nuevaLista);
    });

    it('usa el texto de confirmacion de asistencia al confirmar', () => {
      renderPage();
      h.tabs.actions.onParticipantStatusChange('p1', 'Ana', 'Pérez', 'Confirmado');
      expect(h.confirm).toHaveBeenCalledWith(
        expect.objectContaining({ title: 'Confirmar Asistencia', confirmLabel: 'Confirmar Jugador' }),
      );
    });
  });

  describe('intercambio de jugadores', () => {
    it('ofrece solo a los jugadores confirmados', () => {
      h.details.participants = [
        ...participantes,
        { player: { id: 'p2', name: 'Luis', surname: null }, status: 'Pendiente' },
      ];
      renderPage();
      expect(h.swap.swapOptions).toEqual([{ value: 'p1', label: 'Ana Pérez' }]);
    });

    it('no llama al servidor si falta elegir algun jugador', async () => {
      renderPage();
      await act(async () => {
        await h.swap.onSwap();
      });
      expect(tournamentsService.swapPlayers).not.toHaveBeenCalled();
    });

    it('envia playerAId/playerBId, cierra el modal y recarga torneo y pestana activa', async () => {
      renderPage();
      act(() => {
        h.swap.setSwapPlayerA('a');
      });
      act(() => {
        h.swap.setSwapPlayerB('b');
      });

      await act(async () => {
        await h.swap.onSwap();
      });

      expect(tournamentsService.swapPlayers).toHaveBeenCalledWith('t1', { playerAId: 'a', playerBId: 'b' });
      expect(h.details.reloadTournament).toHaveBeenCalled();
      expect(h.details.reloadActiveTab).toHaveBeenCalled();
      expect(h.swap.swapPlayerA).toBeNull();
      expect(h.swap.swapPlayerB).toBeNull();
      expect(h.swap.isSwapping).toBe(false);
    });
  });

  describe('iniciar competicion', () => {
    it('avisa si hay menos confirmados que plazas', () => {
      renderPage();
      h.header.onGenerateTournament();
      expect(h.confirm).toHaveBeenCalledWith(
        expect.objectContaining({ color: 'red', warningText: expect.stringContaining('Solo tienes 1 confirmados de los 8') }),
      );
    });

    it('genera los grupos, recarga el torneo y abre la pestana de grupos', async () => {
      renderPage();
      h.header.onGenerateTournament();
      await confirmLastModal();

      expect(tournamentsService.generateGroups).toHaveBeenCalledWith('t1');
      expect(h.details.reloadTournament).toHaveBeenCalled();
      expect(h.details.setActiveTab).toHaveBeenCalledWith('grupos');
    });

    it('abre el cuadro A si el formato no tiene grupos', async () => {
      h.details.tournament = { id: 't1', name: 'Torneo Test', numPlayers: 8, rounds: 'Knockout' };
      renderPage();
      h.header.onGenerateTournament();
      await confirmLastModal();

      expect(h.details.setActiveTab).toHaveBeenCalledWith('bracketA');
    });

    it('no cambia de pestana si la generacion falla', async () => {
      vi.mocked(tournamentsService.generateGroups).mockRejectedValueOnce(new Error('fallo'));
      vi.spyOn(console, 'error').mockImplementation(() => undefined);
      renderPage();
      h.header.onGenerateTournament();
      await confirmLastModal();

      expect(h.details.setActiveTab).not.toHaveBeenCalled();
    });
  });

  describe('eliminar torneo', () => {
    it('elimina el torneo y vuelve al listado', async () => {
      renderPage();
      h.header.onDeleteTournament();
      await confirmLastModal();

      expect(tournamentsService.remove).toHaveBeenCalledWith('t1');
      expect(h.navigate).toHaveBeenCalledWith(APP_ROUTES.TORNEOS.LIST);
    });

    it('no navega si el servidor rechaza el borrado', async () => {
      vi.mocked(tournamentsService.remove).mockRejectedValueOnce(new Error('403'));
      vi.spyOn(console, 'error').mockImplementation(() => undefined);
      renderPage();
      h.header.onDeleteTournament();
      await confirmLastModal();

      expect(h.navigate).not.toHaveBeenCalled();
    });
  });

  describe('callbacks de inscripcion', () => {
    it('tras inscribirse recarga el torneo, los participantes y avisa a las notificaciones', async () => {
      const nuevaLista = [{ player: { id: 'u1' }, status: 'Pendiente' }];
      vi.mocked(tournamentsService.participants).mockResolvedValue(nuevaLista as never);
      const evento = vi.fn();
      window.addEventListener('refresh-notifications', evento);
      renderPage();

      await act(async () => {
        await h.inscripcionArgs.onInscribirseSuccess();
      });

      expect(h.details.reloadTournament).toHaveBeenCalled();
      expect(h.details.setParticipants).toHaveBeenCalledWith(nuevaLista);
      expect(evento).toHaveBeenCalledTimes(1);
      window.removeEventListener('refresh-notifications', evento);
    });

    it('no pide participantes si todavia no estaban cargados', async () => {
      h.details.participants = null;
      renderPage();

      await act(async () => {
        await h.inscripcionArgs.onInscribirseSuccess();
      });

      expect(tournamentsService.participants).not.toHaveBeenCalled();
    });

    it('tras una inscripcion masiva recarga participantes y torneo', async () => {
      renderPage();

      await act(async () => {
        await h.inscripcionArgs.onBulkEnrollSuccess();
      });

      expect(h.details.reloadParticipants).toHaveBeenCalled();
      expect(h.details.reloadTournament).toHaveBeenCalled();
    });
  });
});

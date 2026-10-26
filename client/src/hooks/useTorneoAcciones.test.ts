import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';

vi.mock('../api/services/tournaments', () => ({
  tournamentsService: {
    participants: vi.fn(),
    updateParticipantStatus: vi.fn(),
    generateGroups: vi.fn(),
    remove: vi.fn(),
  },
}));
vi.mock('../utils/modals', () => ({ openAppConfirmModal: vi.fn() }));

import { tournamentsService } from '../api/services/tournaments';
import { openAppConfirmModal } from '../utils/modals';
import { useTorneoAcciones } from './useTorneoAcciones';
import type { UseTorneoAccionesProps } from './useTorneoAcciones';
import type { Participant, Tournament } from '../types/tournament';

const torneo = (over: Partial<Tournament> = {}) =>
  ({ id: 't1', name: 'Torneo Test', numPlayers: 8, rounds: 'GruposKnockout', ...over }) as Tournament;

const setup = (over: Partial<UseTorneoAccionesProps> = {}) => {
  const props: UseTorneoAccionesProps = {
    id: 't1',
    tournament: torneo(),
    confirmedPlayersCount: 8,
    setParticipants: vi.fn(),
    setActiveTab: vi.fn(),
    reloadTournament: vi.fn().mockResolvedValue(undefined),
    onDeleted: vi.fn(),
    ...over,
  };
  const hook = renderHook(() => useTorneoAcciones(props));
  return { ...hook, props };
};

/** Opciones con las que se abrió el último modal de confirmación. */
const lastModal = () =>
  vi.mocked(openAppConfirmModal).mock.calls.at(-1)![0] as Parameters<typeof openAppConfirmModal>[0];

const confirmLastModal = async () => {
  await act(async () => {
    await lastModal().onConfirm();
  });
};

describe('useTorneoAcciones', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
  });

  describe('handleParticipantStatus', () => {
    it('no abre ningún modal sin id de torneo', () => {
      const { result } = setup({ id: undefined });

      result.current.handleParticipantStatus('p1', 'Ana', 'Pérez', 'Confirmado');

      expect(openAppConfirmModal).not.toHaveBeenCalled();
    });

    it('pide confirmar la asistencia con el texto verde', () => {
      const { result } = setup();

      result.current.handleParticipantStatus('p1', 'Ana', 'Pérez', 'Confirmado');

      expect(lastModal()).toMatchObject({
        title: 'Confirmar Asistencia',
        color: 'green',
        confirmLabel: 'Confirmar Jugador',
        highlightText: 'Ana Pérez',
      });
    });

    it('pide sancionar con el aviso de los 100 puntos de ELO', () => {
      const { result } = setup();

      result.current.handleParticipantStatus('p1', 'Ana', 'Pérez', 'NoPresentado');

      expect(lastModal()).toMatchObject({
        title: 'Sancionar Jugador',
        color: 'red',
        confirmLabel: 'Sí, Sancionar',
        description: expect.stringContaining('100 puntos de ELO'),
      });
    });

    it('al confirmar actualiza el estado y sustituye la lista de participantes', async () => {
      const nuevaLista = [{ player: { id: 'p1' }, status: 'Confirmado' }] as unknown as Participant[];
      vi.mocked(tournamentsService.participants).mockResolvedValue(nuevaLista);
      const { result, props } = setup();

      result.current.handleParticipantStatus('p1', 'Ana', 'Pérez', 'Confirmado');
      await confirmLastModal();

      expect(tournamentsService.updateParticipantStatus).toHaveBeenCalledWith('t1', 'p1', 'Confirmado');
      expect(props.setParticipants).toHaveBeenCalledWith(nuevaLista);
    });

    it('no toca la lista de participantes si el servidor rechaza el cambio', async () => {
      vi.mocked(tournamentsService.updateParticipantStatus).mockRejectedValueOnce(new Error('403'));
      const { result, props } = setup();

      result.current.handleParticipantStatus('p1', 'Ana', 'Pérez', 'Confirmado');
      await confirmLastModal();

      expect(props.setParticipants).not.toHaveBeenCalled();
    });
  });

  describe('handleGenerateTournament', () => {
    it('no abre ningún modal sin id de torneo', () => {
      const { result } = setup({ id: undefined });

      result.current.handleGenerateTournament();

      expect(openAppConfirmModal).not.toHaveBeenCalled();
    });

    it('con todas las plazas confirmadas muestra el aviso naranja de irreversible', () => {
      const { result } = setup({ confirmedPlayersCount: 8 });

      result.current.handleGenerateTournament();

      expect(lastModal()).toMatchObject({
        title: 'Iniciar Competición',
        color: 'orange',
        highlightText: 'Torneo Test',
        warningText: expect.stringContaining('irreversible'),
      });
    });

    it('con menos confirmados que plazas avisa en rojo de los huecos vacíos', () => {
      const { result } = setup({ confirmedPlayersCount: 5 });

      result.current.handleGenerateTournament();

      expect(lastModal()).toMatchObject({
        color: 'red',
        warningText: expect.stringContaining('Solo tienes 5 confirmados de los 8 esperados'),
      });
    });

    it.each([
      ['GruposKnockout', 'grupos'],
      ['TodosvsTodos', 'grupos'],
      ['Knockout', 'bracketA'],
    ])('con formato %s abre la pestaña %s tras generar', async (rounds, pestana) => {
      const { result, props } = setup({ tournament: torneo({ rounds: rounds as Tournament['rounds'] }) });

      result.current.handleGenerateTournament();
      await confirmLastModal();

      expect(tournamentsService.generateGroups).toHaveBeenCalledWith('t1');
      expect(props.reloadTournament).toHaveBeenCalled();
      expect(props.setActiveTab).toHaveBeenCalledWith(pestana);
    });

    it('marca isGenerating mientras genera y lo libera al terminar', async () => {
      let terminar: () => void = () => undefined;
      vi.mocked(tournamentsService.generateGroups).mockReturnValueOnce(
        new Promise<void>((resolve) => {
          terminar = resolve;
        }),
      );
      const { result } = setup();
      result.current.handleGenerateTournament();

      let confirmacion: Promise<void> = Promise.resolve();
      act(() => {
        confirmacion = lastModal().onConfirm() as Promise<void>;
      });
      expect(result.current.isGenerating).toBe(true);

      await act(async () => {
        terminar();
        await confirmacion;
      });
      expect(result.current.isGenerating).toBe(false);
    });

    it('si falla no cambia de pestaña y libera isGenerating', async () => {
      vi.mocked(tournamentsService.generateGroups).mockRejectedValueOnce(new Error('400'));
      const { result, props } = setup();

      result.current.handleGenerateTournament();
      await confirmLastModal();

      expect(props.setActiveTab).not.toHaveBeenCalled();
      expect(props.reloadTournament).not.toHaveBeenCalled();
      expect(result.current.isGenerating).toBe(false);
    });
  });

  describe('handleDeleteTournament', () => {
    it('no abre ningún modal sin id de torneo', () => {
      const { result } = setup({ id: undefined });

      result.current.handleDeleteTournament();

      expect(openAppConfirmModal).not.toHaveBeenCalled();
    });

    it('pide confirmar el borrado con el nombre del torneo', () => {
      const { result } = setup();

      result.current.handleDeleteTournament();

      expect(lastModal()).toMatchObject({
        title: 'Eliminar Torneo',
        color: 'red',
        highlightText: 'Torneo Test',
        confirmLabel: 'Sí, Eliminar Torneo',
      });
    });

    it('al confirmar elimina el torneo y avisa con onDeleted', async () => {
      const { result, props } = setup();

      result.current.handleDeleteTournament();
      await confirmLastModal();

      expect(tournamentsService.remove).toHaveBeenCalledWith('t1');
      expect(props.onDeleted).toHaveBeenCalledTimes(1);
    });

    it('no avisa con onDeleted si el servidor rechaza el borrado', async () => {
      vi.mocked(tournamentsService.remove).mockRejectedValueOnce(new Error('403'));
      const { result, props } = setup();

      result.current.handleDeleteTournament();
      await confirmLastModal();

      expect(props.onDeleted).not.toHaveBeenCalled();
    });
  });
});

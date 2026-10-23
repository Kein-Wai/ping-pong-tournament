import { useState, useCallback } from 'react';
import { createTournamentService } from '../services/tournamentService';
import type { MatchToEdit, TournamentFormat } from '../types/tournament';

/**
 * useTournamentActions - Hook para las mutaciones/acciones del torneo.
 *
 * Responsabilidad unica: ejecutar mutaciones (inscripciones, generacion,
 * guardado de resultados, intercambio, etc.).
 * No contiene estado de datos ni estado de UI.
 */
export interface UseTournamentActionsResult {
  /** Inscribe al jugador actual en el torneo. */
  registerSelf: (playerId: string) => Promise<void>;
  /** Actualiza el estado de un participante. */
  updateParticipantStatus: (playerId: string, status: string) => Promise<void>;
  /** Genera los grupos del torneo. */
  generateGroups: () => Promise<void>;
  /** Guarda el formato del torneo. */
  saveFormat: (format: TournamentFormat) => Promise<void>;
  /** Guarda el resultado de un partido. */
  saveMatch: (match: MatchToEdit) => Promise<void>;
  /** Inscribe a varios jugadores de una vez. */
  bulkEnroll: (playerIds: string[]) => Promise<void>;
  /** Intercambia dos jugadores. */
  swapPlayers: (playerAId: string, playerBId: string) => Promise<void>;
  /** Elimina el torneo. */
  removeTournament: () => Promise<void>;
  /** Carga jugadores del club para inscripcion en bloque. */
  loadClubPlayers: () => Promise<unknown[]>;
  /** Indica si hay alguna mutacion en progreso. */
  isMutating: boolean;
}

export function useTournamentActions(
  tournamentId: string | null,
  onSuccess?: () => Promise<void>
): UseTournamentActionsResult {
  const service = tournamentId ? createTournamentService(tournamentId) : null;
  const [isMutating, setIsMutating] = useState(false);

  const withMutation = useCallback(
    async <T>(fn: () => Promise<T>): Promise<T> => {
      setIsMutating(true);
      try {
        const result = await fn();
        if (onSuccess) {
          await onSuccess();
        }
        return result;
      } finally {
        setIsMutating(false);
      }
    },
    [onSuccess],
  );

  const registerSelf = useCallback(
    async (playerId: string) => {
      if (!service) return;
      await withMutation(() => service.registerSelf(playerId));
    },
    [service, withMutation],
  );

  const updateParticipantStatus = useCallback(
    async (playerId: string, status: string) => {
      if (!service) return;
      await withMutation(() => service.updateParticipantStatus(playerId, status));
    },
    [service, withMutation],
  );

  const generateGroups = useCallback(
    async () => {
      if (!service) return;
      await withMutation(() => service.generateGroups());
    },
    [service, withMutation],
  );

  const saveFormat = useCallback(
    async (format: TournamentFormat) => {
      if (!service) return;
      await withMutation(() => service.saveFormat(format));
    },
    [service, withMutation],
  );

  const saveMatch = useCallback(
    async (match: MatchToEdit) => {
      if (!service) return;
      await withMutation(() => service.saveMatch(match));
    },
    [service, withMutation],
  );

  const bulkEnroll = useCallback(
    async (playerIds: string[]) => {
      if (!service) return;
      await withMutation(() => service.bulkEnroll(playerIds));
    },
    [service, withMutation],
  );

  const swapPlayers = useCallback(
    async (playerAId: string, playerBId: string) => {
      if (!service) return;
      await withMutation(() => service.swapPlayers(playerAId, playerBId));
    },
    [service, withMutation],
  );

  const removeTournament = useCallback(
    async () => {
      if (!service) return;
      await withMutation(() => service.removeTournament());
    },
    [service, withMutation],
  );

  const loadClubPlayers = useCallback(async () => {
    if (!service) return [];
    return service.loadClubPlayers();
  }, [service]);

  return {
    registerSelf,
    updateParticipantStatus,
    generateGroups,
    saveFormat,
    saveMatch,
    bulkEnroll,
    swapPlayers,
    removeTournament,
    loadClubPlayers,
    isMutating,
  };
}

export default useTournamentActions;

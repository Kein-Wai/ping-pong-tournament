import { useEffect, useState, useCallback } from 'react';
import { createTournamentService } from '../services/tournamentService';
import type {
  GroupMatch,
  KnockoutRound,
  Participant,
  Tournament,
  TournamentClas,
  TournamentGroupClas,
} from '../types/tournament';

/**
 * useTournamentData - Hook para gestionar el estado de datos del torneo.
 *
 * Responsabilidad unica: obtener y mantener los datos del torneo.
 * No contiene logica de mutaciones ni estado de UI (tabs, modales).
 */
export interface UseTournamentDataResult {
  tournament: Tournament | null;
  participants: Participant[] | null;
  results: TournamentClas[] | null;
  groupsClas: TournamentGroupClas[] | null;
  groupMatches: GroupMatch[] | null;
  bracketA: KnockoutRound[] | null;
  bracketB: KnockoutRound[] | null;
  loading: boolean;
  error: Error | null;
  /** Recarga el torneo y los participantes. */
  reload: () => Promise<void>;
  /** Recarga solo los participantes. */
  reloadParticipants: () => Promise<void>;
  /** Carga datos perezosos (clasificaciones, brackets, grupos, resultados). */
  fetchLazyData: () => Promise<void>;
}

export function useTournamentData(tournamentId: string | null): UseTournamentDataResult {
  const [tournament, setTournament] = useState<Tournament | null>(null);
  const [participants, setParticipants] = useState<Participant[] | null>(null);
  const [results, setResults] = useState<TournamentClas[] | null>(null);
  const [groupsClas, setGroupsClas] = useState<TournamentGroupClas[] | null>(null);
  const [groupMatches, setGroupMatches] = useState<GroupMatch[] | null>(null);
  const [bracketA, setBracketA] = useState<KnockoutRound[] | null>(null);
  const [bracketB, setBracketB] = useState<KnockoutRound[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const service = tournamentId ? createTournamentService(tournamentId) : null;

  const fetchParticipants = useCallback(async () => {
    if (!service) return;
    try {
      const data = await service.fetchParticipants();
      setParticipants(data);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Error loading participants'));
    }
  }, [service]);

  const fetchLazyData = useCallback(async () => {
    if (!service) return;
    try {
      const data = await service.fetchLazyData();
      setGroupsClas(data.groupsClas);
      setGroupMatches(data.groupMatches);
      setBracketA(data.bracketA);
      setBracketB(data.bracketB);
      setResults(data.results);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Error loading lazy data'));
    }
  }, [service]);

  const reload = useCallback(async () => {
    if (!service) return;
    setLoading(true);
    setError(null);
    try {
      await Promise.all([
        (async () => {
          const tournamentData = await service.fetchTournament();
          setTournament(tournamentData);
        })(),
        fetchParticipants(),
      ]);
      await fetchLazyData();
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Error reloading tournament'));
    } finally {
      setLoading(false);
    }
  }, [service, fetchParticipants]);

  const reloadParticipants = useCallback(async () => {
    if (!service) return;
    try {
      const data = await service.fetchParticipants();
      setParticipants(data);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Error reloading participants'));
    }
  }, [service]);

  // Carga inicial
  useEffect(() => {
    if (!tournamentId) {
      setLoading(false);
      return;
    }

    let mounted = true;

    const load = async () => {
      if (!service) return;
      setLoading(true);
      setError(null);
      try {
        const tournamentData = await service.fetchTournament();
        if (!mounted) return;
        setTournament(tournamentData);

        await Promise.all([
          fetchParticipants(),
          (async () => {
            const data = await service.fetchLazyData();
            if (!mounted) return;
            setGroupsClas(data.groupsClas);
            setGroupMatches(data.groupMatches);
            setBracketA(data.bracketA);
            setBracketB(data.bracketB);
            setResults(data.results);
          })(),
        ]);
      } catch (err) {
        if (!mounted) return;
        setError(err instanceof Error ? err : new Error('Error loading tournament data'));
      } finally {
        if (mounted) setLoading(false);
      }
    };

    load();

    return () => {
      mounted = false;
    };
  }, [tournamentId]);

  return {
    tournament,
    participants,
    results,
    groupsClas,
    groupMatches,
    bracketA,
    bracketB,
    loading,
    error,
    reload,
    reloadParticipants,
    fetchLazyData,
  };
}

export default useTournamentData;

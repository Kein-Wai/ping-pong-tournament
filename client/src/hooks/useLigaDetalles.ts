import { useCallback, useEffect, useState } from 'react';
import { leaguesService } from '../api/services/leagues';
import type { LeagueDetail, LeagueMatch, LeagueStandings } from '../types/league';

/**
 * useLigaDetalles — Carga de la pantalla de una liga: la liga con sus
 * participantes, su calendario y su clasificación, que viajan siempre juntos.
 * `reload` repite las tres consultas tras cualquier acción que las cambie.
 */
export const useLigaDetalles = (id: string | undefined) => {
  const [league, setLeague] = useState<LeagueDetail | null>(null);
  const [matches, setMatches] = useState<LeagueMatch[]>([]);
  const [standings, setStandings] = useState<LeagueStandings | null>(null);
  const [loading, setLoading] = useState(true);

  const reload = useCallback(async () => {
    if (!id) return;
    try {
      const [leagueData, matchesData, standingsData] = await Promise.all([
        leaguesService.byId(id),
        leaguesService.matches(id),
        leaguesService.standings(id),
      ]);
      setLeague(leagueData);
      setMatches(matchesData);
      setStandings(standingsData);
    } catch (error) {
      console.error('Error cargando la liga:', error);
      setLeague(null);
      setMatches([]);
      setStandings(null);
    }
  }, [id]);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setLoading(true);
      await reload();
      if (!cancelled) setLoading(false);
    };
    load();
    return () => {
      cancelled = true;
    };
  }, [reload]);

  return { league, matches, standings, loading, reload };
};

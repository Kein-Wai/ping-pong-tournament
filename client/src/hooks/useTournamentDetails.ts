import { useCallback, useEffect, useMemo, useState } from 'react';
import type { Dispatch, SetStateAction } from 'react';
import confetti from 'canvas-confetti';
import { tournamentsService as tournaments } from '../api/services/tournaments';
import { KNOCKOUT_STAGES } from '../types/tournament';
import type {
  GroupMatch,
  KnockoutRound,
  Participant,
  Tournament,
  TournamentClas,
  TournamentGroupClas,
} from '../types/tournament';

/**
 * Seam de datos de la pantalla de detalle de torneo.
 *
 * Concentra la carga del torneo y sus participantes, la carga perezosa de
 * cada pestana y las recargas (torneo, participantes, pestana activa) que
 * necesitan el resto de hooks de la pantalla. Las mutaciones viven en los
 * hooks useTorneo* y reciben estas recargas como callbacks.
 */

/** Resultado del hook. */
export interface UseTournamentDetailsResult {
  loading: boolean;
  tournament: Tournament | null;
  participants: Participant[] | null;
  results: TournamentClas[] | null;
  groupsClas: TournamentGroupClas[] | null;
  groupMatches: GroupMatch[] | null;
  bracketA: KnockoutRound[] | null;
  bracketB: KnockoutRound[] | null;
  activeTab: string | null;
  setActiveTab: (tab: string | null) => void;
  selectedGroup: string | null;
  setSelectedGroup: (group: string | null) => void;
  subBracketA: string | null;
  setSubBracketA: (key: string | null) => void;
  subBracketB: string | null;
  setSubBracketB: (key: string | null) => void;
  /** Jugadores confirmados (los que entran en el cuadro). */
  confirmedPlayersCount: number;
  /** Podio: primero, segundo, tercero y el resto. */
  podium: {
    firstPlace: TournamentClas | null;
    secondPlace: TournamentClas | null;
    thirdPlace: TournamentClas | null;
    otherResults: TournamentClas[];
  };
  /** Grupos disponibles en la pestana de grupos. */
  groupOptions: Array<{ value: string; label: string }>;
  /** Recarga el torneo y los participantes. */
  reload: () => Promise<void>;
  /** Recarga solo los participantes. */
  reloadParticipants: () => Promise<void>;
  /** Recarga solo el torneo (sin participantes) y sincroniza la pestana activa. */
  reloadTournament: () => Promise<void>;
  /** Recarga los datos de la pestana activa (tras una mutacion). */
  reloadActiveTab: () => Promise<void>;
  /** Sustituye la lista de participantes con datos ya obtenidos por el llamador. */
  setParticipants: Dispatch<SetStateAction<Participant[] | null>>;
}

/** Opciones del hook. */
export interface UseTournamentDetailsOptions {
  /**
   * Selecciona automaticamente el primer grupo al cargar la pestana de grupos.
   * Por defecto true; las pantallas que filtran por su cuenta lo desactivan.
   */
  autoSelectGroup?: boolean;
}

/** Celebracion al completar el torneo. */
const celebrate = () => {
  const duration = 3 * 1000;
  const animationEnd = Date.now() + duration;
  const defaults = { startVelocity: 30, spread: 360, ticks: 60, zIndex: 9999 };

  const randomInRange = (min: number, max: number) => Math.random() * (max - min) + min;

  const interval = setInterval(() => {
    const timeLeft = animationEnd - Date.now();

    if (timeLeft <= 0) {
      clearInterval(interval);
      return;
    }

    const particleCount = 50 * (timeLeft / duration);

    confetti({
      ...defaults,
      particleCount,
      origin: { x: randomInRange(0.1, 0.3), y: Math.random() - 0.2 },
    });

    confetti({
      ...defaults,
      particleCount,
      origin: { x: randomInRange(0.7, 0.9), y: Math.random() - 0.2 },
    });
  }, 250);
};

export const useTournamentDetails = (
  tournamentId: string | undefined,
  { autoSelectGroup = true }: UseTournamentDetailsOptions = {},
): UseTournamentDetailsResult => {
  const [tournament, setTournament] = useState<Tournament | null>(null);
  const [participants, setParticipants] = useState<Participant[] | null>(null);
  const [results, setResults] = useState<TournamentClas[] | null>(null);
  const [groupsClas, setGroupsClas] = useState<TournamentGroupClas[] | null>(null);
  const [groupMatches, setGroupMatches] = useState<GroupMatch[] | null>(null);
  const [bracketA, setBracketA] = useState<KnockoutRound[] | null>(null);
  const [bracketB, setBracketB] = useState<KnockoutRound[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<string | null>('info');
  const [selectedGroup, setSelectedGroup] = useState<string | null>(null);
  const [subBracketA, setSubBracketA] = useState<string | null>(null);
  const [subBracketB, setSubBracketB] = useState<string | null>(null);

  const hasId = Boolean(tournamentId);

  const fetchTournamentInfo = useCallback(async () => {
    if (!tournamentId) return;

    try {
      const tData = await tournaments.byId(tournamentId);
      setTournament((prev) => {
        if (prev && prev.status !== 'Completado' && tData.status === 'Completado') {
          celebrate();
        }
        return tData;
      });

      setActiveTab((prevTab) => {
        if (tData.status === 'Completado') return 'resultados';
        if (tData.status && KNOCKOUT_STAGES.includes(tData.status) && prevTab !== 'bracketB') return 'bracketA';
        return prevTab;
      });
    } catch (error) {
      console.error('Error cargando el torneo:', error);
    } finally {
      setLoading(false);
    }
  }, [tournamentId]);

  const fetchParticipants = useCallback(async () => {
    if (!tournamentId) return;
    try {
      setParticipants(await tournaments.participants(tournamentId));
    } catch (error) {
      console.error(error);
    }
  }, [tournamentId]);

  // El tournament se carga al entrar y cada vez que cambia el id.
  useEffect(() => {
    if (!hasId) return;

    void fetchTournamentInfo();
    void fetchParticipants();
  }, [hasId, fetchTournamentInfo, fetchParticipants]);

  // Los datos de cada pestana se cargan bajo demanda (perezoso) y se cachean.
  useEffect(() => {
    if (!tournamentId || !activeTab) return;

    const fetchLazyData = async () => {
      try {
        if (activeTab === 'resultados' && results === null) {
          setResults(await tournaments.classifications(tournamentId));
        } else if (activeTab === 'grupos' && (groupsClas === null || groupMatches === null)) {
          const [clas, matches] = await Promise.all([
            tournaments.groupClassifications(tournamentId),
            tournaments.groupMatches(tournamentId),
          ]);

          setGroupsClas(clas);
          setGroupMatches(matches);

          if (autoSelectGroup && clas.length > 0) {
            setSelectedGroup(String(clas[0].tournamentGroup.group));
          }
        } else if (activeTab === 'bracketA' && bracketA === null) {
          setBracketA(await tournaments.bracket(tournamentId, 'A'));
        } else if (activeTab === 'bracketB' && bracketB === null) {
          setBracketB(await tournaments.bracket(tournamentId, 'B'));
        }
      } catch (error) {
        console.error(`Error cargando datos para la pestaña ${activeTab}:`, error);
      }
    };

    void fetchLazyData();
  }, [activeTab, tournamentId, results, groupsClas, groupMatches, bracketA, bracketB, autoSelectGroup]);

  /** Recarga los datos de la pestana activa (tras una mutacion). */
  const reloadActiveTab = useCallback(async () => {
    if (!tournamentId) return;

    if (activeTab === 'grupos') {
      const [clas, matches] = await Promise.all([
        tournaments.groupClassifications(tournamentId),
        tournaments.groupMatches(tournamentId),
      ]);
      setGroupsClas(clas);
      setGroupMatches(matches);
    } else if (activeTab === 'bracketA') {
      setBracketA(await tournaments.bracket(tournamentId, 'A'));
    } else if (activeTab === 'bracketB') {
      setBracketB(await tournaments.bracket(tournamentId, 'B'));
    }
  }, [tournamentId, activeTab]);

  const reload = useCallback(async () => {
    await Promise.all([fetchTournamentInfo(), fetchParticipants()]);
  }, [fetchTournamentInfo, fetchParticipants]);

  const confirmedPlayersCount = useMemo(
    () => participants?.filter((p) => p.status === 'Confirmado').length || 0,
    [participants],
  );

  const podium = useMemo(() => {
    let firstPlace: TournamentClas | null = null;
    let secondPlace: TournamentClas | null = null;
    let thirdPlace: TournamentClas | null = null;
    const otherResults: TournamentClas[] = [];

    if (!results) return { firstPlace, secondPlace, thirdPlace, otherResults };

    results.forEach((p) => {
      if (p.position === 1) {
        firstPlace = p;
      } else if (p.position === 2) {
        secondPlace = p;
      } else if (p.position === 3 && !thirdPlace) {
        thirdPlace = p;
      } else {
        otherResults.push(p);
      }
    });

    otherResults.sort((a, b) => (a.position || 0) - (b.position || 0));
    return { firstPlace, secondPlace, thirdPlace, otherResults };
  }, [results]);

  const groupOptions = useMemo(() => {
    if (!groupsClas) return [];
    const uniqueGroups = Array.from(new Set(groupsClas.map((c) => c.tournamentGroup.group))).sort(
      (a, b) => a - b,
    );
    return uniqueGroups.map((g) => ({ value: String(g), label: `Grupo ${g}` }));
  }, [groupsClas]);

  return {
    tournament,
    participants,
    results,
    groupsClas,
    groupMatches,
    bracketA,
    bracketB,
    loading,
    activeTab,
    setActiveTab,
    selectedGroup,
    setSelectedGroup,
    subBracketA,
    setSubBracketA,
    subBracketB,
    setSubBracketB,
    confirmedPlayersCount,
    podium,
    groupOptions,
    reload,
    reloadParticipants: fetchParticipants,
    reloadTournament: fetchTournamentInfo,
    reloadActiveTab,
    setParticipants,
  };
};

export default useTournamentDetails;

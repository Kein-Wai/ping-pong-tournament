import { useCallback, useEffect, useMemo, useState } from 'react';
import confetti from 'canvas-confetti';
import { tournamentsService as tournaments } from '../api/services/tournaments';
import { matchesService } from '../api/services/matches';
import { usersService } from '../api/services/users';
import type {
  GroupMatch,
  KnockoutRound,
  MatchToEdit,
  Participant,
  Tournament,
  TournamentClas,
  TournamentFormat,
  TournamentGroupClas,
} from '../types/tournament';

/** Re-export para compatibilidad con imports anteriores. */
export type { TournamentFormat };

/**
 * Seam de datos de la pantalla de detalle de torneo.
 *
 * Concentra toda la orquestacion de llamadas a la API: la carga del torneo y
 * sus participantes, la carga perezosa de cada pestana y todas las mutaciones
 * (inscribirse, generar grupos, cambiar el formato, guardar un resultado,
 * intercambiar jugadores, inscribir en bloque).
 *
 * La pagina queda con el JSX y el estado de los modales; la logica de datos
 * vive aqui y se puede probar sin renderizar.
 */

/** Re-export: TournamentFormat ahora reside en types/tournament.ts. */

/** Resultado del hook. */
export interface UseTournamentDetailsResult {
  isGenerating: boolean;
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
  /** Se inscribe al jugador actual. */
  registerSelf: (playerId: string) => Promise<void>;
  /** Cambia el estado de un participante (confirmar / no presentado). */
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
  /** Jugadores del club, para el modal de inscripcion en bloque. */
  loadClubPlayers: () => Promise<unknown[]>;
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

export const useTournamentDetails = (tournamentId: string | undefined): UseTournamentDetailsResult => {
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

          if (clas.length > 0) {
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
  }, [activeTab, tournamentId, results, groupsClas, groupMatches, bracketA, bracketB]);

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

  const registerSelf = useCallback(
    async (playerId: string) => {
      if (!tournamentId) return;
      await tournaments.register(tournamentId, { playerId });
      await reload();
    },
    [tournamentId, reload],
  );

  const updateParticipantStatus = useCallback(
    async (playerId: string, status: string) => {
      if (!tournamentId) return;
      await tournaments.updateParticipantStatus(tournamentId, playerId, status);
      await fetchParticipants();
    },
    [tournamentId, fetchParticipants],
  );

  const [isGenerating, setIsGenerating] = useState(false);

  const generateGroups = useCallback(async () => {
    if (!tournamentId) return;
    setIsGenerating(true);
    try {
      await tournaments.generateGroups(tournamentId);
      await fetchTournamentInfo();
    } finally {
      setIsGenerating(false);
    }
  }, [tournamentId, fetchTournamentInfo]);

  const saveFormat = useCallback(
    async (format: TournamentFormat) => {
      if (!tournamentId || !tournament) return;

      const payload: Record<string, number> = {
        setsToWinGroup: Number(format.setsToWinGroup),
        setsToWinKnockout: Number(format.setsToWinKnockout),
      };

      if (tournament.rounds !== 'Knockout') {
        payload.numGroup = Number(format.numGroup);
        payload.numGroupPlayers = Number(format.numGroupPlayers);
        payload.playersKnockout = Number(format.playersKnockout);
      }

      await tournaments.update(tournamentId, payload);
      await fetchTournamentInfo();
    },
    [tournamentId, tournament, fetchTournamentInfo],
  );

  const saveMatch = useCallback(
    async (match: MatchToEdit) => {
      if (!tournamentId) return;

      await matchesService.update(match.id, {
        status: match.status,
        setsToWin: match.setsToWin,
        playerOneId: match.playerOneId,
        playerTwoId: match.playerTwoId,
        setOnePlayerOne: Number(match.set1P1),
        setOnePlayerTwo: Number(match.set1P2),
        setTwoPlayerOne: Number(match.set2P1),
        setTwoPlayerTwo: Number(match.set2P2),
        setThreePlayerOne: Number(match.set3P1),
        setThreePlayerTwo: Number(match.set3P2),
        setFourPlayerOne: Number(match.set4P1),
        setFourPlayerTwo: Number(match.set4P2),
        setFivePlayerOne: Number(match.set5P1),
        setFivePlayerTwo: Number(match.set5P2),
        setSixPlayerOne: Number(match.set6P1),
        setSixPlayerTwo: Number(match.set6P2),
        setSevenPlayerOne: Number(match.set7P1),
        setSevenPlayerTwo: Number(match.set7P2),
      });

      await reloadActiveTab();
      await fetchTournamentInfo();
    },
    [tournamentId, reloadActiveTab, fetchTournamentInfo],
  );

  const bulkEnroll = useCallback(
    async (playerIds: string[]) => {
      if (!tournamentId) return;
      await tournaments.registerBulk(tournamentId, { playerIds });
      await Promise.all([fetchParticipants(), fetchTournamentInfo()]);
    },
    [tournamentId, fetchParticipants, fetchTournamentInfo],
  );

  const swapPlayers = useCallback(
    async (playerAId: string, playerBId: string) => {
      if (!tournamentId) return;
      await tournaments.swapPlayers(tournamentId, {
        groupId: '',
        playerOneId: playerAId,
        playerTwoId: playerBId,
      });
      await fetchTournamentInfo();
      await reloadActiveTab();
    },
    [tournamentId, fetchTournamentInfo, reloadActiveTab],
  );

  const removeTournament = useCallback(async () => {
    if (!tournamentId) return;
    await tournaments.remove(tournamentId);
  }, [tournamentId]);

  const loadClubPlayers = useCallback(async () => usersService.list(), []);

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
    registerSelf,
    updateParticipantStatus,
    generateGroups,
    saveFormat,
    saveMatch,
    bulkEnroll,
    swapPlayers,
    removeTournament,
    loadClubPlayers,
    isGenerating,
  };
};

export default useTournamentDetails;

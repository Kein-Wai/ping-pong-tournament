import { useEffect, useState, useMemo } from 'react';

import { useParams, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';
import {
  Card,
  Title,
  Text,
  Group,
  Button,
  Center,
  Loader,
  Badge,
  Stack,
  Tabs,
  Paper,
  SimpleGrid,
  ThemeIcon,
  Table,
  Avatar,
  ScrollArea,
  Select,
  Modal,
  ActionIcon,
  Tooltip,
  NumberInput,
} from '@mantine/core';
import {
  IconArrowLeft,
  IconInfoCircle,
  IconUsers,
  IconTournament,
  IconListNumbers,
  IconCalendar,
  IconMedal,
  IconTrophy,
  IconEdit,
  IconUserCheck,
  IconUserX,
  IconRocket,
  IconSettings,
  IconTrash,
} from '@tabler/icons-react';
import { notifications } from '@mantine/notifications';
import confetti from 'canvas-confetti';
import { api } from '../../api/axios';
import { openAppConfirmModal } from '../../utils/modals';
import { ENDPOINTS } from '../../api/endpoints';
import { APP_ROUTES } from '../../constants/routes';
import { isValidTableTennisSet } from '../../utils/matchValidation';
import { getPlayerAvatar } from '../../utils/avatar';

interface MatchToEdit {
  id: string;
  playerOneName: string;
  playerTwoName: string;
  playerOneId: string;
  playerTwoId: string;
  setsToWin: number;
  status: string;
  isKnockout: boolean;

  set1P1: number | '';
  set1P2: number | '';
  set2P1: number | '';
  set2P2: number | '';
  set3P1: number | '';
  set3P2: number | '';
  set4P1: number | '';
  set4P2: number | '';
  set5P1: number | '';
  set5P2: number | '';
  set6P1: number | '';
  set6P2: number | '';
  set7P1: number | '';
  set7P2: number | '';
}

interface Participant {
  id: string;
  registeredAt: string;
  status: string;
  player: {
    id: string;
    name: string;
    surname: string | null;
    avatarUrl: string | null;
    stats: { elo: number | null } | null;
  };
}

interface Tournament {
  id: string;
  name: string;
  dateStart: string;
  numPlayers: number;
  typeTournament: string | null;
  levelTournament: string | null;
  rounds: string | null;
  status: string | null;
  typeKnockout: string | null;
  participants: Participant[];
  numGroup?: number | null;
  numGroupPlayers?: number | null;
  playersKnockout?: number | null;
  sortKnockout?: string | null;
  allPos?: boolean | null;
  setsToWinGroup?: number | null;
  setsToWinKnockout?: number | null;
}

interface TournamentClas {
  id: string;
  position: number | null;
  lastRound: string | null;
  player: {
    id: string;
    name: string;
    surname: string | null;
    stats: { elo: number | null };
    avatarUrl: string | null;
  };
}

interface TournamentGroupClas {
  id: string;
  position: number;
  pointsClas: number;
  played: number;
  gamesWon: number;
  gamesLost: number;
  setsWon: number;
  setsLost: number;
  pointsWon: number;
  pointsLost: number;
  player: { id: string; name: string; surname: string | null; stats: { elo: number | null } };
  tournamentGroup: { group: number };
}

interface BracketPlayer {
  id: string;
  name: string;
  surname: string | null;
  stats?: {
    elo: number;
    matchWon: number;
    matchLost: number;
  };
}

interface BracketMatch {
  id: string;
  status: string;
  playerOne: BracketPlayer | null;
  playerTwo: BracketPlayer | null;
  setOnePlayerOne: number | null;
  setOnePlayerTwo: number | null;
  setTwoPlayerOne: number | null;
  setTwoPlayerTwo: number | null;
  setThreePlayerOne: number | null;
  setThreePlayerTwo: number | null;
  setFourPlayerOne: number | null;
  setFourPlayerTwo: number | null;
  setFivePlayerOne: number | null;
  setFivePlayerTwo: number | null;
}

interface KnockoutRound {
  id: string;
  round: string;
  type: string;
  positions: string | null;
  matches: BracketMatch[];
}

interface GroupMatch {
  id: string;
  status: string;
  setOnePlayerOne: number | null;
  setOnePlayerTwo: number | null;
  setTwoPlayerOne: number | null;
  setTwoPlayerTwo: number | null;
  setThreePlayerOne: number | null;
  setThreePlayerTwo: number | null;
  setFourPlayerOne: number | null;
  setFourPlayerTwo: number | null;
  setFivePlayerOne: number | null;
  setFivePlayerTwo: number | null;
  playerOne: BracketPlayer | null;
  playerTwo: BracketPlayer | null;
  group: { id: string; group: number } | null;
}

const KNOCKOUT_STAGES = [
  'R128avos',
  'R64avos',
  'R32avos',
  'R16avos',
  'Octavos',
  'Cuartos',
  'Semifinales',
  'Final',
];

export const TorneoDetalles = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const isAdmin = user?.role === 'AdminClub' || user?.role === 'SuperAdmin';

  const [tournament, setTournament] = useState<Tournament | null>(null);
  const [loading, setLoading] = useState(true);
  const [isRegistering, setIsRegistering] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);

  const [editFormatOpened, setEditFormatOpened] = useState(false);
  const [f_numGroup, setFNumGroup] = useState<number | string>(4);
  const [f_numGroupPlayers, setFNumGroupPlayers] = useState<number | string>(4);
  const [f_playersKnockout, setFPlayersKnockout] = useState<number | string>(2);
  const [f_setsToWinGroup, setFSetsToWinGroup] = useState<number | string>(2);
  const [f_setsToWinKnockout, setFSetsToWinKnockout] = useState<number | string>(3);

  const [activeTab, setActiveTab] = useState<string | null>('info');

  const [participants, setParticipants] = useState<Participant[] | null>(null);
  const [results, setResults] = useState<TournamentClas[] | null>(null);
  const [bracketA, setBracketA] = useState<KnockoutRound[] | null>(null);

  const [groupsClas, setGroupsClas] = useState<TournamentGroupClas[] | null>(null);
  const [groupMatches, setGroupMatches] = useState<GroupMatch[] | null>(null);
  const [selectedGroup, setSelectedGroup] = useState<string | null>(null);

  const [selectedMatch, setSelectedMatch] = useState<BracketMatch | null>(null);

  const [editMatch, setEditMatch] = useState<MatchToEdit | null>(null);
  const [submittingMatch, setSubmittingMatch] = useState(false);

  const fetchTournamentInfo = async () => {
    try {
      if (!id) return;
      const res = await api.get(ENDPOINTS.TOURNAMENTS.BY_ID(id));
      const tData = res.data.data || res.data;

      setTournament((prev) => {
        if (prev && prev.status !== 'Completado' && tData.status === 'Completado') {
          const duration = 3 * 1000;
          const animationEnd = Date.now() + duration;
          const defaults = { startVelocity: 30, spread: 360, ticks: 60, zIndex: 9999 };

          const randomInRange = (min: number, max: number) => Math.random() * (max - min) + min;

          const interval: any = setInterval(function () {
            const timeLeft = animationEnd - Date.now();

            if (timeLeft <= 0) {
              return clearInterval(interval);
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
        }

        return tData;
      });

      if (tData.status === 'Completado') {
        setActiveTab('resultados');
      } else if (KNOCKOUT_STAGES.includes(tData.status)) {
        setActiveTab('bracketA');
      }
    } catch (error) {
      console.error('Error cargando el torneo:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTournamentInfo();
  }, [id]);

  useEffect(() => {
    if (!id || !activeTab) return;

    const fetchLazyData = async () => {
      try {
        if (activeTab === 'inscritos' && participants === null) {
          const res = await api.get(ENDPOINTS.TOURNAMENTS.PARTICIPANTES(id));
          setParticipants(res.data.data);
        } else if (activeTab === 'resultados' && results === null) {
          const res = await api.get(ENDPOINTS.TOURNAMENTS.CLASSIFICATION(id));
          setResults(res.data.data);
        } else if (activeTab === 'grupos' && (groupsClas === null || groupMatches === null)) {
          const [resClas, resMatches] = await Promise.all([
            api.get(ENDPOINTS.TOURNAMENTS.GROUPS(id)),
            api.get(ENDPOINTS.TOURNAMENTS.GROUPMATCHES(id)),
          ]);

          const clasData = resClas.data.data;
          setGroupsClas(clasData);
          setGroupMatches(resMatches.data.data);

          if (clasData.length > 0) {
            const firstGroupNum = String(clasData[0].tournamentGroup.group);
            setSelectedGroup(firstGroupNum);
          }
        } else if (activeTab === 'bracketA' && bracketA === null) {
          const res = await api.get(`${ENDPOINTS.TOURNAMENTS.BRACKETS(id)}?type=A`);
          setBracketA(res.data.data);
        }
      } catch (error) {
        console.error(`Error cargando datos para la pestaña ${activeTab}:`, error);
      }
    };

    fetchLazyData();
  }, [activeTab, id]);

  const confirmedPlayersCount = useMemo(() => {
    return participants?.filter((p) => p.status === 'Confirmado').length || 0;
  }, [participants]);

  const { firstPlace, secondPlace, thirdPlace, otherResults } = useMemo<{
    firstPlace: TournamentClas | null;
    secondPlace: TournamentClas | null;
    thirdPlace: TournamentClas | null;
    otherResults: TournamentClas[];
  }>(() => {
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

  const currentGroupClas = useMemo(() => {
    if (!groupsClas || !selectedGroup) return [];
    const filtered = groupsClas.filter((c) => String(c.tournamentGroup.group) === selectedGroup);

    filtered.sort((a, b) => {
      if (b.pointsClas !== a.pointsClas) {
        return b.pointsClas - a.pointsClas;
      }

      const diffSetsA = a.setsWon - a.setsLost;
      const diffSetsB = b.setsWon - b.setsLost;
      if (diffSetsB !== diffSetsA) {
        return diffSetsB - diffSetsA;
      }

      const diffPointsA = a.pointsWon - a.pointsLost;
      const diffPointsB = b.pointsWon - b.pointsLost;
      if (diffPointsB !== diffPointsA) {
        return diffPointsB - diffPointsA;
      }

      return 0;
    });

    return filtered.map((c, index) => ({
      ...c,
      visualPosition: index + 1,
    }));
  }, [groupsClas, selectedGroup]);

  const currentGroupMatches = useMemo(() => {
    if (!groupMatches || !selectedGroup) return [];
    return groupMatches.filter((m) => String(m.group?.group) === selectedGroup);
  }, [groupMatches, selectedGroup]);

  const matchScoreStats = useMemo(() => {
    if (!editMatch) return { p1Sets: 0, p2Sets: 0, isValidToComplete: false };

    const sets = [
      [Number(editMatch.set1P1), Number(editMatch.set1P2)],
      [Number(editMatch.set2P1), Number(editMatch.set2P2)],
      [Number(editMatch.set3P1), Number(editMatch.set3P2)],
      [Number(editMatch.set4P1), Number(editMatch.set4P2)],
      [Number(editMatch.set5P1), Number(editMatch.set5P2)],
      [Number(editMatch.set6P1), Number(editMatch.set6P2)],
      [Number(editMatch.set7P1), Number(editMatch.set7P2)],
    ];

    let p1Sets = 0;
    let p2Sets = 0;

    for (const [s1, s2] of sets) {
      if (isValidTableTennisSet(s1, s2)) {
        if (s1 > s2) p1Sets++;
        else p2Sets++;
      }
    }

    const isValidToComplete = p1Sets === editMatch.setsToWin || p2Sets === editMatch.setsToWin;

    return { p1Sets, p2Sets, isValidToComplete };
  }, [editMatch]);

  const checkMatchStatusOnInput = (matchState: MatchToEdit) => {
    const sets = [
      [Number(matchState.set1P1), Number(matchState.set1P2)],
      [Number(matchState.set2P1), Number(matchState.set2P2)],
      [Number(matchState.set3P1), Number(matchState.set3P2)],
      [Number(matchState.set4P1), Number(matchState.set4P2)],
      [Number(matchState.set5P1), Number(matchState.set5P2)],
      [Number(matchState.set6P1), Number(matchState.set6P2)],
      [Number(matchState.set7P1), Number(matchState.set7P2)],
    ];

    let p1Sets = 0;
    let p2Sets = 0;

    for (const [s1, s2] of sets) {
      if (isValidTableTennisSet(s1, s2)) {
        if (s1 > s2) p1Sets++;
        else p2Sets++;
      }
    }

    const autoCompleted = p1Sets === matchState.setsToWin || p2Sets === matchState.setsToWin;
    return { p1Sets, p2Sets, autoCompleted };
  };

  const formatSets = (match: GroupMatch | BracketMatch) => {
    if (match.status !== 'Completado')
      return (
        <Badge color="gray" variant="light">
          {match.status}
        </Badge>
      );

    const sets = [];
    if (match.setOnePlayerOne !== null || match.setOnePlayerTwo !== null)
      sets.push(`${match.setOnePlayerOne}-${match.setOnePlayerTwo}`);
    if (match.setTwoPlayerOne !== null || match.setTwoPlayerTwo !== null)
      sets.push(`${match.setTwoPlayerOne}-${match.setTwoPlayerTwo}`);
    if (match.setThreePlayerOne !== null || match.setThreePlayerTwo !== null)
      sets.push(`${match.setThreePlayerOne}-${match.setThreePlayerTwo}`);
    if (match.setFourPlayerOne !== null || match.setFourPlayerTwo !== null)
      sets.push(`${match.setFourPlayerOne}-${match.setFourPlayerTwo}`);
    if (match.setFivePlayerOne !== null || match.setFivePlayerTwo !== null)
      sets.push(`${match.setFivePlayerOne}-${match.setFivePlayerTwo}`);

    return (
      <Text fw={600} size="sm" c="blue.7">
        {sets.filter((s) => s !== '0-0').join(' | ')}
      </Text>
    );
  };

  const handleInscribirse = () => {
    if (!id) return;
    openAppConfirmModal({
      title: 'Inscripción al Torneo',
      icon: <IconTrophy size={18} />,
      color: 'green',
      description: '¿Confirmas que deseas inscribirte en la siguiente competición?',
      highlightText: tournament?.name || '',
      warningText:
        'Recuerda revisar la fecha de inicio. ¡Asegúrate de estar disponible para jugar! Si no apareces, se te descontarán 100 puntos en tu ELO.',
      confirmLabel: 'Confirmar e Inscribirme',
      onConfirm: async () => {
        setIsRegistering(true);
        try {
          await api.post(ENDPOINTS.TOURNAMENTS.REGISTER(id));
          await fetchTournamentInfo();
          if (participants !== null) {
            const res = await api.get(ENDPOINTS.TOURNAMENTS.PARTICIPANTES(id));
            setParticipants(res.data.data);
          }
        } catch (error) {
          console.error(error);
        } finally {
          setIsRegistering(false);
        }
      },
    });
  };

  const getStatusColor = (status: string | null) => {
    if (!status) return 'gray';
    if (status === 'Programado') return 'blue';
    if (status === 'Completado') return 'green';
    if (status === 'Cancelado') return 'red';
    return 'orange';
  };

  const handleParticipantStatus = (playerId: string, playerName: string, newStatus: string) => {
    if (!id) return;
    const isNoShow = newStatus === 'NoPresentado';

    openAppConfirmModal({
      title: isNoShow ? 'Sancionar Jugador' : 'Confirmar Asistencia',
      icon: isNoShow ? <IconUserX size={18} /> : <IconUserCheck size={18} />,
      color: isNoShow ? 'red' : 'green',
      description: isNoShow
        ? '¿Estás seguro de marcar a este jugador como No Presentado? Se le restarán 100 puntos de ELO como penalización.'
        : 'Confirmar a este jugador para que el algoritmo de la Serpiente lo incluya en la Fase de Grupos.',
      highlightText: playerName,
      confirmLabel: isNoShow ? 'Sí, Sancionar' : 'Confirmar Jugador',
      onConfirm: async () => {
        try {
          await api.put(ENDPOINTS.TOURNAMENTS.UPDATE_PARTICIPANT_STATUS(id, playerId), {
            status: newStatus,
          });
          const res = await api.get(ENDPOINTS.TOURNAMENTS.PARTICIPANTES(id));
          setParticipants(res.data.data);
        } catch (error) {
          console.error(error);
        }
      },
    });
  };

  const handleGenerateTournament = () => {
    if (!id) return;
    const isUnderbooked = confirmedPlayersCount < (tournament?.numPlayers || 0);

    openAppConfirmModal({
      title: 'Iniciar Competición',
      icon: <IconRocket size={18} />,
      color: isUnderbooked ? 'red' : 'orange',
      description:
        'Se cerrarán las inscripciones y el algoritmo distribuirá en el cuadro únicamente a los jugadores confirmados.',
      highlightText: tournament?.name || '',
      warningText: isUnderbooked
        ? `🚨 ATENCIÓN: Solo tienes ${confirmedPlayersCount} confirmados de los ${tournament?.numPlayers} esperados. ¡Te sobrarán huecos vacíos! Te recomendamos cancelar y usar "Ajustar Formato".`
        : 'Esta acción es irreversible. Se generarán los cruces y el torneo pasará a estar activo.',
      confirmLabel: 'Sí, Iniciar Torneo',
      onConfirm: async () => {
        setIsGenerating(true);
        try {
          await api.post(ENDPOINTS.TOURNAMENTS.GENERATE_GROUPS(id));
          await fetchTournamentInfo();
          setActiveTab(hasGroupsFormat ? 'grupos' : 'bracketA');
        } catch (error) {
          console.error('Error al generar el torneo', error);
        } finally {
          setIsGenerating(false);
        }
      },
    });
  };

  const openEditFormat = () => {
    setFNumGroup(tournament?.numGroup || 4);
    setFNumGroupPlayers(tournament?.numGroupPlayers || 4);
    setFPlayersKnockout(tournament?.playersKnockout || 2);
    setFSetsToWinGroup(tournament?.setsToWinGroup || 2);
    setFSetsToWinKnockout(tournament?.setsToWinKnockout || 3);
    setEditFormatOpened(true);
  };

  const handleSaveFormat = async () => {
    if (!id || !tournament) return;
    try {
      const payload: any = {
        setsToWinGroup: Number(f_setsToWinGroup),
        setsToWinKnockout: Number(f_setsToWinKnockout),
      };

      if (tournament.rounds !== 'Knockout') {
        payload.numGroup = Number(f_numGroup);
        payload.numGroupPlayers = Number(f_numGroupPlayers);
        payload.playersKnockout = Number(f_playersKnockout);
      }

      await api.put(ENDPOINTS.TOURNAMENTS.UPDATE(id), payload);
      setEditFormatOpened(false);
      notifications.show({
        title: 'Formato actualizado',
        message: 'Se han ajustado los parámetros del torneo.',
        color: 'green',
      });
      await fetchTournamentInfo();
    } catch (error) {
      console.error(error);
    }
  };

  const handleDeleteTournament = () => {
    if (!id) return;

    openAppConfirmModal({
      title: 'Eliminar Torneo',
      icon: <IconTrash size={18} />,
      color: 'red',
      description:
        '¿Estás seguro de que deseas eliminar este torneo? Se borrarán todas las inscripciones registradas.',
      highlightText: tournament?.name || '',
      warningText: 'Esta acción es irreversible y el torneo desaparecerá del listado.',
      confirmLabel: 'Sí, Eliminar Torneo',
      onConfirm: async () => {
        try {
          await api.delete(ENDPOINTS.TOURNAMENTS.DELETE(id));
          navigate(APP_ROUTES.TORNEOS.LIST);
        } catch (error) {
          console.error('Error al eliminar el torneo', error);
        }
      },
    });
  };

  const openEditMatchModal = (match: any, isKnockout: boolean) => {
    if (!isAdmin) return;

    const setsToWin = isKnockout
      ? tournament?.setsToWinKnockout || 3
      : tournament?.setsToWinGroup || 2;

    setEditMatch({
      id: match.id,
      playerOneName: `${match.playerOne?.name || 'Jugador 1'} ${match.playerOne?.surname || ''}`,
      playerTwoName: `${match.playerTwo?.name || 'Jugador 2'} ${match.playerTwo?.surname || ''}`,
      playerOneId: match.playerOneId || match.playerOne?.id,
      playerTwoId: match.playerTwoId || match.playerTwo?.id,
      setsToWin,
      status: match.status || 'Programado',
      isKnockout,

      set1P1: match.setOnePlayerOne ?? 0,
      set1P2: match.setOnePlayerTwo ?? 0,
      set2P1: match.setTwoPlayerOne ?? 0,
      set2P2: match.setTwoPlayerTwo ?? 0,
      set3P1: match.setThreePlayerOne ?? 0,
      set3P2: match.setThreePlayerTwo ?? 0,
      set4P1: match.setFourPlayerOne ?? 0,
      set4P2: match.setFourPlayerTwo ?? 0,
      set5P1: match.setFivePlayerOne ?? 0,
      set5P2: match.setFivePlayerTwo ?? 0,
      set6P1: match.setSixPlayerOne ?? 0,
      set6P2: match.setSixPlayerTwo ?? 0,
      set7P1: match.setSevenPlayerOne ?? 0,
      set7P2: match.setSevenPlayerTwo ?? 0,
    });
  };

  const executeSaveMatch = async () => {
    if (!editMatch || !id) return;
    setSubmittingMatch(true);

    try {
      const payload = {
        status: editMatch.status,
        setsToWin: editMatch.setsToWin,
        playerOneId: editMatch.playerOneId,
        playerTwoId: editMatch.playerTwoId,
        setOnePlayerOne: Number(editMatch.set1P1),
        setOnePlayerTwo: Number(editMatch.set1P2),
        setTwoPlayerOne: Number(editMatch.set2P1),
        setTwoPlayerTwo: Number(editMatch.set2P2),
        setThreePlayerOne: Number(editMatch.set3P1),
        setThreePlayerTwo: Number(editMatch.set3P2),
        setFourPlayerOne: Number(editMatch.set4P1),
        setFourPlayerTwo: Number(editMatch.set4P2),
        setFivePlayerOne: Number(editMatch.set5P1),
        setFivePlayerTwo: Number(editMatch.set5P2),
        setSixPlayerOne: Number(editMatch.set6P1),
        setSixPlayerTwo: Number(editMatch.set6P2),
        setSevenPlayerOne: Number(editMatch.set7P1),
        setSevenPlayerTwo: Number(editMatch.set7P2),
      };

      await api.put(ENDPOINTS.MATCHES.BY_ID(editMatch.id), payload);

      setEditMatch(null);

      if (activeTab === 'grupos') {
        const [resClas, resMatches] = await Promise.all([
          api.get(ENDPOINTS.TOURNAMENTS.GROUPS(id)),
          api.get(ENDPOINTS.TOURNAMENTS.GROUPMATCHES(id)),
        ]);
        setGroupsClas(resClas.data.data);
        setGroupMatches(resMatches.data.data);
      } else if (activeTab === 'bracketA') {
        const res = await api.get(`${ENDPOINTS.TOURNAMENTS.BRACKETS(id)}?type=A`);
        setBracketA(res.data.data);
      }

      await fetchTournamentInfo();
    } catch (error) {
      console.error('Error al actualizar el partido:', error);
    } finally {
      setSubmittingMatch(false);
    }
  };

  const handleSaveMatch = () => {
    if (!editMatch) return;

    const isCompletingNow = editMatch.status === 'Completado';
    const pendingGroupMatchesCount =
      groupMatches?.filter((m) => m.status !== 'Completado').length || 0;

    if (!editMatch.isKnockout && isCompletingNow && pendingGroupMatchesCount === 1) {
      openAppConfirmModal({
        title: 'Último partido de la Fase de Grupos',
        icon: <IconTournament size={18} />,
        color: 'orange',
        description:
          'Estás a punto de completar el último partido pendiente de toda la fase de grupos.',
        highlightText: 'Se generará el Cuadro de Eliminatorias automáticamente',
        warningText:
          'Asegúrate de que todos los resultados de los grupos son correctos antes de continuar. Una vez generado el cuadro principal, modificar un partido de grupos no alterará los cruces.',
        confirmLabel: 'Completar y Generar Cuadro',
        onConfirm: executeSaveMatch,
      });
    } else if (editMatch.isKnockout && isCompletingNow) {
      openAppConfirmModal({
        title: 'Confirmar Resultado Definitivo',
        icon: <IconTrophy size={18} />,
        color: 'red',
        description: 'Estás a punto de cerrar este partido eliminatorio.',
        highlightText: 'El ganador avanzará automáticamente en el cuadro.',
        warningText:
          '¡Atención! Una vez completado, revertir el ganador en el cuadro principal afectará a los cruces y no es posible deshacerlo fácilmente desde la interfaz. ¡Revisa bien el marcador!',
        confirmLabel: 'Sí, Guardar y Avanzar Jugador',
        onConfirm: executeSaveMatch,
      });
    } else {
      executeSaveMatch();
    }
  };

  if (loading)
    return (
      <Center h={400}>
        <Loader color="blue" type="bars" />
      </Center>
    );

  if (!tournament)
    return (
      <Center h={400}>
        <Text c="dimmed">Torneo no encontrado.</Text>
      </Center>
    );

  const currentStatus = tournament.status || '';
  const isProgramado = currentStatus === 'Programado';
  const isGrupos = currentStatus === 'Grupos';
  const isKnockoutPhase = KNOCKOUT_STAGES.includes(currentStatus);
  const isCompletado = currentStatus === 'Completado';

  const hasGroupsFormat =
    tournament.rounds === 'GruposKnockout' || tournament.rounds === 'TodosvsTodos';
  const hasKnockoutFormat =
    tournament.rounds === 'GruposKnockout' || tournament.rounds === 'Knockout';

  const currentPlayers = tournament.participants || [];
  const plazasDisponibles = tournament.numPlayers - currentPlayers.length;
  const isFull = plazasDisponibles <= 0;

  return (
    <Stack gap="xl">
      <div>
        <Button
          variant="subtle"
          leftSection={<IconArrowLeft size={16} />}
          onClick={() => navigate(APP_ROUTES.TORNEOS.LIST)}
        >
          Volver a Torneos
        </Button>
      </div>

      <Card shadow="sm" padding="xl" radius="md" withBorder>
        <Group justify="space-between" align="flex-start">
          <div>
            <Title order={1}>{tournament.name}</Title>
            <Group mt="md" gap="xs">
              <Badge color={getStatusColor(currentStatus)} size="lg" variant="light">
                {currentStatus}
              </Badge>
              <Badge color="gray" size="lg" variant="outline">
                {tournament.typeTournament || 'Interno'}
              </Badge>
              <Badge color="grape" size="lg" variant="outline">
                {tournament.levelTournament || 'Mixto'}
              </Badge>
            </Group>
          </div>

          {isProgramado && (
            <Stack align="flex-end" gap="xs">
              <Group>
                {isAdmin && (
                  <>
                    <Tooltip label="Eliminar este torneo">
                      <ActionIcon
                        color="red"
                        variant="light"
                        size="input-sm"
                        onClick={handleDeleteTournament}
                      >
                        <IconTrash size={18} />
                      </ActionIcon>
                    </Tooltip>

                    <Button
                      color="gray"
                      variant="light"
                      size="md"
                      onClick={openEditFormat}
                      leftSection={<IconSettings size={18} />}
                    >
                      Ajustar Formato
                    </Button>
                    <Button
                      color={
                        confirmedPlayersCount < (tournament.numPlayers || 0) ? 'red' : 'orange'
                      }
                      size="md"
                      loading={isGenerating}
                      onClick={handleGenerateTournament}
                      leftSection={<IconRocket size={18} />}
                    >
                      Iniciar Torneo
                    </Button>
                  </>
                )}

                <Button
                  color={isFull ? 'gray' : 'blue'}
                  size="md"
                  disabled={isFull}
                  loading={isRegistering}
                  onClick={handleInscribirse}
                >
                  {isFull ? 'Torneo Completo' : 'Inscribirme'}
                </Button>
              </Group>

              <Text size="xs" c="dimmed">
                {plazasDisponibles > 0 ? `Quedan ${plazasDisponibles} plazas` : 'Lista de espera'}
                {isAdmin && ` · Confirmados: ${confirmedPlayersCount}`}
              </Text>
            </Stack>
          )}
        </Group>
      </Card>

      <Tabs value={activeTab} onChange={setActiveTab} variant="outline" radius="md">
        <Tabs.List>
          <Tabs.Tab value="info" leftSection={<IconInfoCircle size={16} />}>
            Información
          </Tabs.Tab>
          {(isProgramado || isGrupos || isKnockoutPhase) && (
            <Tabs.Tab value="inscritos" leftSection={<IconUsers size={16} />}>
              Inscritos ({currentPlayers.length})
            </Tabs.Tab>
          )}
          {isCompletado && (
            <Tabs.Tab value="resultados" leftSection={<IconMedal size={16} />}>
              Resultados Finales
            </Tabs.Tab>
          )}
          {hasGroupsFormat && (isGrupos || isKnockoutPhase || isCompletado) && (
            <Tabs.Tab value="grupos" leftSection={<IconListNumbers size={16} />}>
              Fase de Grupos
            </Tabs.Tab>
          )}
          {hasKnockoutFormat && (isKnockoutPhase || isCompletado) && (
            <Tabs.Tab value="bracketA" leftSection={<IconTournament size={16} />}>
              Cuadro Principal
            </Tabs.Tab>
          )}
        </Tabs.List>

        {/* --- INFO --- */}
        <Tabs.Panel value="info" pt="xl">
          <Stack gap="xl">
            <SimpleGrid cols={{ base: 1, sm: 2, md: 3 }} spacing="lg">
              <Paper withBorder p="md" radius="md">
                <Group gap="md">
                  <ThemeIcon size={40} radius="md" variant="light" color="blue">
                    <IconCalendar size={20} />
                  </ThemeIcon>
                  <div>
                    <Text c="dimmed" size="xs" tt="uppercase" fw={700}>
                      Fecha
                    </Text>
                    <Text fw={500}>
                      {new Date(tournament.dateStart).toLocaleDateString('es-ES', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric',
                      })}
                    </Text>
                  </div>
                </Group>
              </Paper>

              <Paper withBorder p="md" radius="md">
                <Group gap="md">
                  <ThemeIcon size={40} radius="md" variant="light" color="teal">
                    <IconUsers size={20} />
                  </ThemeIcon>
                  <div>
                    <Text c="dimmed" size="xs" tt="uppercase" fw={700}>
                      Plazas Totales
                    </Text>
                    <Text fw={500}>{tournament.numPlayers} Jugadores máx.</Text>
                  </div>
                </Group>
              </Paper>

              <Paper withBorder p="md" radius="md">
                <Group gap="md">
                  <ThemeIcon size={40} radius="md" variant="light" color="grape">
                    <IconTrophy size={20} />
                  </ThemeIcon>
                  <div>
                    <Text c="dimmed" size="xs" tt="uppercase" fw={700}>
                      Nivel / Acceso
                    </Text>
                    <Text fw={500}>
                      {tournament.levelTournament || 'Mixto'} ·{' '}
                      {tournament.typeTournament || 'Interno'}
                    </Text>
                  </div>
                </Group>
              </Paper>
            </SimpleGrid>

            <Title order={4} mt="md">
              Formato de Competición
            </Title>
            <SimpleGrid cols={{ base: 1, sm: 2, md: 3 }} spacing="lg">
              <Paper withBorder p="md" radius="md">
                <Group gap="md">
                  <ThemeIcon size={40} radius="md" variant="light" color="orange">
                    <IconTournament size={20} />
                  </ThemeIcon>
                  <div>
                    <Text c="dimmed" size="xs" tt="uppercase" fw={700}>
                      Estructura
                    </Text>
                    <Text fw={500}>
                      {tournament.rounds === 'GruposKnockout'
                        ? 'Grupos + Eliminatorias'
                        : tournament.rounds === 'TodosvsTodos'
                          ? 'Liga (Todos contra Todos)'
                          : 'Eliminatoria Directa'}
                    </Text>
                  </div>
                </Group>
              </Paper>
            </SimpleGrid>
            {(tournament.rounds === 'GruposKnockout' || tournament.rounds === 'TodosvsTodos') && (
              <>
                <SimpleGrid cols={{ base: 1, sm: 2, md: 3 }} spacing="lg">
                  <Paper withBorder p="md" radius="md">
                    <Group gap="md">
                      <ThemeIcon size={40} radius="md" variant="light" color="yellow">
                        <IconListNumbers size={20} />
                      </ThemeIcon>
                      <div>
                        <Text c="dimmed" size="xs" tt="uppercase" fw={700}>
                          Fase de Grupos
                        </Text>
                        <Text fw={500}>
                          {tournament.numGroup || '?'} Grupos de {tournament.numGroupPlayers || '?'}{' '}
                          jug.
                        </Text>
                      </div>
                    </Group>
                  </Paper>
                  <Paper withBorder p="md" radius="md">
                    <Group gap="md">
                      <ThemeIcon size={40} radius="md" variant="light" color="yellow">
                        <IconListNumbers size={20} />
                      </ThemeIcon>
                      <div>
                        <Text c="dimmed" size="xs" tt="uppercase" fw={700}>
                          Sets Partidos Grupos
                        </Text>
                        <Text fw={500}>{tournament.setsToWinGroup || 2} sets para ganar</Text>
                      </div>
                    </Group>
                  </Paper>
                </SimpleGrid>
              </>
            )}

            {(tournament.rounds === 'GruposKnockout' || tournament.rounds === 'Knockout') && (
              <>
                <SimpleGrid cols={{ base: 1, sm: 2, md: 3 }} spacing="lg">
                  <Paper withBorder p="md" radius="md">
                    <Group gap="md">
                      <ThemeIcon size={40} radius="md" variant="light" color="red">
                        <IconMedal size={20} />
                      </ThemeIcon>
                      <div>
                        <Text c="dimmed" size="xs" tt="uppercase" fw={700}>
                          Cuadro Final (Llaves)
                        </Text>
                        <Text fw={500}>
                          {tournament.typeKnockout === 'LlaveAB' ? 'Llave A y B' : 'Solo Llave A'}
                          {tournament.playersKnockout
                            ? ` (${tournament.playersKnockout} pasan)`
                            : ''}
                        </Text>
                      </div>
                    </Group>
                  </Paper>
                  <Paper withBorder p="md" radius="md">
                    <Group gap="md">
                      <ThemeIcon size={40} radius="md" variant="light" color="yellow">
                        <IconListNumbers size={20} />
                      </ThemeIcon>
                      <div>
                        <Text c="dimmed" size="xs" tt="uppercase" fw={700}>
                          Sets Partidos Knockout
                        </Text>
                        <Text fw={500}>{tournament.setsToWinKnockout || 3} sets para ganar</Text>
                      </div>
                    </Group>
                  </Paper>
                </SimpleGrid>
              </>
            )}
          </Stack>
        </Tabs.Panel>

        {/* --- INSCRITOS --- */}
        {(isProgramado || isGrupos || isKnockoutPhase) && (
          <Tabs.Panel value="inscritos" pt="xl">
            {!participants ? (
              <Center py="xl">
                <Loader color="blue" />
              </Center>
            ) : participants.length === 0 ? (
              <Center py="xl">
                <Text c="dimmed">Aún no hay jugadores inscritos.</Text>
              </Center>
            ) : (
              <Paper withBorder radius="md">
                <Table striped highlightOnHover verticalSpacing="sm">
                  <Table.Thead>
                    <Table.Tr>
                      <Table.Th w={50}>#</Table.Th>
                      <Table.Th>Jugador</Table.Th>
                      <Table.Th>ELO</Table.Th>
                      <Table.Th>Estado</Table.Th>
                      {isAdmin && isProgramado && <Table.Th>Acciones (Pase de lista)</Table.Th>}
                    </Table.Tr>
                  </Table.Thead>
                  <Table.Tbody>
                    {participants.map((p, index) => (
                      <Table.Tr key={p.id}>
                        <Table.Td>{index + 1}</Table.Td>
                        <Table.Td>
                          <Group gap="sm">
                            <Avatar
                              src={getPlayerAvatar(p.player?.name, p.player?.avatarUrl)}
                              radius="xl"
                              size="sm"
                            />
                            <Text size="sm" fw={500}>
                              {p.player?.name} {p.player?.surname || ''}
                            </Text>
                          </Group>
                        </Table.Td>
                        <Table.Td>
                          <Badge variant="light">{p.player?.stats?.elo || 500}</Badge>
                        </Table.Td>
                        <Table.Td>
                          <Badge
                            color={
                              p.status === 'Confirmado'
                                ? 'green'
                                : p.status === 'NoPresentado'
                                  ? 'red'
                                  : 'yellow'
                            }
                            variant="dot"
                          >
                            {p.status}
                          </Badge>
                        </Table.Td>
                        {isAdmin && isProgramado && (
                          <Table.Td>
                            <Group gap="xs">
                              {p.status !== 'Confirmado' && (
                                <Tooltip label="Confirmar Asistencia">
                                  <ActionIcon
                                    color="green"
                                    variant="light"
                                    onClick={() =>
                                      handleParticipantStatus(
                                        p.player.id,
                                        p.player.name,
                                        'Confirmado',
                                      )
                                    }
                                  >
                                    <IconUserCheck size={18} />
                                  </ActionIcon>
                                </Tooltip>
                              )}
                              {p.status !== 'NoPresentado' && (
                                <Tooltip label="Sancionar (No Presentado)">
                                  <ActionIcon
                                    color="red"
                                    variant="light"
                                    onClick={() =>
                                      handleParticipantStatus(
                                        p.player.id,
                                        p.player.name,
                                        'NoPresentado',
                                      )
                                    }
                                  >
                                    <IconUserX size={18} />
                                  </ActionIcon>
                                </Tooltip>
                              )}
                            </Group>
                          </Table.Td>
                        )}
                      </Table.Tr>
                    ))}
                  </Table.Tbody>
                </Table>
              </Paper>
            )}
          </Tabs.Panel>
        )}

        {/* --- RESULTADOS (PODIO) --- */}
        {isCompletado && (
          <Tabs.Panel value="resultados" pt="xl">
            {!results ? (
              <Center py="xl">
                <Loader color="yellow" />
              </Center>
            ) : (
              <Stack gap="xl" mt="md">
                <Group justify="center" align="flex-end" gap="xl" py="xl">
                  {secondPlace && (
                    <Stack align="center" gap="xs">
                      <Avatar
                        src={getPlayerAvatar(
                          secondPlace.player?.name,
                          secondPlace.player?.avatarUrl,
                        )}
                        radius="xl"
                        size="lg"
                      />
                      <Text fw={600} size="sm">
                        {secondPlace.player?.name} {secondPlace.player?.surname || ''}
                      </Text>
                      <Paper
                        w={90}
                        h={90}
                        radius="md"
                        style={{ backgroundColor: 'var(--mantine-color-gray-3)' }}
                      >
                        <Stack align="center" justify="center" h="100%" gap={0}>
                          <IconMedal color="var(--mantine-color-gray-7)" size={28} />
                          <Text fw={900} size="xl" c="gray.7">
                            2º
                          </Text>
                        </Stack>
                      </Paper>
                    </Stack>
                  )}
                  {firstPlace && (
                    <Stack align="center" gap="xs">
                      <IconTrophy
                        size={40}
                        color="var(--mantine-color-yellow-5)"
                        style={{ marginBottom: -10 }}
                      />
                      <Avatar
                        src={getPlayerAvatar(firstPlace.player?.name, firstPlace.player?.avatarUrl)}
                        radius="xl"
                        size="xl"
                      />
                      <Text fw={800} size="md">
                        {firstPlace.player?.name} {firstPlace.player?.surname || ''}
                      </Text>
                      <Paper
                        w={100}
                        h={130}
                        radius="md"
                        style={{ backgroundColor: 'var(--mantine-color-yellow-5)' }}
                      >
                        <Stack align="center" justify="center" h="100%" gap={0}>
                          <Text fw={900} size="h1" c="white">
                            1º
                          </Text>
                        </Stack>
                      </Paper>
                    </Stack>
                  )}
                  {thirdPlace && (
                    <Stack align="center" gap="xs">
                      <Avatar
                        src={getPlayerAvatar(thirdPlace.player?.name, thirdPlace.player?.avatarUrl)}
                        radius="xl"
                        size="lg"
                      />
                      <Text fw={600} size="sm">
                        {thirdPlace.player?.name} {thirdPlace.player?.surname || ''}
                      </Text>
                      <Paper
                        w={90}
                        h={60}
                        radius="md"
                        style={{ backgroundColor: 'var(--mantine-color-orange-4)' }}
                      >
                        <Stack align="center" justify="center" h="100%" gap={0}>
                          <IconMedal color="var(--mantine-color-orange-8)" size={24} />
                          <Text fw={900} size="lg" c="orange.8">
                            3º
                          </Text>
                        </Stack>
                      </Paper>
                    </Stack>
                  )}
                </Group>

                {otherResults.length > 0 && (
                  <Card withBorder radius="md" shadow="sm">
                    <Title order={4} mb="md">
                      Clasificación General
                    </Title>
                    <Table striped highlightOnHover verticalSpacing="sm">
                      <Table.Thead>
                        <Table.Tr>
                          <Table.Th w={80}>Puesto</Table.Th>
                          <Table.Th>Jugador</Table.Th>
                        </Table.Tr>
                      </Table.Thead>
                      <Table.Tbody>
                        {otherResults.map((p) => (
                          <Table.Tr key={p.id}>
                            <Table.Td>
                              <Badge color="gray" variant="light" size="lg">
                                {p.position}º
                              </Badge>
                            </Table.Td>
                            <Table.Td>
                              {p.player?.name} {p.player?.surname || ''}
                            </Table.Td>
                          </Table.Tr>
                        ))}
                      </Table.Tbody>
                    </Table>
                  </Card>
                )}
              </Stack>
            )}
          </Tabs.Panel>
        )}

        {/* --- GRUPOS --- */}
        {hasGroupsFormat && (isGrupos || isKnockoutPhase || isCompletado) && (
          <Tabs.Panel value="grupos" pt="xl">
            {!groupsClas || !groupMatches ? (
              <Center py="xl">
                <Loader color="blue" />
              </Center>
            ) : (
              <Stack gap="xl">
                <Group>
                  <Select
                    label="Selecciona un grupo"
                    data={groupOptions}
                    value={selectedGroup}
                    onChange={(val) => setSelectedGroup(val)}
                    allowDeselect={false}
                    w={{ base: '100%', sm: 250 }}
                  />
                </Group>

                <Card withBorder shadow="sm" radius="md" padding="md">
                  <Title order={4} mb="md">
                    Clasificación
                  </Title>
                  <ScrollArea>
                    <Table striped verticalSpacing="sm" miw={480}>
                      <Table.Thead>
                        <Table.Tr>
                          <Table.Th w={40}>Pos</Table.Th>
                          <Table.Th>Jugador</Table.Th>
                          <Table.Th>Ranking</Table.Th>
                          <Table.Th ta="center">Pts Clas.</Table.Th>
                          <Table.Th ta="center">V - D</Table.Th>
                          <Table.Th ta="center" visibleFrom="sm">
                            Sets Ganados
                          </Table.Th>
                          <Table.Th ta="center" visibleFrom="sm">
                            Sets Perdidos
                          </Table.Th>
                          <Table.Th ta="center" visibleFrom="sm">
                            Puntos Ganados
                          </Table.Th>
                          <Table.Th ta="center" visibleFrom="sm">
                            Puntos Perdidos
                          </Table.Th>
                          <Table.Th ta="center">Diferencia Puntos</Table.Th>
                        </Table.Tr>
                      </Table.Thead>
                      <Table.Tbody>
                        {currentGroupClas.map((clas) => (
                          <Table.Tr key={clas.id}>
                            <Table.Td>
                              <Badge
                                color={
                                  clas.visualPosition <= (tournament?.playersKnockout || 2)
                                    ? 'green'
                                    : 'gray'
                                }
                                variant="filled"
                              >
                                {clas.visualPosition}
                              </Badge>
                            </Table.Td>
                            <Table.Td fw={500}>
                              {clas.player?.name} {clas.player?.surname || ''}
                            </Table.Td>
                            <Table.Td fw={500}>
                              <Badge color="blue" variant="light" size="lg">
                                {clas.player?.stats.elo}
                              </Badge>
                            </Table.Td>
                            <Table.Td ta="center" fw={700}>
                              <Badge color="green" variant="light" size="lg">
                                {clas.pointsClas} pts
                              </Badge>
                            </Table.Td>
                            <Table.Td ta="center">
                              {clas.gamesWon}-{clas.gamesLost}
                            </Table.Td>
                            <Table.Td ta="center" fw={600} visibleFrom="sm">
                              <Text size="sm" c="teal.6">
                                {clas.setsWon}
                              </Text>
                            </Table.Td>
                            <Table.Td ta="center" fw={600} visibleFrom="sm">
                              <Text size="sm" c="red.6">
                                {clas.setsLost}
                              </Text>
                            </Table.Td>
                            <Table.Td ta="center" fw={600} visibleFrom="sm">
                              <Text size="sm" c="blue.6">
                                {clas.pointsWon}
                              </Text>
                            </Table.Td>
                            <Table.Td ta="center" fw={600} visibleFrom="sm">
                              <Text size="sm" c="red.6">
                                {clas.pointsLost}
                              </Text>
                            </Table.Td>
                            <Table.Td ta="center" fw={600}>
                              <Text
                                size="sm"
                                c={clas.pointsWon - clas.pointsLost > 0 ? 'green.6' : 'red.6'}
                              >
                                {clas.pointsWon - clas.pointsLost}
                              </Text>
                            </Table.Td>
                          </Table.Tr>
                        ))}
                        {currentGroupClas.length === 0 && (
                          <Table.Tr>
                            <Table.Td colSpan={6} ta="center">
                              <Text c="dimmed">No hay datos para este grupo.</Text>
                            </Table.Td>
                          </Table.Tr>
                        )}
                      </Table.Tbody>
                    </Table>
                  </ScrollArea>
                </Card>

                <Title order={4} mt="sm">
                  Partidos del Grupo
                </Title>
                <Stack gap="sm">
                  {currentGroupMatches.length === 0 ? (
                    <Text c="dimmed">No hay partidos generados aún.</Text>
                  ) : (
                    currentGroupMatches.map((match) => (
                      <Card key={match.id} withBorder shadow="sm" radius="md" p="md">
                        <Group justify="space-between" align="center" wrap="nowrap">
                          <Stack gap={4}>
                            <Text fw={500} size="sm">
                              {match.playerOne?.name} {match.playerOne?.surname || ''}{' '}
                              <Text span c="dimmed" mx={5}>
                                vs
                              </Text>{' '}
                              {match.playerTwo?.name} {match.playerTwo?.surname || ''}
                            </Text>
                            {formatSets(match)}
                          </Stack>
                          <Group justify="space-between" align="center" wrap="nowrap">
                            <Badge
                              color={
                                match.status === 'Completado'
                                  ? 'green'
                                  : match.status === 'Programado'
                                    ? 'red'
                                    : 'yellow'
                              }
                              variant="dot"
                            >
                              {match.status}
                            </Badge>

                            <Button
                              variant="light"
                              size="xs"
                              leftSection={<IconEdit size={14} />}
                              onClick={() => openEditMatchModal(match, false)}
                              disabled={tournament.status !== 'Grupos'}
                            >
                              Actualizar
                            </Button>
                          </Group>
                        </Group>
                      </Card>
                    ))
                  )}
                </Stack>
              </Stack>
            )}
          </Tabs.Panel>
        )}

        {/* --- BRACKET --- */}
        {hasKnockoutFormat && (isKnockoutPhase || isCompletado) && (
          <Tabs.Panel value="bracketA" pt="xl">
            {!bracketA ? (
              <Center py="xl">
                <Loader color="blue" />
              </Center>
            ) : (
              <ScrollArea type="always" offsetScrollbars pb="xl">
                <Group align="center" wrap="nowrap" gap={50} p="md">
                  {bracketA.map((round) => {
                    const isThirdPlace = round.round === 'Final' && round.positions === '3-4';
                    return (
                      <Stack
                        key={round.id}
                        gap="xl"
                        justify="space-around"
                        style={{ minWidth: 250 }}
                      >
                        <Title
                          order={5}
                          ta="center"
                          c={isThirdPlace ? 'orange.6' : 'dimmed'}
                          tt="uppercase"
                          mb="md"
                        >
                          {isThirdPlace ? '3º y 4º Puesto' : round.round}
                        </Title>
                        {round.matches.map((match) => (
                          <Paper
                            key={match.id}
                            withBorder
                            shadow="sm"
                            radius="md"
                            p={0}
                            style={{
                              overflow: 'hidden',
                              cursor: 'pointer',
                            }}
                            onClick={() => {
                              const isTBD =
                                match.playerOne?.name === 'Por' || match.playerTwo?.name === 'Por';
                              const isBye =
                                match.playerOne?.name === 'EXENTO' ||
                                match.playerTwo?.name === 'EXENTO';

                              if (isBye) {
                                notifications.show({
                                  title: 'Pase Directo (Bye)',
                                  message:
                                    'Este jugador no tiene contrincante en esta ronda y ha avanzado automáticamente.',
                                  color: 'blue',
                                  icon: <IconInfoCircle />,
                                });
                                return;
                              }
                              if (isTBD) {
                                notifications.show({
                                  title: 'Partido Bloqueado',
                                  message:
                                    'Faltan jugadores por clasificarse en las rondas previas para disputar este encuentro.',
                                  color: 'orange',
                                  icon: <IconInfoCircle />,
                                });
                                return;
                              }
                              if (match.status === 'Completado') {
                                notifications.show({
                                  title: 'Partido Terminado',
                                  message: 'No puedes actualizar un partido ya completado',
                                  color: 'red',
                                  icon: <IconInfoCircle />,
                                });
                                return;
                              }
                              if (isAdmin) {
                                openEditMatchModal(match, true);
                              } else if (match.status === 'Completado') {
                                setSelectedMatch(match);
                              }
                            }}
                          >
                            <Group
                              justify="space-between"
                              p="xs"
                              style={{
                                borderBottom: '1px solid var(--mantine-color-default-border)',
                              }}
                            >
                              <Text size="sm">
                                {match.playerOne?.name || 'TBD'} {match.playerOne?.surname || ''}
                              </Text>
                              {match.playerOne?.stats?.elo && (
                                <Badge size="lg" variant="light" color="blue">
                                  {match.playerOne?.stats?.elo}
                                </Badge>
                              )}
                            </Group>
                            <Group justify="space-between" p="xs">
                              <Text size="sm">
                                {match.playerTwo?.name || 'TBD'} {match.playerTwo?.surname || ''}
                              </Text>
                              {match.playerTwo?.stats?.elo && (
                                <Badge size="lg" variant="light" color="blue">
                                  {match.playerTwo?.stats?.elo}
                                </Badge>
                              )}
                            </Group>
                            <Center p={4} bg="gray.1">
                              <Stack key={match.id} justify="space-around" align="center" gap="xs">
                                {/* <Text size="xs" c="dimmed">
                                  {match.status}
                                </Text> */}
                                {formatSets(match)}
                              </Stack>
                            </Center>
                          </Paper>
                        ))}
                      </Stack>
                    );
                  })}
                </Group>
              </ScrollArea>
            )}
          </Tabs.Panel>
        )}

        {/* MODAL SOLO LECTURA JUGADORES */}
        <Modal
          opened={!!selectedMatch}
          onClose={() => setSelectedMatch(null)}
          title={<Text fw={700}>Resultado del Partido</Text>}
          centered
        >
          {selectedMatch && (
            <Stack align="center" gap="md">
              <Group w="100%" justify="space-between">
                <Text fw={600} size="lg">
                  {selectedMatch.playerOne?.name} {selectedMatch.playerOne?.surname || ''}
                </Text>
                <Text c="dimmed">vs</Text>
                <Text fw={600} size="lg">
                  {selectedMatch.playerTwo?.name} {selectedMatch.playerTwo?.surname || ''}
                </Text>
              </Group>

              <Stack gap="xs" align="center" w="100%">
                {selectedMatch.setOnePlayerOne !== null && (
                  <Badge size="lg" variant="light" color="blue">
                    Set 1: {selectedMatch.setOnePlayerOne} - {selectedMatch.setOnePlayerTwo}
                  </Badge>
                )}
                {selectedMatch.setTwoPlayerOne !== null && (
                  <Badge size="lg" variant="light" color="blue">
                    Set 2: {selectedMatch.setTwoPlayerOne} - {selectedMatch.setTwoPlayerTwo}
                  </Badge>
                )}
                {selectedMatch.setThreePlayerOne !== null && (
                  <Badge size="lg" variant="light" color="blue">
                    Set 3: {selectedMatch.setThreePlayerOne} - {selectedMatch.setThreePlayerTwo}
                  </Badge>
                )}
                {selectedMatch.setFourPlayerOne !== null &&
                  selectedMatch.setFourPlayerOne !== 0 && (
                    <Badge size="lg" variant="light" color="blue">
                      Set 4: {selectedMatch.setFourPlayerOne} - {selectedMatch.setFourPlayerTwo}
                    </Badge>
                  )}
                {selectedMatch.setFivePlayerOne !== null &&
                  selectedMatch.setFivePlayerOne !== 0 && (
                    <Badge size="lg" variant="light" color="blue">
                      Set 5: {selectedMatch.setFivePlayerOne} - {selectedMatch.setFivePlayerTwo}
                    </Badge>
                  )}
              </Stack>
            </Stack>
          )}
        </Modal>
      </Tabs>

      {/* MODAL DE RECONFIGURACIÓN DE GRUPOS */}
      <Modal
        opened={editFormatOpened}
        onClose={() => setEditFormatOpened(false)}
        title={<Title order={4}>Ajustar Formato del Torneo</Title>}
        centered
      >
        <Stack gap="md">
          {tournament.rounds === 'GruposKnockout' && (
            <>
              <Text size="sm" c="dimmed">
                Tienes <strong>{confirmedPlayersCount}</strong> jugadores confirmados. Ajusta las
                matemáticas de los grupos para evitar huecos vacíos antes de iniciar el torneo.
              </Text>
              <NumberInput
                label="Cantidad de Grupos"
                required
                min={1}
                value={f_numGroup}
                onChange={setFNumGroup}
              />
              <NumberInput
                label="Jugadores por Grupo"
                required
                min={2}
                value={f_numGroupPlayers}
                onChange={setFNumGroupPlayers}
              />

              <NumberInput
                label="Clasificados por Grupo"
                description="Asegúrate de que la multiplicación total cuadre con el cuadro (4, 8, 16...)"
                required
                min={1}
                value={f_playersKnockout}
                onChange={setFPlayersKnockout}
              />
              <Select
                label="Sets para ganar en Grupos"
                data={[
                  { value: '2', label: '2 Sets (Al mejor de 3 sets)' },
                  { value: '3', label: '3 Sets (Al mejor de 5 sets)' },
                  { value: '4', label: '4 Sets (Al mejor de 7 sets)' },
                ]}
                value={String(f_setsToWinGroup)}
                onChange={(val) => setFSetsToWinGroup(Number(val))}
                allowDeselect={false}
              />
            </>
          )}
          {(tournament.rounds === 'GruposKnockout' || tournament.rounds === 'Knockout') && (
            <Select
              label="Sets para ganar en Knockouts"
              data={[
                { value: '2', label: '2 Sets (Al mejor de 3 sets)' },
                { value: '3', label: '3 Sets (Al mejor de 5 sets)' },
                { value: '4', label: '4 Sets (Al mejor de 7 sets)' },
              ]}
              value={String(f_setsToWinKnockout)}
              onChange={(val) => setFSetsToWinKnockout(Number(val))}
              allowDeselect={false}
            />
          )}
          <Button color="blue" onClick={handleSaveFormat} mt="md">
            Guardar y Recalcular
          </Button>
        </Stack>
      </Modal>

      {/* MODAL DE EDICIÓN DE RESULTADO DE PARTIDO */}
      <Modal
        opened={!!editMatch}
        onClose={() => setEditMatch(null)}
        title={
          <Group gap="xs">
            <ThemeIcon color="blue" variant="light">
              <IconEdit size={18} />
            </ThemeIcon>
            <Title order={4}>Actualizar Marcador del Partido</Title>
          </Group>
        }
        size="lg"
        centered
      >
        {editMatch && (
          <Stack gap="md">
            <Paper
              withBorder
              p="md"
              radius="md"
              bg="var(--mantine-color-gray-0)"
              style={{ darkHidden: true }}
            >
              <Group justify="space-between" align="center">
                <Stack gap={2} align="center" style={{ flex: 1 }}>
                  <Text fw={700} ta="center" size="sm">
                    {editMatch.playerOneName}
                  </Text>
                  <Badge
                    size="xl"
                    color={matchScoreStats.p1Sets >= editMatch.setsToWin ? 'green' : 'blue'}
                  >
                    {matchScoreStats.p1Sets} Sets
                  </Badge>
                </Stack>

                <Stack gap={0} align="center">
                  <Text fw={900} size="xl" c="dimmed">
                    VS
                  </Text>
                  <Text size="xs" c="dimmed">
                    Gana a los {editMatch.setsToWin} sets
                  </Text>
                </Stack>

                <Stack gap={2} align="center" style={{ flex: 1 }}>
                  <Text fw={700} ta="center" size="sm">
                    {editMatch.playerTwoName}
                  </Text>
                  <Badge
                    size="xl"
                    color={matchScoreStats.p2Sets >= editMatch.setsToWin ? 'green' : 'blue'}
                  >
                    {matchScoreStats.p2Sets} Sets
                  </Badge>
                </Stack>
              </Group>
            </Paper>

            <Select
              label="Estado del Partido"
              data={[
                { value: 'Programado', label: 'Programado (Pendiente)' },
                { value: 'Iniciado', label: 'En Juego (Iniciado)' },
                {
                  value: 'Completado',
                  label: matchScoreStats.isValidToComplete
                    ? 'Completado (Resultado Final)'
                    : `Completado (Requiere ${editMatch.setsToWin} sets ganados)`,
                },
                { value: 'Cancelado', label: 'Cancelado' },
              ]}
              value={editMatch.status}
              onChange={(val) => setEditMatch({ ...editMatch, status: val || 'Programado' })}
              allowDeselect={false}
            />

            <Text fw={600} size="sm" mt="xs">
              Puntuación Set a Set
            </Text>

            <Stack gap="xs">
              {Array.from({ length: editMatch.setsToWin * 2 - 1 }).map((_, idx) => {
                const setNum = idx + 1;
                const fieldP1 = `set${setNum}P1` as keyof MatchToEdit;
                const fieldP2 = `set${setNum}P2` as keyof MatchToEdit;

                let winnerAlreadyReached = false;
                let p1RunningSets = 0;
                let p2RunningSets = 0;

                for (let prev = 1; prev < setNum; prev++) {
                  const s1 = Number(editMatch[`set${prev}P1` as keyof MatchToEdit] || 0);
                  const s2 = Number(editMatch[`set${prev}P2` as keyof MatchToEdit] || 0);
                  const maxS = Math.max(s1, s2);
                  const diffS = Math.abs(s1 - s2);

                  if (maxS >= 11 && diffS >= 2) {
                    if (s1 > s2) p1RunningSets++;
                    else if (s2 > s1) p2RunningSets++;
                  }
                }

                if (p1RunningSets >= editMatch.setsToWin || p2RunningSets >= editMatch.setsToWin) {
                  winnerAlreadyReached = true;
                }

                let previousSetValid = true;
                if (setNum > 1) {
                  const prevSetP1 = Number(
                    editMatch[`set${setNum - 1}P1` as keyof MatchToEdit] || 0,
                  );
                  const prevSetP2 = Number(
                    editMatch[`set${setNum - 1}P2` as keyof MatchToEdit] || 0,
                  );

                  previousSetValid = isValidTableTennisSet(prevSetP1, prevSetP2);
                }

                const isDisabled = !previousSetValid || winnerAlreadyReached;

                return (
                  <Group key={setNum} grow align="center">
                    <Text
                      size="xs"
                      fw={700}
                      c={isDisabled ? 'dimmed' : 'blue'}
                      w={50}
                      style={{ opacity: isDisabled ? 0.5 : 1 }}
                    >
                      Set {setNum}
                      {winnerAlreadyReached && ' 🛑'}
                    </Text>
                    <NumberInput
                      placeholder="0"
                      min={0}
                      max={99}
                      disabled={isDisabled}
                      value={editMatch[fieldP1] as number}
                      onChange={(val) => {
                        const newP1Val = Number(val || 0);

                        const updatedMatchState = { ...editMatch, [fieldP1]: newP1Val };

                        const nextStats = checkMatchStatusOnInput(updatedMatchState);
                        setEditMatch({
                          ...updatedMatchState,
                          status: nextStats.autoCompleted ? 'Completado' : editMatch.status,
                        });
                      }}
                    />
                    <Text ta="center" w={20} fw={700} c="dimmed">
                      -
                    </Text>
                    <NumberInput
                      placeholder="0"
                      min={0}
                      max={99}
                      disabled={isDisabled}
                      value={editMatch[fieldP2] as number}
                      onChange={(val) => {
                        const newP2Val = Number(val || 0);
                        const updatedMatchState = { ...editMatch, [fieldP2]: newP2Val };

                        const nextStats = checkMatchStatusOnInput(updatedMatchState);
                        setEditMatch({
                          ...updatedMatchState,
                          status: nextStats.autoCompleted ? 'Completado' : editMatch.status,
                        });
                      }}
                    />
                  </Group>
                );
              })}
            </Stack>

            <Button
              color="blue"
              fullWidth
              mt="md"
              loading={submittingMatch}
              disabled={editMatch.status === 'Completado' && !matchScoreStats.isValidToComplete}
              onClick={handleSaveMatch}
            >
              Guardar Marcador
            </Button>
          </Stack>
        )}
      </Modal>
    </Stack>
  );
};

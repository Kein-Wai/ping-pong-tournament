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
  ActionIcon,
  Tooltip,
} from '@mantine/core';
import {
  IconArrowLeft,
  IconTrophy,
  IconUserCheck,
  IconUserX,
  IconRocket,
  IconSettings,
  IconTrash,
  IconArrowsExchange,
  IconTournament,
  IconUsers,
} from '@tabler/icons-react';
import confetti from 'canvas-confetti';
import { api } from '../../api/axios';
import { openAppConfirmModal } from '../../utils/modals';
import { ENDPOINTS } from '../../api/endpoints';
import { APP_ROUTES } from '../../constants/routes';
import type {
  Tournament,
  MatchToEdit,
  TournamentParticipant,
  ClubPlayer,
} from '../../types/tournament';
import { EditFormatModal } from '../../components/tournament/EditFormatModal';
import { MatchResultModal } from '../../components/tournament/MatchResultModal';
import { EnrollModal } from '../../components/tournament/EnrollModal';
import { SwapPlayersModal } from '../../components/tournament/SwapPlayersModal';
import { MatchResultViewModal } from '../../components/tournament/MatchResultViewModal';
import { TournamentTabs } from '../../components/tournament/TournamentTabs';
import type {
  TournamentClas,
  TournamentGroupClas,
  BracketMatch,
  KnockoutRound,
  GroupMatch,
} from '../../types/tournament';

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

  const [participants, setParticipants] = useState<TournamentParticipant[] | null>(null);
  const [results, setResults] = useState<TournamentClas[] | null>(null);
  const [bracketA, setBracketA] = useState<KnockoutRound[] | null>(null);
  const [bracketB, setBracketB] = useState<KnockoutRound[] | null>(null);
  const [subBracketA, setSubBracketA] = useState<string | null>(null);
  const [subBracketB, setSubBracketB] = useState<string | null>(null);

  const [groupsClas, setGroupsClas] = useState<TournamentGroupClas[] | null>(null);
  const [groupMatches, setGroupMatches] = useState<GroupMatch[] | null>(null);
  const [selectedGroup, setSelectedGroup] = useState<string | null>(null);

  const [selectedMatch, setSelectedMatch] = useState<BracketMatch | null>(null);

  const [editMatch, setEditMatch] = useState<MatchToEdit | null>(null);
  const [submittingMatch, setSubmittingMatch] = useState(false);
  const [enrollModalOpen, setEnrollModalOpen] = useState(false);
  const [clubPlayers, setClubPlayers] = useState<ClubPlayer[]>([]);
  const [checkedToEnroll, setCheckedToEnroll] = useState<string[]>([]);
  const [enrolling, setEnrolling] = useState(false);

  const [swapModalOpen, setSwapModalOpen] = useState(false);
  const [swapPlayerA, setSwapPlayerA] = useState<string | null>(null);
  const [swapPlayerB, setSwapPlayerB] = useState<string | null>(null);
  const [isSwapping, setIsSwapping] = useState(false);

  const myParticipation = participants?.find((p) => p.player.id === user?.id);
  const isEnrolled = !!myParticipation;

  const swapOptions = useMemo(() => {
    const confirmed = participants?.filter((p) => p.status === 'Confirmado') || [];
    // Solo permitimos intercambiar jugadores reales confirmados. Cero fantasmas.
    return confirmed.map((p) => ({
      value: p.player.id,
      label: `${p.player.name} ${p.player.surname || ''}`,
    }));
  }, [participants]);

  const fetchParticipants = async () => {
    if (!id) return;
    try {
      const res = await api.get(ENDPOINTS.TOURNAMENTS.PARTICIPANTES(id));
      setParticipants(res.data.data);
    } catch (error) {
      console.error(error);
    }
  };

  const fetchTournamentInfo = async () => {
    try {
      if (!id) return;
      const res = await api.get(ENDPOINTS.TOURNAMENTS.BY_ID(id));
      const tData = res.data.data;
      console.log(tData);
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

      setActiveTab((prevTab) => {
        if (tData.status === 'Completado') return 'resultados';
        if (KNOCKOUT_STAGES.includes(tData.status) && prevTab !== 'bracketB') return 'bracketA';
        return prevTab;
      });
    } catch (error) {
      console.error('Error cargando el torneo:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTournamentInfo();
    fetchParticipants();
  }, [id]);

  useEffect(() => {
    if (!id || !activeTab) return;

    const fetchLazyData = async () => {
      try {
        if (activeTab === 'resultados' && results === null) {
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
        } else if (activeTab === 'bracketB' && bracketB === null) {
          const res = await api.get(`${ENDPOINTS.TOURNAMENTS.BRACKETS(id)}?type=B`);
          setBracketB(res.data.data);
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
          await api.post(ENDPOINTS.TOURNAMENTS.REGISTER(id), {
            playerId: user?.id,
            registeredAt: new Date().toISOString(),
            status: 'Pendiente',
          });
          await fetchTournamentInfo();
          if (participants !== null) {
            const res = await api.get(ENDPOINTS.TOURNAMENTS.PARTICIPANTES(id));
            setParticipants(res.data.data);
            window.dispatchEvent(new CustomEvent('refresh-notifications'));
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
    if (status === 'Grupos') return 'black';
    return 'orange';
  };

  const handleParticipantStatus = (
    playerId: string,
    playerName: string,
    playerSurname: string | null,
    status: 'Confirmado' | 'NoPresentado',
  ) => {
    if (!id) return;
    const isNoShow = status === 'NoPresentado';

    openAppConfirmModal({
      title: isNoShow ? 'Sancionar Jugador' : 'Confirmar Asistencia',
      icon: isNoShow ? <IconUserX size={18} /> : <IconUserCheck size={18} />,
      color: isNoShow ? 'red' : 'green',
      description: isNoShow
        ? '¿Estás seguro de marcar a este jugador como No Presentado? Se le restarán 100 puntos de ELO como penalización.'
        : 'Confirmar a este jugador para que el algoritmo de la Serpiente lo incluya en la Fase de Grupos.',
      highlightText: `${playerName} ${playerSurname}`,
      confirmLabel: isNoShow ? 'Sí, Sancionar' : 'Confirmar Jugador',
      onConfirm: async () => {
        try {
          await api.put(ENDPOINTS.TOURNAMENTS.UPDATE_PARTICIPANT_STATUS(id, playerId), {
            status,
          });
          const res = await api.get(ENDPOINTS.TOURNAMENTS.PARTICIPANTES(id));
          setParticipants(res.data.data);
        } catch (error) {
          console.error(error);
        }
      },
    });
  };

  const handleSwapPlayers = async () => {
    if (!id || !swapPlayerA || !swapPlayerB) return;
    setIsSwapping(true);
    try {
      await api.put(ENDPOINTS.TOURNAMENTS.SWAP_PLAYERS(id), {
        playerAId: swapPlayerA,
        playerBId: swapPlayerB,
      });
      setSwapModalOpen(false);
      setSwapPlayerA(null);
      setSwapPlayerB(null);

      // Recargamos todo para que la pantalla refresque los cuadros y los grupos
      await fetchTournamentInfo();
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
      } else if (activeTab === 'bracketB') {
        const res = await api.get(`${ENDPOINTS.TOURNAMENTS.BRACKETS(id)}?type=B`);
        setBracketB(res.data.data);
      }
    } catch (error) {
      console.error(error);
    } finally {
      setIsSwapping(false);
    }
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

  const handleOpenEnrollModal = async () => {
    try {
      const res = await api.get(ENDPOINTS.USERS.BASE);
      setClubPlayers(res.data.data);
      setCheckedToEnroll([]);
      setEnrollModalOpen(true);
    } catch (e) {
      console.error(e);
    }
  };

  const handleBulkEnroll = async () => {
    if (!id) return;
    setEnrolling(true);
    try {
      await api.post(ENDPOINTS.TOURNAMENTS.REGISTER_BULK(id), { playerIds: checkedToEnroll });
      setEnrollModalOpen(false);
      await fetchParticipants(); // Refrescar inscritos
      await fetchTournamentInfo(); // Refrescar torneo (para actualizar contadores de plazas)
    } catch (error) {
      console.error(error);
    } finally {
      setEnrolling(false);
    }
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

  const onBracketMatchClick = (match: BracketMatch) => {
    setSelectedMatch(match);
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
      } else if (activeTab === 'bracketB') {
        const res = await api.get(`${ENDPOINTS.TOURNAMENTS.BRACKETS(id)}?type=B`);
        setBracketB(res.data.data);
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

          {(isProgramado || (isAdmin && (isGrupos || isKnockoutPhase))) && (
            <Stack align="flex-end" gap="xs">
              <Group>
                {isAdmin && (
                  <>
                    {/* BOTONES SOLO PARA FASE DE GRUPOS O ELIMINATORIAS */}
                    {(isGrupos || isKnockoutPhase) && (
                      <Button
                        color="violet"
                        variant="light"
                        size="md"
                        onClick={() => setSwapModalOpen(true)}
                        leftSection={<IconArrowsExchange size={18} />}
                      >
                        Intercambiar Jugadores
                      </Button>
                    )}

                    {/* BOTONES SOLO PARA ANTES DE EMPEZAR EL TORNEO */}
                    {isProgramado && (
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
                          color="blue"
                          variant="light"
                          size="md"
                          onClick={handleOpenEnrollModal}
                          leftSection={<IconUsers size={18} />}
                          disabled={(participants?.length || 0) >= (tournament?.numPlayers || 0)}
                        >
                          Añadir Inscritos
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
                  </>
                )}

                {/* BOTONES DEL JUGADOR (Solo se ven antes de empezar) */}
                {isProgramado &&
                  user?.role === 'Player' &&
                  (isEnrolled ? (
                    <Button
                      color={myParticipation.status === 'Confirmado' ? 'green' : 'orange'}
                      size="md"
                      disabled
                    >
                      {myParticipation.status === 'Confirmado'
                        ? 'Inscripción Confirmada'
                        : 'Inscripción Pendiente'}
                    </Button>
                  ) : (
                    <Button
                      color={isFull ? 'gray' : 'blue'}
                      size="md"
                      disabled={isFull}
                      loading={isRegistering}
                      onClick={handleInscribirse}
                    >
                      {isFull ? 'Torneo Completo' : 'Inscribirme'}
                    </Button>
                  ))}
              </Group>

              {/* INFO DE PLAZAS (Solo antes de empezar) */}
              {isProgramado && (
                <Text size="xs" c="dimmed">
                  {plazasDisponibles > 0 ? `Quedan ${plazasDisponibles} plazas` : 'Lista de espera'}
                  {isAdmin && ` · Confirmados: ${confirmedPlayersCount}`}
                </Text>
              )}
            </Stack>
          )}
        </Group>
      </Card>

      <TournamentTabs
        tournament={tournament}
        participants={participants}
        groupsClas={groupsClas}
        groupMatches={groupMatches}
        bracketA={bracketA}
        bracketB={bracketB}
        isAdmin={isAdmin}
        isProgramado={isProgramado}
        isGrupos={isGrupos}
        isKnockoutPhase={isKnockoutPhase}
        isCompletado={isCompletado}
        hasGroupsFormat={hasGroupsFormat}
        hasKnockoutFormat={hasKnockoutFormat}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        selectedGroup={selectedGroup}
        setSelectedGroup={setSelectedGroup}
        groupOptions={groupOptions}
        podium={{ firstPlace, secondPlace, thirdPlace, otherResults }}
        subBracketA={subBracketA}
        setSubBracketA={setSubBracketA}
        subBracketB={subBracketB}
        setSubBracketB={setSubBracketB}
        onMatchClick={openEditMatchModal}
        onBracketMatchClick={onBracketMatchClick}
        onParticipantStatusChange={handleParticipantStatus}
      />

      {/* MODAL SOLO LECTURA JUGADORES */}
      <MatchResultViewModal
        opened={!!selectedMatch}
        onClose={() => setSelectedMatch(null)}
        selectedMatch={selectedMatch}
      />
      <EnrollModal
        opened={enrollModalOpen}
        onClose={() => setEnrollModalOpen(false)}
        tournament={tournament}
        participants={participants}
        clubPlayers={clubPlayers}
        checkedToEnroll={checkedToEnroll}
        setCheckedToEnroll={setCheckedToEnroll}
        onEnroll={handleBulkEnroll}
        enrolling={enrolling}
      />

      {/* MODAL DE RECONFIGURACIÓN DE GRUPOS */}
      <EditFormatModal
        opened={editFormatOpened}
        onClose={() => setEditFormatOpened(false)}
        tournament={tournament}
        confirmedPlayersCount={confirmedPlayersCount}
        numGroups={f_numGroup}
        numGroupPlayers={f_numGroupPlayers}
        playersKnockout={f_playersKnockout}
        setsToWinGroup={f_setsToWinGroup}
        setsToWinKnockout={f_setsToWinKnockout}
        onNumGroupsChange={setFNumGroup}
        onNumGroupPlayersChange={setFNumGroupPlayers}
        onPlayersKnockoutChange={setFPlayersKnockout}
        onSetsToWinGroupChange={(val) => setFSetsToWinGroup(Number(val))}
        onSetsToWinKnockoutChange={(val) => setFSetsToWinKnockout(Number(val))}
        onSaveFormat={handleSaveFormat}
      />

      <MatchResultModal
        opened={!!editMatch}
        onClose={() => setEditMatch(null)}
        match={editMatch}
        submitting={submittingMatch}
        onSave={handleSaveMatch}
        onChange={(match: MatchToEdit) => setEditMatch(match)}
      />
      <SwapPlayersModal
        opened={swapModalOpen}
        onClose={() => setSwapModalOpen(false)}
        swapOptions={swapOptions}
        swapPlayerA={swapPlayerA}
        setSwapPlayerA={setSwapPlayerA}
        swapPlayerB={swapPlayerB}
        setSwapPlayerB={setSwapPlayerB}
        isSwapping={isSwapping}
        onSwap={handleSwapPlayers}
      />
    </Stack>
  );
};

import { useState, useMemo } from 'react';

import { useParams, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';
import { Text, Center, Loader, Stack } from '@mantine/core';
import {
  IconUserCheck,
  IconUserX,
  IconRocket,
  IconTrash,
} from '@tabler/icons-react';
import { api } from '../../api/axios';
import { openAppConfirmModal } from '../../utils/modals';
import { ENDPOINTS } from '../../api/endpoints';
import { APP_ROUTES } from '../../constants/routes';
import type { MatchToEdit } from '../../types/tournament';
import { EditFormatModal } from '../../components/tournament/EditFormatModal';
import { MatchResultModal } from '../../components/tournament/MatchResultModal';
import { EnrollModal } from '../../components/tournament/EnrollModal';
import { SwapPlayersModal } from '../../components/tournament/SwapPlayersModal';
import { MatchResultViewModal } from '../../components/tournament/MatchResultViewModal';
import { TournamentTabsContainer } from '../../components/tournament/TournamentTabsContainer';
import { TournamentHeader } from '../../components/tournament/TournamentHeader';
import { useTorneoFormato } from '../../hooks/useTorneoFormato';
import { useTorneoPartido } from '../../hooks/useTorneoPartido';
import { useTorneoInscripcion } from '../../hooks/useTorneoInscripcion';
import { useTournamentDetails } from '../../hooks/useTournamentDetails';
import type { BracketMatch } from '../../types/tournament';

export const TorneoDetalles = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const isAdmin = user?.role === 'AdminClub' || user?.role === 'SuperAdmin';

  const {
    tournament,
    loading,
    activeTab,
    setActiveTab,
    participants,
    setParticipants,
    results,
    groupsClas,
    groupMatches,
    bracketA,
    bracketB,
    confirmedPlayersCount,
    reloadTournament: fetchTournamentInfo,
    reloadParticipants: fetchParticipants,
    reloadActiveTab,
  } = useTournamentDetails(id, { autoSelectGroup: false });

  const [isGenerating, setIsGenerating] = useState(false);
  const [selectedMatch, setSelectedMatch] = useState<BracketMatch | null>(null);
  const [swapModalOpen, setSwapModalOpen] = useState(false);
  const [swapPlayerA, setSwapPlayerA] = useState<string | null>(null);
  const [swapPlayerB, setSwapPlayerB] = useState<string | null>(null);
  const [isSwapping, setIsSwapping] = useState(false);

  // --- Derived values ---
  const myParticipation = participants?.find((p) => p.player.id === user?.id) ?? null;
  const isEnrolled = !!myParticipation;
  const hasGroupsFormat =
    tournament?.rounds === 'GruposKnockout' || tournament?.rounds === 'TodosvsTodos';

  const swapOptions = useMemo(() => {
    const confirmed = participants?.filter((p) => p.status === 'Confirmado') || [];
    // Solo permitimos intercambiar jugadores reales confirmados. Cero fantasmas.
    return confirmed.map((p) => ({
      value: p.player.id,
      label: `${p.player.name} ${p.player.surname || ''}`,
    }));
  }, [participants]);

  const onMatchSaved = async () => {
    if (!id) return;
    await reloadActiveTab();
    await fetchTournamentInfo();
  };

  const torneoFormato = useTorneoFormato({ id, tournament, onFormatSaved: fetchTournamentInfo });
  const {
    editFormatOpened, setEditFormatOpened,
    numGroup, setNumGroup,
    numGroupPlayers, setNumGroupPlayers,
    playersKnockout, setPlayersKnockout,
    setsToWinGroup, setSetsToWinGroup,
    setsToWinKnockout, setSetsToWinKnockout,
    openEditFormat,
    saveFormat,
  } = torneoFormato;

  const torneoPartido = useTorneoPartido({
    id,
    tournament,
    isAdmin,
    groupMatches,
    onMatchSaved,
  });
  const {
    editMatch,
    setEditMatch,
    submittingMatch,
    openEditMatchModal,
    handleSaveMatch,
  } = torneoPartido;

  const inscripcion = useTorneoInscripcion({
    id,
    tournament,
    user,
    onInscribirseSuccess: async () => {
      await fetchTournamentInfo();
      if (participants !== null) {
        const res = await api.get(ENDPOINTS.TOURNAMENTS.PARTICIPANTES(id!));
        setParticipants(res.data.data);
        window.dispatchEvent(new CustomEvent('refresh-notifications'));
      }
    },
    onBulkEnrollSuccess: async () => {
      await fetchParticipants();
      await fetchTournamentInfo();
    },
  });
  const {
    enrollModalOpen,
    setEnrollModalOpen,
    clubPlayers,
    checkedToEnroll,
    setCheckedToEnroll,
    enrolling,
    isRegistering,
    handleOpenEnrollModal,
    handleInscribirse,
    handleBulkEnroll,
  } = inscripcion;

  // handleInscribirse movido a useTorneoInscripcion

  // getStatusColor movido a TournamentHeader

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
      await reloadActiveTab();
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

  const onBracketMatchClick = (match: BracketMatch) => {
    setSelectedMatch(match);
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


  return (
    <Stack gap="xl">
      <TournamentHeader
        tournament={tournament}
        isAdmin={isAdmin}
        isPlayer={user?.role === 'Player'}
        isEnrolled={isEnrolled}
        isRegistering={isRegistering}
        isGenerating={isGenerating}
        confirmedPlayersCount={confirmedPlayersCount}
        participants={participants}
        myParticipation={myParticipation}
        onInscribirse={handleInscribirse}
        onGenerateTournament={handleGenerateTournament}
        onOpenEditFormat={openEditFormat}
        onDeleteTournament={handleDeleteTournament}
        onOpenEnrollModal={handleOpenEnrollModal}
        onOpenSwapModal={() => setSwapModalOpen(true)}
      />

      {/*
        MIGRADO: TournamentTabsContainer con 5 props estructuradas (no 28).
        El container asume flags/podium/groupOptions/selectedGroup/subBrackets.
        activeTab se mantiene controlado en TorneoDetalles.

      */}
      <TournamentTabsContainer
        tournament={tournament}
        tournamentData={{
          participants,
          groupClas: groupsClas,
          groupMatches,
          bracketA,
          bracketB,
          results,
        }}
        actions={{
          onMatchClick: openEditMatchModal,
          onBracketMatchClick,
          onParticipantStatusChange: handleParticipantStatus,
        }}
        isAdmin={isAdmin}
        activeTab={activeTab}
        onTabChange={setActiveTab}
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
        numGroups={numGroup}
        numGroupPlayers={numGroupPlayers}
        playersKnockout={playersKnockout}
        setsToWinGroup={setsToWinGroup}
        setsToWinKnockout={setsToWinKnockout}
        onNumGroupsChange={setNumGroup}
        onNumGroupPlayersChange={setNumGroupPlayers}
        onPlayersKnockoutChange={setPlayersKnockout}
        onSetsToWinGroupChange={(val) => setSetsToWinGroup(Number(val))}
        onSetsToWinKnockoutChange={(val) => setSetsToWinKnockout(Number(val))}
        onSaveFormat={saveFormat}
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

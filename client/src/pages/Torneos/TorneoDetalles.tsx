import { useState } from 'react';

import { useParams, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';
import { Text, Center, Loader, Stack } from '@mantine/core';
import { tournamentsService } from '../../api/services/tournaments';
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
import { useTorneoIntercambio } from '../../hooks/useTorneoIntercambio';
import { useTorneoAcciones } from '../../hooks/useTorneoAcciones';
import { useTournamentDetails } from '../../hooks/useTournamentDetails';
import { usePermissions } from '../../hooks/usePermissions';
import type { BracketMatch } from '../../types/tournament';

export const TorneoDetalles = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const { isAdmin, isPlayer } = usePermissions();

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

  const [selectedMatch, setSelectedMatch] = useState<BracketMatch | null>(null);

  // --- Derived values ---
  const myParticipation = participants?.find((p) => p.player.id === user?.id) ?? null;
  const isEnrolled = !!myParticipation;

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
        setParticipants(await tournamentsService.participants(id!));
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

  const {
    swapModalOpen,
    setSwapModalOpen,
    swapPlayerA,
    setSwapPlayerA,
    swapPlayerB,
    setSwapPlayerB,
    isSwapping,
    swapOptions,
    handleSwapPlayers,
  } = useTorneoIntercambio({
    id,
    participants,
    onSwapped: async () => {
      await fetchTournamentInfo();
      await reloadActiveTab();
    },
  });

  const { isGenerating, handleParticipantStatus, handleGenerateTournament, handleDeleteTournament } =
    useTorneoAcciones({
      id,
      tournament,
      confirmedPlayersCount,
      setParticipants,
      setActiveTab,
      reloadTournament: fetchTournamentInfo,
      onDeleted: () => navigate(APP_ROUTES.TORNEOS.LIST),
    });

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
        isPlayer={isPlayer}
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
